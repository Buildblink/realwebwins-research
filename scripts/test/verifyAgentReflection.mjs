#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import fetch from "node-fetch";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.API_BASE_URL ??
  "http://localhost:3000";

async function main() {
  console.log("\n🤖  Phase 24 Reflection Verification");

  // 🔹 Step 1: Trigger reflection creation
  const postResponse = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/agents/reflect`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: "agent_researcher",
        override: {
          reflection: "Testing reflection pipeline end-to-end.",
          impact: Math.random().toFixed(2),
          confidence: 0.9,
        },
      }),
    }
  );

  if (!postResponse.ok) {
    const text = await postResponse.text();
    console.error(
      chalk.red(
        `✗ Reflection endpoint failed (${postResponse.status}): ${text}`
      )
    );
    process.exit(1);
  }

  console.log(chalk.green("✓ Reflection POST succeeded"));

  // 🔹 Step 2: Verify reflections list
  const listResponse = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/agents/reflect?limit=5`
  );

  if (!listResponse.ok) {
    const text = await listResponse.text();
    console.error(
      chalk.red(
        `✗ Listing reflections failed (${listResponse.status}): ${text}`
      )
    );
    process.exit(1);
  }

  const reflections = await listResponse.json();
  const latest = reflections.data?.[0];

  if (!latest) {
    console.error(chalk.yellow("⚠ No reflections returned from list."));
    process.exit(1);
  }

  console.log(chalk.green("✅ Reflection created and stored"));
  console.log(chalk.gray(`Latest reflection summary:`));
  console.log(latest.summary ?? JSON.stringify(latest, null, 2));
}

main().catch((error) => {
  console.error("verifyAgentReflection crashed", error);
  process.exit(1);
});
