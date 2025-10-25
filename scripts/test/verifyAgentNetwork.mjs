#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import fetch from "node-fetch";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.API_BASE_URL ??
  "http://localhost:3000";

async function main() {
  console.log(chalk.cyan("\n🤖  Phase 20 Network Verification"));

  const response = await fetch(`${apiBase.replace(/\/$/, "")}/api/agents/network`, {
    method: "GET",
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(
      chalk.red(`✗  Network endpoint failed (${response.status}): ${text}`)
    );
    process.exit(1);
  }

  const body = await response.json();

  console.log(
    chalk.green(
      `✓  Agent network fetched: ${body.nodes?.length ?? 0} nodes, ${body.links?.length ?? 0} links`
    )
  );
}

main().catch((error) => {
  console.error(chalk.red("✗  verifyAgentNetwork crashed"), error);
  process.exit(1);
});
