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
  console.log("\n== Phase 26 Metrics Verification");

  const postResponse = await fetch(api("/api/agents/metrics"), {
    method: "POST",
  });

  const postJson = await postResponse
    .json()
    .catch(() => ({ success: false, message: "Invalid JSON payload." }));

  if (!postResponse.ok || !postJson.success) {
    console.error(
      chalk.red(
        `Metrics POST failed (${postResponse.status}): ${
          postJson.message ?? postJson.error ?? "unknown error"
        }`
      )
    );
    process.exit(1);
  }

  console.log(
    chalk.green(
      `✓ Metrics recomputed for ${postJson.updated ?? "unknown"} agents.`
    )
  );

  const getResponse = await fetch(api("/api/agents/metrics"));
  if (!getResponse.ok) {
    const text = await getResponse.text();
    console.error(
      chalk.red(
        `Metrics GET failed (${getResponse.status}): ${text.slice(0, 200)}`
      )
    );
    process.exit(1);
  }

  const getJson = (await getResponse.json()) ?? {};
  const rows = Array.isArray(getJson.data) ? getJson.data : [];

  console.log(
    chalk.green(
      `✓ Retrieved ${rows.length} metric row${
        rows.length === 1 ? "" : "s"
      } for dashboard validation.`
    )
  );

  if (rows.length > 0) {
    const latest = rows[0];
    console.log(
      chalk.gray(
        `Latest metric – agent ${latest.agent_id} avg impact ${
          latest.average_impact ?? "n/a"
        }`
      )
    );
  }
}

main().catch((error) => {
  console.error("verifyAgentMetrics crashed", error);
  process.exit(1);
});
