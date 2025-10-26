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

async function checkColumns(table, columns) {
  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      chalk.yellow(
        "⚠️  Cannot verify Supabase schema — NEXT_PUBLIC_SUPABASE_URL or service key missing."
      )
    );
    return false;
  }

  try {
    const response = await fetch(
      `${supabaseUrl.replace(
        /\/$/,
        ""
      )}/rest/v1/${table}?select=${encodeURIComponent(columns.join(","))}&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error(
        chalk.red(
          `✖ REST check failed for ${table} (${response.status}). Run the phase migration first.`
        )
      );
      return false;
    }

    console.log(
      chalk.green(`✓ Table ${table} exposes columns: ${columns.join(", ")}`)
    );
    return true;
  } catch (error) {
    console.error(
      chalk.red(
        `✖ Unable to inspect ${table}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
    return false;
  }
}

async function fetchSession() {
  try {
    const response = await fetch(
      `${apiBase.replace(/\/$/, "")}/api/auth/session`,
      { headers: { "Content-Type": "application/json" } }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(
        chalk.red(
          `✖ /api/auth/session failed (${response.status}): ${text || "Unknown response"}`
        )
      );
      return false;
    }

    const json = await response.json();
    console.log(chalk.green("✓ /api/auth/session responded 200 OK"));
    console.log(chalk.cyan("ℹ︎  Sample payload:"), JSON.stringify(json, null, 2));
    return true;
  } catch (error) {
    console.error(
      chalk.red(
        `✖ Request to /api/auth/session crashed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
    return false;
  }
}

async function main() {
  console.log(chalk.cyan("\n🚀  Phase 32 Auth Session Verification"));

  const results = [];
  results.push(await checkColumns("user_profiles", ["id", "email", "created_at"]));
  results.push(await checkColumns("user_credits", ["user_id", "balance", "updated_at"]));
  results.push(await fetchSession());

  if (results.every(Boolean)) {
    console.log(chalk.green("\n✅ Auth session verification completed successfully."));
  } else {
    console.warn(
      chalk.yellow(
        "\n⚠️  Auth session verification reported issues. Fix the errors above and rerun."
      )
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    chalk.red(
      `✖ verifyAuthSession crashed: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  );
  process.exitCode = 1;
});
