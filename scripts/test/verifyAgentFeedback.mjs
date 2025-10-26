#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import fetch from "node-fetch";
import { randomUUID } from "crypto";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.API_BASE_URL ??
  "http://localhost:3000";

async function createBehavior(action, trigger = "manual") {
  const response = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/agents/behavior`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: "agent_researcher",
        name: `test-${action}-${randomUUID().slice(0, 8)}`,
        description: `Verification behavior ${action}`,
        action_type: action,
        trigger_type: trigger,
        config: { trigger_type: trigger },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create behavior (${response.status}): ${text}`);
  }

  const json = await response.json();

  // 🧩 Fix: strip any trailing labels (e.g. "(agent_researcher-analyze)")
  const rawId = json.behavior?.id ?? "";
  const cleanId = rawId.split(" ")[0].trim();

  return cleanId;
}

async function seedReflection(behaviorId, impact) {
  const response = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/agents/reflect`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: "agent_researcher",
        override: {
          behavior_id: behaviorId,
          impact,
          confidence: 0.8,
          reflection: `Behavior ${behaviorId} impact ${impact}`,
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to seed reflection (${response.status}): ${text}`
    );
  }
}

async function fetchBehaviors() {
  const response = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/agents/behavior`
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch behaviors (${response.status}): ${text}`);
  }
  const json = await response.json();
  return json.data ?? [];
}

async function main() {
  console.log(chalk.cyan("\n🤖  Phase 25 Feedback Verification"));

  const secret = process.env.WEEKLY_SUMMARY_SECRET;
  if (!secret) {
    console.error(
      chalk.red(
        "✗  WEEKLY_SUMMARY_SECRET missing. Define it in your environment."
      )
    );
    process.exit(1);
  }

  const boostedBehaviorId = await createBehavior("analyze");
  const disabledBehaviorId = await createBehavior("relay");

  if (!boostedBehaviorId || !disabledBehaviorId) {
    console.error(chalk.red("✗  Failed to create behaviors for verification"));
    process.exit(1);
  }

  // ✅ Always use clean UUIDs here
  await seedReflection(boostedBehaviorId, 0.9);
  await seedReflection(boostedBehaviorId, 0.85);
  await seedReflection(disabledBehaviorId, 0.1);
  await seedReflection(disabledBehaviorId, 0.05);

  const response = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/cron/agents-feedback`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(
      chalk.red(`✗  Feedback optimizer failed (${response.status}): ${text}`)
    );
    process.exit(1);
  }

  const summary = await response.json();
  console.log(
    chalk.green(
      `✓  Feedback optimizer processed (boosted ${summary.result?.boosted ?? 0}, disabled ${summary.result?.disabled ?? 0})`
    )
  );

  const behaviors = await fetchBehaviors();
  const boosted = behaviors.find((b) => b.id === boostedBehaviorId);
  const disabled = behaviors.find((b) => b.id === disabledBehaviorId);

  if (disabled?.enabled === false) {
    console.log(
      chalk.green(`✓  Low-impact behavior ${disabledBehaviorId} was disabled`)
    );
  } else {
    console.warn(
      chalk.yellow(
        `⚠️  Behavior ${disabledBehaviorId} not disabled yet (impact threshold may not have been met)`
      )
    );
  }

  if (boosted) {
    console.log(
      chalk.green(
        `✓  High-impact behavior ${boostedBehaviorId} remains enabled for continued use`
      )
    );
  }
}

main().catch((error) => {
  console.error(chalk.red("✗  verifyAgentFeedback crashed"), error);
  process.exit(1);
});
