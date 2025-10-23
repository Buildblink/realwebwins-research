import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing environment variables:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Get week number from date
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Format date as YYYY-WW
 */
function getWeekId() {
  const now = new Date();
  const year = now.getFullYear();
  const week = getWeekNumber(now).toString().padStart(2, "0");
  return `${year}-${week}`;
}

/**
 * Main execution
 */
async function run() {
  console.log("🗞️  Running Weekly Summary...\n");

  try {
    // 1. Query published workspaces from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: workspaces, error } = await supabase
      .from("public_workspaces")
      .select(`
        id,
        title,
        slug,
        description,
        category,
        views,
        remix_count,
        created_at,
        workspaces!inner (
          id,
          pain_point_id,
          pain_points (
            text,
            category,
            niche
          )
        )
      `)
      .eq("published", true)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("views", { ascending: false })
      .order("remix_count", { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Failed to query workspaces: ${error.message}`);
    }

    if (!workspaces || workspaces.length === 0) {
      console.log("⚠️  No new published workspaces in the last 7 days");
      return;
    }

    console.log(`✅ Found ${workspaces.length} published workspaces\n`);

    // 2. Generate newsletter markdown
    const newsletterMd = generateNewsletterMarkdown(workspaces);

    // 3. Generate tweet snippets
    const tweets = generateTweetSnippets(workspaces.slice(0, 5));

    // 4. Create output directory
    const weekId = getWeekId();
    const outputDir = join(process.cwd(), "exports", "weekly", weekId);

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // 5. Write files
    const newsletterPath = join(outputDir, "newsletter.md");
    const tweetsPath = join(outputDir, "tweets.txt");
    const manifestPath = join(outputDir, "manifest.json");

    writeFileSync(newsletterPath, newsletterMd, "utf8");
    writeFileSync(tweetsPath, tweets, "utf8");
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          weekId,
          generatedAt: new Date().toISOString(),
          workspaceCount: workspaces.length,
          topCategories: getTopCategories(workspaces),
        },
        null,
        2
      ),
      "utf8"
    );

    console.log("📁 Files created:");
    console.log(`  - ${newsletterPath}`);
    console.log(`  - ${tweetsPath}`);
    console.log(`  - ${manifestPath}`);

    console.log("\n✅ Weekly summary complete!");
  } catch (error) {
    console.error("\n❌ Weekly summary failed:");
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Generate newsletter markdown
 */
function generateNewsletterMarkdown(workspaces) {
  const weekId = getWeekId();
  const date = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  let md = `# 🚀 Top Workspaces This Week\n`;
  md += `*Week ${weekId} - ${date}*\n\n`;
  md += `This week, our community published **${workspaces.length} new workspaces** solving real problems. Here are the top ones:\n\n`;
  md += `---\n\n`;

  for (const ws of workspaces) {
    const painPoint = ws.workspaces?.pain_points;
    const category = painPoint?.category || "General";
    const niche = painPoint?.niche || "";

    md += `## ${ws.title}\n\n`;

    if (ws.description) {
      md += `${ws.description}\n\n`;
    }

    md += `**Problem:** ${painPoint?.text || "N/A"}\n\n`;
    md += `**Category:** ${category}`;
    if (niche) md += ` | **Niche:** ${niche}`;
    md += `\n\n`;

    md += `**Stats:** ${ws.views} views · ${ws.remix_count} remixes\n\n`;
    md += `[View Workspace →](/workspace/${ws.workspaces.pain_point_id})\n\n`;
    md += `---\n\n`;
  }

  md += `\n## 📊 This Week's Insights\n\n`;
  md += `- **Total Published:** ${workspaces.length} workspaces\n`;
  md += `- **Total Views:** ${workspaces.reduce((sum, w) => sum + (w.views || 0), 0)}\n`;
  md += `- **Total Remixes:** ${workspaces.reduce((sum, w) => sum + (w.remix_count || 0), 0)}\n`;
  md += `- **Top Categories:** ${getTopCategories(workspaces).join(", ")}\n\n`;

  md += `---\n\n`;
  md += `*Want to be featured? [Publish your workspace →](/workspace)*\n`;

  return md;
}

/**
 * Generate tweet snippets
 */
function generateTweetSnippets(topWorkspaces) {
  let tweets = `# Tweet Snippets for Week ${getWeekId()}\n`;
  tweets += `# Copy and paste these to X/Twitter\n\n`;
  tweets += `---\n\n`;

  for (let i = 0; i < topWorkspaces.length; i++) {
    const ws = topWorkspaces[i];
    const painPoint = ws.workspaces?.pain_points;
    const category = painPoint?.category || "problem";

    tweets += `## Tweet ${i + 1}\n\n`;
    tweets += `🚀 New on RealWebWins:\n\n`;
    tweets += `"${ws.title}"\n\n`;
    tweets += `Solving: ${painPoint?.text || "a real problem"}\n\n`;
    tweets += `${ws.views} views · ${ws.remix_count} remixes\n\n`;
    tweets += `Check it out → [Add your domain]/workspace/${ws.workspaces.pain_point_id}\n\n`;
    tweets += `#${category.replace(/\s+/g, "")} #Startup #BuildInPublic\n\n`;
    tweets += `---\n\n`;
  }

  return tweets;
}

/**
 * Get top 3 categories
 */
function getTopCategories(workspaces) {
  const categoryCount = {};

  for (const ws of workspaces) {
    const category = ws.workspaces?.pain_points?.category || "Other";
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  }

  return Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);
}

// Run the script
run();
