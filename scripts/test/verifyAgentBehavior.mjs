#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import fetch from "node-fetch";
import { randomUUID } from "crypto";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.API_BASE_URL ??
  "http://localhost:3000";

async function main() {
  console.log(chalk.cyan("\n🤖  Phase 22 Behavior Verification"));

  const behaviorPayload = {
    agent_id: "agent_researcher",
    trigger_type: "manual",
    action: "analyze",
    metadata: randomUUID(),
  };

  const createResponse = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/agents/behavior`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(behaviorPayload),
    }
  );

  if (!createResponse.ok) {
    const text = await createResponse.text();
    console.error(
      chalk.red(`✗  Failed to create behavior (${createResponse.status}): ${text}`)
    );
    process.exit(1);
  }

  const createdBody = await createResponse.json();
  const behaviorId = createdBody.behavior?.id;
  if (!behaviorId) {
    console.error(chalk.red("✗  Behavior creation did not return an id"));
    process.exit(1);
  }

  console.log(chalk.green(`✓  Created behavior ${behaviorId}`));

  const runResponse = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/agents/behavior`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: behaviorId, run: true }),
    }
  );

  if (!runResponse.ok) {
    const text = await runResponse.text();
    console.error(
      chalk.red(`✗  Failed to run behavior (${runResponse.status}): ${text}`)
    );
    process.exit(1);
  }

  const runBody = await runResponse.json();
  console.log(
    chalk.green(
      `✓  Behavior executed: ${runBody.outcome?.result?.summary ?? "no summary"}`
    )
  );

  const insightsResponse = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/agents/insights?limit=5`
  );
  const insights = await insightsResponse.json();
  const behaviorInsight = insights.data?.find(
    (item) => item.source_table === "agent_behaviors" && item.source_id === behaviorId
  );

  if (behaviorInsight) {
    console.log(
      chalk.green(
        `✓  Insight logged for behavior (${behaviorInsight.insight_type})`
      )
    );
  } else {
    console.warn(
      chalk.yellow("⚠️  No behavior insight detected yet (may sync asynchronously)")
    );
  }
}

main().catch((error) => {
  console.error(chalk.red("✗  verifyAgentBehavior crashed"), error);
  process.exit(1);
});
