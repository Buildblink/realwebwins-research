import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import slugify from "slugify";

// Environment validation
const openaiApiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!openaiApiKey) {
  console.error("Missing OPENAI_API_KEY environment variable.");
  process.exit(1);
}

if (!supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiApiKey });
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const VERBOSE = process.env.HYBRID_VERBOSE === "true";
const MAX_PLAYBOOKS_PER_RUN = 5;

// Logging helper
async function logToAgentStatus(stage, success, errorLog = null) {
  try {
    const { error } = await supabase.from("AgentStatus").insert([
      {
        idea: "playbook_generation",
        stage,
        success,
        error_log: errorLog,
        last_run: new Date().toISOString(),
      },
    ]);

    if (error && VERBOSE) {
      console.warn("[logToAgentStatus] Failed to log:", error);
    }
  } catch (error) {
    if (VERBOSE) {
      console.warn("[logToAgentStatus] Unexpected error:", error);
    }
  }
}

// 1) Fetch pain points without playbooks
async function fetchUnlinkedPainPoints(limit = MAX_PLAYBOOKS_PER_RUN) {
  try {
    const { data, error } = await supabase
      .from("pain_points")
      .select("*")
      .is("related_playbook", null)
      .order("last_seen", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to fetch pain points:", error.message);
      await logToAgentStatus("fetch_unlinked", false, error.message);
      return [];
    }

    console.log(`Found ${data?.length || 0} pain points without playbooks`);
    return data || [];
  } catch (error) {
    console.error("Unexpected error fetching pain points:", error.message);
    await logToAgentStatus("fetch_unlinked", false, error.message);
    return [];
  }
}

