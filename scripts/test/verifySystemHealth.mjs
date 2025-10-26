#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import fetch from "node-fetch";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.API_BASE_URL ??
  "http://localhost:3000";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function validateColumns() {
  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      chalk.yellow(
        "⚠️  Skipping REST column validation — Supabase URL or key missing."
      )
    );
    return { ok: false, skipped: true };
  }

  const tables = [
    { name: "agent_events", columns: ["agent_id", "type", "created_at"] },
    { name: "system_health", columns: ["component", "status", "checked_at"] },
  ];

  const base = supabaseUrl.replace(/\/$/, "");
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  let missingColumns = 0;

  for (const table of tables) {
    try {
      const url = `${base}/rest/v1/${table.name}?select=${encodeURIComponent(
        table.columns.join(",")
      )}&limit=1`;
      const response = await fetch(url, { headers });
      if (!response.ok) {
        missingColumns += 1;
        console.error(
          chalk.red(
            `✖ Could not verify ${table.name} (${response.status}). Enable REST access or run migration.`
          )
        );
        continue;
      }
      console.log(
        chalk.green(
          `✓ REST query succeeded for ${table.name} (${table.columns.join(", ")})`
        )
      );
    } catch (error) {
      missingColumns += 1;
      console.error(
        chalk.red(
          `✖ Failed to query ${table.name}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  }

  return { ok: missingColumns === 0, skipped: false };
}

async function postHealthSample() {
  const payload = {
    component: "supabase",
    status: "ok",
    details: { latency_ms: Math.floor(Math.random() * 50) },
    agent_event: {
      agent_id: "agent_researcher",
      type: "health-check",
      payload: { status: "ok" },
    },
  };

  const response = await fetch(`${apiBase.replace(/\/$/, "")}/api/system/health`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(
      chalk.red(
        `✖ POST /api/system/health failed (${response.status}): ${text || "Unknown"}`
      )
    );
    return { ok: false };
  }

  const json = await response.json();
  console.log(
    chalk.green(
      `✓ POST /api/system/health recorded (${json.data?.components?.length ?? 0} components)`
    )
  );
  return { ok: true };
}

async function fetchHealthSnapshot() {
  const response = await fetch(`${apiBase.replace(/\/$/, "")}/api/system/health`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(
      chalk.red(
        `✖ GET /api/system/health failed (${response.status}): ${text || "Unknown"}`
      )
    );
    return { ok: false };
  }

  const json = await response.json();
  if (!json.success) {
    console.error(
      chalk.red(
        `✖ GET /api/system/health returned error: ${json.message ?? json.error ?? "Unknown"}`
      )
    );
    return { ok: false };
  }

  console.log(
    chalk.green(
      `✓ Health snapshot uptime=${json.data?.uptimePercentage ?? 0}% errors=${json.data?.errorCount24h ?? 0}`
    )
  );

  return { ok: true };
}

async function main() {
  console.log(chalk.cyan("\n🚀  Phase 29 System Health Verification"));

  const results: boolean[] = [];

  const columnResult = await validateColumns();
  if (!columnResult.skipped) {
    results.push(columnResult.ok);
  }

  const postResult = await postHealthSample();
  results.push(postResult.ok);

  const getResult = await fetchHealthSnapshot();
  results.push(getResult.ok);

  if (results.every(Boolean)) {
    console.log(chalk.green("\n✅ System health verification completed."));
  } else {
    console.warn(
      chalk.yellow(
        "\n⚠️  System health verification reported issues. Review logs above and rerun once resolved."
      )
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    chalk.red(
      `✖ verifySystemHealth crashed: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  );
  process.exitCode = 1;
});
