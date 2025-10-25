#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import fetch from "node-fetch";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.API_BASE_URL ??
  "http://localhost:3000";

async function main() {
  console.log(chalk.cyan.bold("🤖  Phase 19 Agent Insights Verification"));

  const analyzeResponse = await fetch(`${apiBase.replace(/\/$/, "")}/api/agents/analyze`, {
    method: "POST",
  });

  if (!analyzeResponse.ok) {
    const message = await analyzeResponse.text();
    console.error(
      chalk.red(`✗  /api/agents/analyze failed (${analyzeResponse.status}): ${message}`)
    );
    process.exit(1);
  }

  const analyzeJson = await analyzeResponse.json();
  const generated = Array.isArray(analyzeJson.results) ? analyzeJson.results.length : 0;

  if (!analyzeJson.success) {
    console.error(chalk.red("✗  Analyze endpoint reported failure"), analyzeJson);
    process.exit(1);
  }

  console.log(chalk.green(`✓  ${generated} insights generated`));

  const insightsResponse = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/agents/insights?limit=5`
  );

  if (!insightsResponse.ok) {
    const message = await insightsResponse.text();
    console.error(
      chalk.red(`✗  /api/agents/insights failed (${insightsResponse.status}): ${message}`)
    );
    process.exit(1);
  }

  const insightsJson = await insightsResponse.json();
  const insightCount = Array.isArray(insightsJson.data) ? insightsJson.data.length : 0;

  console.log(
    chalk.green(
      `✓  Retrieved ${insightCount} stored insight${insightCount === 1 ? "" : "s"}`
    )
  );
}

main().catch((error) => {
  console.error(chalk.red("✗  Verification script crashed"), error);
  process.exit(1);
});
