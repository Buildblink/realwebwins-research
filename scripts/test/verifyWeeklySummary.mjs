#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import fetch from "node-fetch";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.API_BASE_URL ??
  "http://localhost:3000";

const secret = process.env.WEEKLY_SUMMARY_SECRET;

async function runCron() {
  if (!secret) {
    console.warn(
      chalk.yellow(
        "⚠️  WEEKLY_SUMMARY_SECRET not set. Define it to exercise the cron endpoint."
      )
    );
    return { ok: false, skipped: true };
  }

  const response = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/cron/weekly-summary`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(
      chalk.red(
        `✖ weekly-summary cron failed (${response.status}): ${text || "Unknown"}`
      )
    );
    return { ok: false, skipped: false };
  }

  const json = await response.json();
  console.log(
    chalk.green(
      `✓ weekly-summary cron stored week ${json.weekStart ?? "unknown"} (${json.agents ?? 0} agents processed)`
    )
  );

  return { ok: true, skipped: false };
}

async function fetchLatestSummary() {
  const response = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/public/leaderboard?limit=5`
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(
      chalk.red(
        `✖ public leaderboard fetch failed (${response.status}): ${text || "Unknown"}`
      )
    );
    return { ok: false };
  }

  const json = await response.json();
  if (!json.success) {
    console.error(
      chalk.red(
        `✖ public leaderboard response error: ${json.message ?? json.error ?? "Unknown"}`
      )
    );
    return { ok: false };
  }

  console.log(
    chalk.green(
      `✓ public leaderboard reachable (rows=${json.data?.rows?.length ?? 0})`
    )
  );
  return { ok: true };
}

async function main() {
  console.log(chalk.cyan("\n🚀  Phase 30 Weekly Summary Verification"));

  const results: boolean[] = [];

  const cronResult = await runCron();
  if (!cronResult.skipped) {
    results.push(cronResult.ok);
  }

  const leaderboardResult = await fetchLatestSummary();
  results.push(leaderboardResult.ok);

  if (results.every(Boolean)) {
    console.log(chalk.green("\n✅ Weekly summary verification completed."));
  } else {
    console.warn(
      chalk.yellow(
        "\n⚠️  Weekly summary verification reported issues. Resolve errors and rerun."
      )
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    chalk.red(
      `✖ verifyWeeklySummary crashed: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  );
  process.exitCode = 1;
});
