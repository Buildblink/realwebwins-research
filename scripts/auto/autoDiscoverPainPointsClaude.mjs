import OpenAI from "openai";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

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

// Logging helper
async function logToAgentStatus(stage, success, errorLog = null) {
  try {
    const { error } = await supabase.from("AgentStatus").insert([
      {
        idea: "pain_points_discovery",
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

// 1) Fetch raw Reddit threads
async function fetchRedditThreads(limit = 10) {
  const subreddits = ["Entrepreneur", "SideProject", "startups"];
  const results = [];

  console.log(`Fetching threads from ${subreddits.length} subreddits...`);

  for (const sub of subreddits) {
    try {
      const url = `https://www.reddit.com/r/${sub}/new.json?limit=${Math.ceil(
        limit / subreddits.length
      )}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "RealWebWins/1.0 (Pain Point Discovery Bot)",
        },
      });

      if (!res.ok) {
        console.warn(`Failed to fetch r/${sub}: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const posts = data?.data?.children || [];

      for (const post of posts) {
        const d = post.data;
        const body = [d.title, d.selftext].filter(Boolean).join("\n\n");

        if (body.length > 50) {
          // Skip very short posts
          results.push({
            body: body.slice(0, 2000), // Limit length
            url: `https://reddit.com${d.permalink}`,
            sub,
          });
        }
      }

      if (VERBOSE) {
        console.log(`  ✓ r/${sub}: ${posts.length} posts fetched`);
      }
    } catch (error) {
      console.warn(`Error fetching r/${sub}:`, error.message);
    }
  }

  const limited = results.slice(0, limit);
  console.log(`Total threads collected: ${limited.length}`);
  return limited;
}

// 2) Use Claude to extract structured pain points
async function extractPainPoints({ body, url, sub }, retries = 3) {
  const prompt = `From the following discussion, extract up to 3 distinct pain points.
Return a strict JSON array; each item must include:
{text, category, niche, source, audience, frequency, proof_link}.

Field specifications:
- text: 1-2 sentence description of the problem (max 200 chars)
- category: One of: Marketing | Monetization | Motivation | Product | Growth | Pricing | Technical | Trust | Personalization | Retention | Finance | Experience | Efficiency | Discovery | Security | Waste | Effectiveness | Organization | Education | Practicality | Sharing
- niche: short noun phrase describing who has this problem (e.g., "YouTubers", "Etsy Sellers", "Freelancers", "SaaS Founders", "Online Shoppers", "Learners", "Small Business Owners")
- source: "Reddit"
- audience: "creator" (builders/freelancers/founders) or "consumer" (end-users/shoppers/learners)
- frequency: integer 1-5 indicating how often this problem appears in the thread (1=mentioned, 5=central theme)
- proof_link: "${url}"

Important:
- Only extract genuine pain points or problems, not feature requests or questions
- Classify as "creator" if the problem is faced by someone building/selling something
- Classify as "consumer" if the problem is faced by someone buying/using something
- Return ONLY valid JSON array, no markdown code blocks

Thread URL: ${url}
Subreddit: r/${sub}

Text:
${body}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const resp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const text = resp.choices?.[0]?.message?.content?.trim() ?? "[]";

      // Clean potential markdown wrappers
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const arr = JSON.parse(cleaned);

      if (Array.isArray(arr)) {
        if (VERBOSE && arr.length > 0) {
          console.log(`  ✓ Extracted ${arr.length} pain points from r/${sub} thread`);
        }
        return arr;
      }

      console.warn("AI returned non-array response:", cleaned);
      return [];
    } catch (error) {
      if (attempt === retries) {
        console.error(
          `Failed to extract pain points after ${retries} attempts:`,
          error.message
        );
        if (VERBOSE) {
          console.error("Response text:", error);
        }
        return [];
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  return [];
}

// 3) Insert pain points into Supabase (upsert to prevent duplicates)
async function upsertPainPoints(points) {
  if (!points || points.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  const rows = points
    .map((p) => ({
      text: p.text?.slice(0, 1000) || null,
      category: p.category || null,
      niche: p.niche || null,
      source: p.source || "Reddit",
      audience: p.audience || "creator",
      frequency: Number(p.frequency) || 1,
      proof_link: p.proof_link || null,
      last_seen: new Date().toISOString(),
    }))
    .filter((row) => row.text); // Remove invalid entries

  if (rows.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  try {
    // Note: Supabase upsert requires a unique constraint
    // We'll use insert with error handling for now
    const { data, error } = await supabase.from("pain_points").insert(rows).select();

    if (error) {
      // If duplicate, that's OK - just log it
      if (error.code === "23505") {
        // unique violation
        if (VERBOSE) {
          console.log(`  ~ ${rows.length} pain points already exist (duplicates skipped)`);
        }
        return { inserted: 0, updated: rows.length };
      }

      console.error("Supabase insert error:", error.message);
      await logToAgentStatus("pain_points_insert", false, error.message);
      return { inserted: 0, updated: 0 };
    }

    console.log(`  ✓ Inserted ${data?.length || 0} new pain points`);
    return { inserted: data?.length || 0, updated: 0 };
  } catch (error) {
    console.error("Unexpected error during upsert:", error.message);
    await logToAgentStatus("pain_points_insert", false, error.message);
    return { inserted: 0, updated: 0 };
  }
}

// Main orchestration
async function main() {
  console.log("=== AI Pain Point Discovery Started (using GPT-4o) ===\n");

  const startTime = Date.now();
  let totalInserted = 0;
  let totalUpdated = 0;
  let threadsProcessed = 0;

  try {
    // Fetch Reddit threads
    const threads = await fetchRedditThreads(10);

    if (threads.length === 0) {
      console.log("No threads fetched. Exiting.");
      await logToAgentStatus("reddit_fetch", false, "No threads returned");
      return;
    }

    await logToAgentStatus("reddit_fetch", true);

    console.log("\nProcessing threads with GPT-4o...\n");

    // Process each thread
    for (const thread of threads) {
      const extracted = await extractPainPoints(thread);

      if (extracted.length > 0) {
        const { inserted, updated } = await upsertPainPoints(extracted);
        totalInserted += inserted;
        totalUpdated += updated;
      }

      threadsProcessed++;

      // Rate limiting: wait 1 second between threads
      if (threadsProcessed < threads.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n=== Discovery Complete ===");
    console.log(`Threads processed: ${threadsProcessed}`);
    console.log(`Pain points inserted: ${totalInserted}`);
    console.log(`Pain points updated: ${totalUpdated}`);
    console.log(`Duration: ${duration}s`);

    await logToAgentStatus("pain_points_discovery", true, null);
  } catch (error) {
    console.error("\n❌ Discovery failed:", error.message);
    await logToAgentStatus("pain_points_discovery", false, error.message);
    process.exit(1);
  }
}

main();
