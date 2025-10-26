#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import fetch from "node-fetch";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_BASE ??
  process.env.PUBLIC_BASE_URL ??
  "http://localhost:3000";

async function fetchPage(path) {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const response = await fetch(url, { headers: { "User-Agent": "verify-script" } });
  if (!response.ok) {
    const text = await response.text();
    console.error(
      chalk.red(`✖ ${path} failed (${response.status}): ${text.slice(0, 120)}…`)
    );
    return { ok: false };
  }
  const text = await response.text();
  console.log(
    chalk.green(`✓ ${path} rendered (${text.length} bytes, contains leaderboard=${text.includes("Leaderboard")})`)
  );
  return { ok: true };
}

async function main() {
  console.log(chalk.cyan("\n🚀  Phase 31 Public Leaderboard Verification"));

  const results = [];
  results.push((await fetchPage("/public/leaderboard")).ok);
  results.push((await fetchPage("/public/agent/agent_researcher")).ok);

  if (results.every(Boolean)) {
    console.log(chalk.green("\n✅ Public leaderboard verification completed."));
  } else {
    console.warn(
      chalk.yellow(
        "\n⚠️  Public leaderboard verification reported issues. Examine the responses and rerun once fixed."
      )
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    chalk.red(
      `✖ verifyPublicLeaderboard crashed: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  );
  process.exitCode = 1;
});
