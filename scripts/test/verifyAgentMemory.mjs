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
  console.log(chalk.cyan("\n🤖  Phase 23 Memory Verification"));

  const topic = `test_topic_${randomUUID().slice(0, 8)}`;
  const payload = {
    agent_id: "agent_researcher",
    topic,
    content: "Automated memory verification entry",
    relevance: 0.75,
  };

  const postResponse = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/agents/memory`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!postResponse.ok) {
    const text = await postResponse.text();
    console.error(
      chalk.red(`✗  Failed to upsert memory (${postResponse.status}): ${text}`)
    );
    process.exit(1);
  }

  console.log(chalk.green(`✓  Memory entry stored under topic ${topic}`));

  const fetchResponse = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/agents/memory?topic=${encodeURIComponent(
      topic
    )}&limit=5`
  );

  if (!fetchResponse.ok) {
    const text = await fetchResponse.text();
    console.error(
      chalk.red(`✗  Failed to fetch memory (${fetchResponse.status}): ${text}`)
    );
    process.exit(1);
  }

  const body = await fetchResponse.json();
  const found = (body.data ?? []).find(
    (entry) => entry.topic === topic && entry.content === payload.content
  );

  if (!found) {
    console.error(chalk.red("✗  Newly inserted memory entry was not returned"));
    process.exit(1);
  }

  console.log(chalk.green("✓  Memory retrieval successful"));

  const syncResponse = await fetch(
    `${apiBase.replace(/\/$/, "")}/api/agents/memory/sync`,
    { method: "POST" }
  );

  if (!syncResponse.ok) {
    const text = await syncResponse.text();
    console.error(
      chalk.red(`✗  Memory sync failed (${syncResponse.status}): ${text}`)
    );
    process.exit(1);
  }

  console.log(chalk.green("✓  Memory sync endpoint responded successfully"));
}

main().catch((error) => {
  console.error(chalk.red("✗  verifyAgentMemory crashed"), error);
  process.exit(1);
});
