import "dotenv/config";
import chalk from "chalk";
import { createClient } from "@supabase/supabase-js";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const requiredEnv = [
  "AI_PROVIDER",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_PLAUSIBLE_DOMAIN",
];

function gatherMissingEnv() {
  return requiredEnv.filter((key) => {
    const value = process.env[key];
    return !value || String(value).trim().length === 0;
  });
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase credentials are missing.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function checkSupabaseConnectivity(client) {
  const response = await client
    .from("research_projects")
    .select("id", { count: "exact", head: true });

  if (response.error) {
    throw response.error;
  }

  return response.count ?? 0;
}

async function checkAgentStatus(client) {
  const { data, error } = await client
    .from("AgentStatus")
    .select("last_run, stage, success")
    .order("last_run", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const entry = data?.[0];
  if (!entry?.last_run) {
    return { status: "missing" };
  }

  const timestamp = new Date(entry.last_run).getTime();
  if (Number.isNaN(timestamp)) {
    return { status: "invalid_timestamp" };
  }

  const ageMs = Date.now() - timestamp;
  if (ageMs > TWENTY_FOUR_HOURS_MS) {
    return { status: "stale", hours: Math.round(ageMs / (60 * 60 * 1000)) };
  }

  return { status: entry.success ? "ok" : "recent_fail" };
}

async function countTrackedProjects(client) {
  const thresholdIso = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();

  const totalResult = await client
    .from("research_projects")
    .select("id", { count: "exact", head: true })
    .eq("is_tracked", true);

  if (totalResult.error) {
    if (isMissingColumnError(totalResult.error, totalResult.status)) {
      return { total: 0, fresh: 0, skipped: true };
    }
    throw totalResult.error;
  }

  const freshResult = await client
    .from("research_projects")
    .select("id", { count: "exact", head: true })
    .eq("is_tracked", true)
    .gte("last_refreshed_at", thresholdIso);

  if (freshResult.error) {
    if (isMissingColumnError(freshResult.error, freshResult.status)) {
      return { total: 0, fresh: 0, skipped: true };
    }
    throw freshResult.error;
  }

  return {
    total: totalResult.count ?? 0,
    fresh: freshResult.count ?? 0,
    skipped: false,
  };
}

async function checkVaultFeed(client) {
  const { data, error } = await client
    .from("research_projects")
    .select("id")
    .eq("is_public", true)
    .limit(10);

  if (error) {
    throw error;
  }

  return Array.isArray(data);
}

function extractErrorMessage(error) {
  if (!error) {
    return "Unknown error";
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object") {
    const parts = [];
    if ("message" in error && error.message) {
      parts.push(String(error.message));
    }
    if ("details" in error && error.details) {
      parts.push(String(error.details));
    }
    if ("hint" in error && error.hint) {
      parts.push(String(error.hint));
    }
    if ("code" in error && error.code) {
      parts.push(`code=${error.code}`);
    }

    const joined = parts.join(" | ").trim();
    if (joined.length > 0) {
      return joined;
    }
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isMissingColumnError(error, status) {
  if (status === 400 && error && typeof error === "object" && !error.message) {
    return true;
  }
  if (!error) return false;
  if (typeof error === "object" && "code" in error && error.code === "42703") {
    return true;
  }
  const message = extractErrorMessage(error).toLowerCase();
  return message.includes("column");
}

async function main() {
  const missingEnv = gatherMissingEnv();
  const issues = [];
  let supabaseClient;

  console.log(chalk.bold("🔍 Realwebwins System Verification"));

  if (missingEnv.length > 0) {
    issues.push(`Missing environment variables: ${missingEnv.join(", ")}`);
    console.log(chalk.red(`❌ Environment check failed`));
  } else {
    console.log(chalk.green(`✅ Environment check passed (AI provider: ${process.env.AI_PROVIDER})`));
  }

  try {
    supabaseClient = createSupabaseClient();
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
    console.log(chalk.red("❌ Supabase client could not be created."));
    process.exitCode = 1;
    return;
  }

  try {
    const totalProjects = await checkSupabaseConnectivity(supabaseClient);
    console.log(chalk.green(`✅ Supabase reachable (${totalProjects} projects)`));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(`Supabase connectivity failed: ${message}`);
    console.log(chalk.red(`❌ Supabase connectivity failed: ${message}`));
  }

  try {
    const agentStatus = await checkAgentStatus(supabaseClient);
    if (agentStatus.status === "ok") {
      console.log(chalk.green("✅ AgentStatus fresh within 24h"));
    } else if (agentStatus.status === "stale") {
      const hours = agentStatus.hours ?? "unknown";
      console.log(chalk.red(`❌ AgentStatus stale (${hours}h old)`));
      issues.push("AgentStatus stale.");
    } else if (agentStatus.status === "recent_fail") {
      console.log(chalk.red("❌ Latest AgentStatus entry failed"));
      issues.push("Latest AgentStatus entry failed.");
    } else {
      console.log(chalk.red("❌ No AgentStatus entries found"));
      issues.push("No AgentStatus entries found.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`❌ AgentStatus check failed: ${message}`));
    issues.push(`AgentStatus check failed: ${message}`);
  }

  try {
    const tracked = await countTrackedProjects(supabaseClient);
    const freshnessNote =
      tracked.skipped
        ? "skipped (columns missing)"
        : tracked.total > 0
        ? `${tracked.fresh}/${tracked.total} tracked projects refreshed <24h`
        : "no tracked projects";

    if (tracked.skipped) {
      console.log(chalk.yellow(`⚠️  Tracked projects check skipped (columns missing)`));
    } else {
      const color = tracked.total > 0 && tracked.fresh === 0 ? chalk.red : chalk.green;

      if (tracked.total > 0 && tracked.fresh === 0) {
        issues.push("No tracked projects refreshed in the last 24h.");
      }
      console.log(color(`✅ Tracked projects: ${freshnessNote}`));
    }
  } catch (error) {
    const message = extractErrorMessage(error);
    console.log(chalk.red(`❌ Tracked project check failed: ${message}`));
    issues.push(`Tracked project check failed: ${message}`);
  }

  try {
    const feedOk = await checkVaultFeed(supabaseClient);
    if (feedOk) {
      console.log(chalk.green("✅ Vault feed query succeeded"));
    } else {
      console.log(chalk.red("❌ Vault feed returned unexpected data"));
      issues.push("Vault feed returned unexpected data.");
    }
  } catch (error) {
    const message = extractErrorMessage(error);
    console.log(chalk.red(`❌ Vault feed check failed: ${message}`));
    issues.push(`Vault feed check failed: ${message}`);
  }

  if (issues.length > 0) {
    console.log("");
    console.log(chalk.red("❌ System verification encountered issues:"));
    for (const issue of issues) {
      console.log(`- ${issue}`);
    }
    process.exitCode = 1;
  } else {
    console.log("");
    console.log(chalk.green("✅ All system checks passed."));
  }
}

main().catch((error) => {
  console.error(
    chalk.red(
      `❌ Verification script crashed: ${
        error instanceof Error ? error.stack ?? error.message : String(error)
      }`
    )
  );
  process.exit(1);
});
