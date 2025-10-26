#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import fetch from "node-fetch";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.API_BASE_URL ??
  "http://localhost:3000";

async function main() {
  console.log(chalk.cyan("\n🤖  Phase 23 Sync Verification"));

  const secret = process.env.WEEKLY_SUMMARY_SECRET;
  if (!secret) {
    console.error(
      chalk.red(
        "✗  WEEKLY_SUMMARY_SECRET missing. Define it in .env.local before running."
      )
    );
    process.exit(1);
  }

  const response = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/cron/agents-sync`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(
      chalk.red(`✗  agents-sync cron failed (${response.status}): ${text}`)
    );
    process.exit(1);
  }

  const body = await response.json();
  console.log(
    chalk.green(
      `✓  Shared memory sync executed. Added ${body.result?.added ?? 0} insight(s).`
    )
  );
}

main().catch((error) => {
  console.error(chalk.red("✗  verifyAgentSync crashed"), error);
  process.exit(1);
});
