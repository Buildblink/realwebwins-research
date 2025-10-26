#!/usr/bin/env node
import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
    );
  }

  const sqlPath = join(
    __dirname,
    "migrations",
    "create_phase26_27_agent_tables.sql"
  );
  const sql = readFileSync(sqlPath, "utf8");

  console.log("Applying Phase 26-27 agent tables migration…");

  const response = await fetch(`${supabaseUrl}/postgres/v1/query`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }).catch((error) => {
    throw new Error(
      `Failed to reach Supabase postgres API: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  });

  if (!response) {
    throw new Error("Unexpected null response from Supabase postgres API.");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Supabase postgres API returned ${response.status}: ${
        text || response.statusText
      }`
    );
  }

  console.log("Phase 26-27 migration completed.");
}

runMigration().catch((error) => {
  console.error("Phase 26-27 migration failed:", error);
  process.exit(1);
});
