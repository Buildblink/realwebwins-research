#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import fetch from "node-fetch";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.API_BASE_URL ??
  "http://localhost:3000";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function checkSchemaColumns() {
  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      chalk.yellow(
        "⚠️  Skipping schema validation. Provide NEXT_PUBLIC_SUPABASE_URL and a Supabase key to enable column checks."
      )
    );
    return { ok: false, message: "Missing Supabase configuration." };
  }

  const base = supabaseUrl.replace(/\/$/, "");
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  const targets = [
    {
      table: "agent_metrics",
      columns: ["agent_id", "average_impact", "consistency"],
    },
    {
      table: "agent_links",
      columns: ["source_agent", "target_agent", "strength"],
    },
    {
      table: "agent_leaderboard",
      columns: [
        "agent_id",
        "rank_score",
        "impact_rank",
        "consistency_rank",
        "collaboration_rank",
      ],
    },
  ];

  let issues = 0;

  for (const target of targets) {
    try {
      const response = await fetch(
        `${base}/rest/v1/${target.table}?select=${encodeURIComponent(
          target.columns.join(",")
        )}&limit=1`,
        { headers }
      );

      if (!response.ok) {
        issues += 1;
        const text = await response.text();
        console.error(
          chalk.red(
            `✖ Unable to inspect ${target.table} (${response.status}): ${text}`
          )
        );
        continue;
      }

      const columnNames = response.headers
        .get("content-profile")
        ?.split(";")
        .find((value) => value.trim().startsWith("columns="));

      const payload = await response.json();

      const missing = target.columns.filter((column) => {
        const sample = payload?.[0];
        return (
          !(column in (sample ?? {})) &&
          !(columnNames && columnNames.includes(column))
        );
      });

      if (missing.length > 0) {
        issues += 1;
        console.warn(
          chalk.yellow(
            `⚠️  Table ${target.table} missing expected columns: ${missing.join(
              ", "
            )}`
          )
        );
      } else {
        console.log(
          chalk.green(`✓ Columns present for ${target.table}: ${target.columns.join(", ")}`)
        );
      }
    } catch (error) {
      issues += 1;
      console.error(
        chalk.red(
          `✖ Column check failed for ${target.table}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  }

  return { ok: issues === 0, issues };
}

async function triggerLeaderboardRecompute() {
  try {
    const response = await fetch(
      `${apiBase.replace(/\/$/, "")}/api/agents/leaderboard`,
      { method: "POST", headers: { "Content-Type": "application/json" } }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(
        chalk.red(
          `✖ Leaderboard POST failed (${response.status}): ${text || "Unknown error"}`
        )
      );
      return { ok: false };
    }

    const json = await response.json();
    console.log(
      chalk.green(
        `✓ Recomputed leaderboard for ${json.updated ?? 0} agent(s).`
      )
    );
    if (Array.isArray(json.insights) && json.insights.length > 0) {
      console.log(
        chalk.blue(
          `ℹ︎  Generated insights: ${json.insights
            .map((insight) => insight.summary)
            .join(" | ")}`
        )
      );
    }
    return { ok: true };
  } catch (error) {
    console.error(
      chalk.red(
        `✖ Leaderboard recompute crashed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
    return { ok: false };
  }
}

async function fetchLeaderboardSample() {
  try {
    const response = await fetch(
      `${apiBase.replace(/\/$/, "")}/api/agents/leaderboard?limit=5`,
      { headers: { "Content-Type": "application/json" } }
    );
    if (!response.ok) {
      const text = await response.text();
      console.error(
        chalk.red(
          `✖ Leaderboard GET failed (${response.status}): ${text || "Unknown error"}`
        )
      );
      return { ok: false };
    }
    const json = await response.json();
    if (!json.success) {
      console.error(
        chalk.red(
          `✖ Leaderboard GET returned error: ${json.message ?? json.error ?? "Unknown"}`
        )
      );
      return { ok: false };
    }

    const spotlight = json.data?.[0];
    if (spotlight) {
      console.log(
        chalk.green(
          `✓ #1 Agent ${spotlight.agent_id} | Impact ${spotlight.impact_avg?.toFixed?.(2) ?? "0.00"} | Collaboration ${spotlight.collaboration_weight_sum?.toFixed?.(2) ?? "0.00"}`
        )
      );
    } else {
      console.warn(
        chalk.yellow(
          "⚠️  No leaderboard rows returned. Run POST /api/agents/leaderboard first."
        )
      );
    }

    if (json.insights?.length) {
      console.log(chalk.cyan("ℹ︎  Insight Feed Preview:"));
      json.insights.slice(0, 3).forEach((insight) => {
        console.log(
          chalk.cyan(
            `   • ${insight.summary ?? "Insight text missing"}`
          )
        );
      });
    }
    return { ok: Boolean(json.data?.length) };
  } catch (error) {
    console.error(
      chalk.red(
        `✖ Leaderboard GET crashed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
    return { ok: false };
  }
}

async function main() {
  console.log(chalk.cyan("\n🚀  Phase 28 Leaderboard Verification"));

  const results = [];

  const schemaResult = await checkSchemaColumns();
  results.push(schemaResult.ok);

  const recomputeResult = await triggerLeaderboardRecompute();
  results.push(recomputeResult.ok);

  const fetchResult = await fetchLeaderboardSample();
  results.push(fetchResult.ok);

  if (results.every(Boolean)) {
    console.log(chalk.green("\n✅ Leaderboard verification completed successfully."));
  } else {
    console.warn(
      chalk.yellow(
        "\n⚠️  Leaderboard verification reported issues. Review logs above for actionable diagnostics."
      )
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    chalk.red(
      `✖ verifyAgentLeaderboard terminated unexpectedly: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  );
  process.exitCode = 1;
});