// 2) Generate playbook using OpenAI
async function generatePlaybook(painPoint, retries = 3) {
  const prompt = `Create a concise, actionable playbook to solve this problem for a solo builder or entrepreneur.

Return ONLY valid JSON with these exact keys:
{
  "title": "6-10 word clear title",
  "slug": "kebab-case-slug",
  "description": "1-2 sentence overview",
  "content": "markdown with ## headings: The Challenge, Step-by-Step Solution (5 steps), Validation, Common Pitfalls",
  "tools": [{"name": "Tool Name", "link": "https://...", "description": "Why it helps"}],
  "affiliate_links": [{"name": "Resource Name", "url": "https://...", "description": "What it offers", "price": "$X/mo"}],
  "category": "${painPoint.category}",
  "niche": "${painPoint.niche}",
  "related_pain_id": "${painPoint.id}"
}

Requirements:
- tools: 2-4 recommended tools with real URLs
- affiliate_links: 0-2 relevant paid resources (optional)
- content: Must be markdown with clear headings and 5 concrete steps
- Keep it practical and actionable
- Return ONLY the JSON object, no markdown code blocks

Problem to solve:
"${painPoint.text}"

Audience: ${painPoint.audience || "creator"}
Category: ${painPoint.category || "General"}
Niche: ${painPoint.niche || "General"}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const raw = response.choices?.[0]?.message?.content || "{}";

      // Clean potential markdown wrappers
      let cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      // Try parsing
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        // Fallback: extract JSON from response
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error("No valid JSON found in response");
        }
      }

      // Validate required fields
      if (!parsed.title || !parsed.content) {
        throw new Error("Missing required fields (title or content)");
      }

      // Generate slug if not provided
      if (!parsed.slug) {
        parsed.slug = slugify(parsed.title, {
          lower: true,
          strict: true,
          remove: /[*+~.()'"!:@]/g,
        });
      }

      // Ensure arrays
      parsed.tools = Array.isArray(parsed.tools) ? parsed.tools : [];
      parsed.affiliate_links = Array.isArray(parsed.affiliate_links)
        ? parsed.affiliate_links
        : [];

      if (VERBOSE) {
        console.log(`  ✓ Generated playbook: "${parsed.title}"`);
      }

      return parsed;
    } catch (error) {
      if (attempt === retries) {
        console.error(`Failed to generate playbook after ${retries} attempts:`, error.message);
        return null;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  return null;
}

// 3) Insert playbook into database
async function insertPlaybook(playbook) {
  if (!playbook) {
    return { success: false, slug: null };
  }

  try {
    // Check if slug already exists
    const { data: existing } = await supabase
      .from("playbooks")
      .select("slug")
      .eq("slug", playbook.slug)
      .maybeSingle();

    if (existing) {
      // Slug exists, append timestamp
      playbook.slug = `${playbook.slug}-${Date.now()}`;
      console.log(`  ~ Slug conflict, using: ${playbook.slug}`);
    }

    const { data, error } = await supabase
      .from("playbooks")
      .insert({
        title: playbook.title,
        slug: playbook.slug,
        description: playbook.description || null,
        content: playbook.content || null,
        category: playbook.category || null,
        niche: playbook.niche || null,
        related_pain_id: playbook.related_pain_id || null,
        tools: playbook.tools || [],
        affiliate_links: playbook.affiliate_links || [],
      })
      .select();

    if (error) {
      console.error("Failed to insert playbook:", error.message);
      await logToAgentStatus("playbook_insert", false, error.message);
      return { success: false, slug: null };
    }

    console.log(`  ✓ Inserted playbook: ${playbook.slug}`);
    return { success: true, slug: playbook.slug };
  } catch (error) {
    console.error("Unexpected error inserting playbook:", error.message);
    await logToAgentStatus("playbook_insert", false, error.message);
    return { success: false, slug: null };
  }
}

// 4) Update pain point with playbook link
async function linkPainPointToPlaybook(painPointId, playbookSlug) {
  try {
    const { error } = await supabase
      .from("pain_points")
      .update({ related_playbook: playbookSlug })
      .eq("id", painPointId);

    if (error) {
      console.error("Failed to link pain point to playbook:", error.message);
      return false;
    }

    if (VERBOSE) {
      console.log(`  ✓ Linked pain point ${painPointId} → ${playbookSlug}`);
    }

    return true;
  } catch (error) {
    console.error("Unexpected error linking pain point:", error.message);
    return false;
  }
}

// Main orchestration
async function main() {
  console.log("=== OpenAI Playbook Generation Started ===\n");

  const startTime = Date.now();
  let playbooksCreated = 0;
  let painPointsLinked = 0;

  try {
    // Fetch unlinked pain points
    const painPoints = await fetchUnlinkedPainPoints(MAX_PLAYBOOKS_PER_RUN);

    if (painPoints.length === 0) {
      console.log("No unlinked pain points found. Exiting.");
      return;
    }

    await logToAgentStatus("fetch_unlinked", true);

    console.log(`\nGenerating playbooks for ${painPoints.length} pain points...\n`);

    // Process each pain point
    for (const painPoint of painPoints) {
      console.log(`\nProcessing: "${painPoint.text.slice(0, 60)}..."`);

      // Generate playbook
      const playbook = await generatePlaybook(painPoint);

      if (!playbook) {
        console.log("  ✗ Failed to generate playbook");
        continue;
      }

      // Insert playbook
      const { success, slug } = await insertPlaybook(playbook);

      if (success && slug) {
        playbooksCreated++;

        // Link pain point to playbook
        const linked = await linkPainPointToPlaybook(painPoint.id, slug);
        if (linked) {
          painPointsLinked++;
        }
      }

      // Rate limiting: wait 2 seconds between generations
      if (painPoints.indexOf(painPoint) < painPoints.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n=== Generation Complete ===");
    console.log(`Playbooks created: ${playbooksCreated}`);
    console.log(`Pain points linked: ${painPointsLinked}`);
    console.log(`Duration: ${duration}s`);

    await logToAgentStatus("playbook_generation", true, null);
  } catch (error) {
    console.error("\n❌ Generation failed:", error.message);
    await logToAgentStatus("playbook_generation", false, error.message);
    process.exit(1);
  }
}

main();
