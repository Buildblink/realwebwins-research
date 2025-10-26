#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import fetch from "node-fetch";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.API_BASE_URL ??
  "http://localhost:3000";

const api = (path) => `${apiBase.replace(/\/$/, "")}${path}`;

async function main() {
  console.log("\n== Phase 27 Collaboration Verification");

  const sourceAgent =
    process.env.TEST_SOURCE_AGENT?.trim() || "agent_researcher";

  const response = await fetch(api("/api/agents/collaborate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_agent: sourceAgent }),
  });

  const json = await response
    .json()
    .catch(() => ({ success: false, message: "Invalid JSON payload." }));

  if (!response.ok || !json.success) {
    console.error(
      chalk.red(
        `Collaboration failed (${response.status}): ${
          json.message ?? json.error ?? "unknown error"
        }`
      )
    );
    process.exit(1);
  }

  const total = Array.isArray(json.results) ? json.results.length : 0;
  const successes = Array.isArray(json.results)
    ? json.results.filter((entry) => entry.success).length
    : 0;

  console.log(
    chalk.green(
      `✓ Collaboration executed across ${total} link${
        total === 1 ? "" : "s"
      } with ${successes} success${successes === 1 ? "" : "es"}.`
    )
  );

  if (total > 0) {
    const sample = json.results.find((entry) => entry.success) ?? json.results[0];
    console.log(
      chalk.gray(
        `Sample outcome – ${sample.target_agent} via ${sample.action_type}.`
      )
    );
  }
}

main().catch((error) => {
  console.error("verifyAgentCollaboration crashed", error);
  process.exit(1);
});
