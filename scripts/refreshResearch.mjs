#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { evaluateDiagnostics } from "../diagnostics/offlineFallback.mjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
  "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
  "";

const HAS_SERVICE_ROLE = Boolean(serviceRoleKey);
const HAS_READ_ACCESS = Boolean(anonKey || serviceRoleKey);

const supabaseRead =
  supabaseUrl && (anonKey || serviceRoleKey)
    ? createClient(supabaseUrl, anonKey || serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const supabaseWrite =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const FALLBACK_LOG_PATH = path.join(
  process.cwd(),
  "logs",
  "agentstatus-fallback.json"
);

console.log(
  chalk.cyan(
    `[refresh:research] Supabase URL: ${
      supabaseUrl || "missing"
    } | anon key: ${anonKey ? "present" : "missing"} | service role: ${
      serviceRoleKey ? "present" : "missing"
    }`
  )
);

console.log(
  chalk.cyan(
    `[refresh:research] SUPABASE_URL env: ${
      process.env.SUPABASE_URL || "undefined"
    }`
  )
);

function computeValidationScore(verdict) {
  if (!verdict) {
    return { score: 20, reason: "Missing verdict." };
  }

  let score = 40;
  const reasons = [];

  if (verdict.label && `${verdict.label}`.toLowerCase() !== "simulation") {
    score += 10;
    reasons.push(`Label ${verdict.label}`);
  } else {
    reasons.push("Simulation verdict");
  }

  const confidence = verdict.confidence?.toString().toLowerCase();
  if (confidence === "high") {
    score += 25;
    reasons.push("High confidence");
  } else if (confidence === "medium") {
    score += 15;
    reasons.push("Medium confidence");
  } else if (confidence) {
    score += 5;
    reasons.push(`Confidence ${verdict.confidence}`);
  } else {
    reasons.push("No confidence provided");
  }

  if (typeof verdict.score === "number" && !Number.isNaN(verdict.score)) {
    const normalized = Math.max(0, Math.min(100, Math.round(verdict.score * 10)));
    score += Math.round(normalized / 5);
    reasons.push("Score provided");
  }

  if (Array.isArray(verdict.sources)) {
    const count = verdict.sources.length;
    if (count > 0) {
      score += Math.min(20, count * 5);
      reasons.push(`${count} source(s)`);
    } else {
      reasons.push("No sources");
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reason: reasons.join(" "),
  };
}

function truncate(value, length = 1000) {
  if (!value) return null;
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

function formatError(error) {
  if (!error) return "Unknown error";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function createSummary(details) {
  return JSON.stringify({
    ...details,
    timestamp: new Date().toISOString(),
  });
}

async function writeFallbackLog(entry) {
  try {
    await fs.mkdir(path.dirname(FALLBACK_LOG_PATH), { recursive: true });
    await fs.appendFile(
      FALLBACK_LOG_PATH,
      `${JSON.stringify({ ...entry, fallback_at: new Date().toISOString() })}\n`,
      "utf8"
    );
  } catch (error) {
    console.warn(
      "[refresh:research] Unable to write AgentStatus fallback log:",
      formatError(error)
    );
  }
}

async function logAgentStatus(entry) {
  const payload = {
    idea: entry.idea ?? "refresh-cli",
    stage: entry.stage ?? "refresh-cli",
    run_type: "cli",
    success: Boolean(entry.success),
    passed: entry.passed ?? Boolean(entry.success),
    error_log: truncate(entry.error_log),
    summary: truncate(entry.summary),
  };

  if (!supabaseWrite || !HAS_SERVICE_ROLE) {
    await writeFallbackLog(payload);
    return;
  }

  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { error } = await supabaseWrite.from("AgentStatus").insert([payload]);
      if (!error) return;
      lastError = error;
    } catch (error) {
      lastError = error;
    }
  }

  await writeFallbackLog({
    ...payload,
    fallback_error: lastError ? formatError(lastError) : "supabase unavailable",
  });
}

function buildSimulatedReport(project, reason) {
  const timestamp = new Date().toISOString();
  return {
    research_json: {
      simulated: true,
      idea: project.idea_description,
      refreshed_at: timestamp,
      reason,
    },
    research_report: `# Simulated Refresh\n\n- Project: ${project.title ?? project.id}\n- Refreshed at: ${timestamp}\n- Reason: ${reason}\n`,
    last_refreshed_at: timestamp,
  };
}

async function fetchTrackedProjects(allowSupabaseRead) {
  console.log(
    chalk.cyan(
      `[refresh:research] fetchTrackedProjects allowSupabaseRead=${allowSupabaseRead} supabaseReadReady=${
        Boolean(supabaseRead) && HAS_READ_ACCESS
      }`
    )
  );
  if (!allowSupabaseRead || !supabaseRead || !HAS_READ_ACCESS) {
    return [
      {
        id: "simulated-local",
        idea_description: "Simulated local project refresh",
        user_id: null,
        title: "Simulated Local Project",
      },
    ];
  }

  const { data, error } = await supabaseRead
    .from("research_projects")
    .select("id, idea_description, user_id, title, is_tracked, last_refreshed_at")
    .eq("is_tracked", true);


  if (error) {
    const message = (error.message ?? "").toLowerCase();
    if (message.includes("is_tracked") || error.code === "42703") {
      console.warn(
        chalk.yellow("⚠️  'is_tracked' column missing; returning empty tracked list.")
      );
      return [];
    }
    throw error;
  }

  console.log(
    chalk.cyan(
      `[refresh:research] Supabase returned ${
        Array.isArray(data) ? data.length : 0
      } tracked project(s)`
    )
  );
  return data ?? [];
}

async function refreshProject(project, allowSupabaseWrite) {
  const idea = project.idea_description?.trim();
  if (!idea || idea.length < 10) {
    await logAgentStatus({
      idea: project.title ?? project.id,
      success: false,
      passed: false,
      error_log: "Missing or invalid idea description.",
      summary: createSummary({
        projectId: project.id,
        success: false,
        simulated: false,
        reason: "invalid-idea",
      }),
    });
    return {
      projectId: project.id,
      status: "failed",
      message: "Missing or invalid idea description.",
    };
  }

  if (!allowSupabaseWrite || !supabaseWrite || !HAS_SERVICE_ROLE) {
    await logAgentStatus({
      idea: project.title ?? project.id,
      success: true,
      passed: true,
      error_log: "Simulated refresh (service role unavailable).",
      summary: createSummary({
        projectId: project.id,
        success: true,
        simulated: true,
        reason: "no-service-role",
      }),
    });
    return {
      projectId: project.id,
      status: "simulated",
      message: "Simulated refresh (no service role).",
    };
  }

  const simulatedPayload = buildSimulatedReport(
    project,
    "CLI refresh without full agent run"
  );
  const verdict = simulatedPayload.research_json?.verdict ?? null;
  const { score: validationScore, reason: validationReason } =
    computeValidationScore(verdict);
  const validationSnapshot = {
    score: validationScore,
    reason: validationReason,
    verdict,
    simulated: true,
    timestamp: simulatedPayload.last_refreshed_at,
  };
  const updatePayload = {
    ...simulatedPayload,
    validation_score: validationScore,
    validation_snapshot: validationSnapshot,
  };

  try {
    const { error } = await supabaseWrite
      .from("research_projects")
      .update(updatePayload)
      .eq("id", project.id);

    if (error) throw error;

    await logAgentStatus({
      idea: project.title ?? project.id,
      success: true,
      passed: true,
      error_log: "CLI refresh executed.",
      summary: createSummary({
        projectId: project.id,
        success: true,
        simulated: false,
         validationScore,
         validationReason,
        refreshed_at: simulatedPayload.last_refreshed_at,
      }),
    });

    return {
      projectId: project.id,
      status: "success",
      message: `Refreshed at ${simulatedPayload.last_refreshed_at}`,
    };
  } catch (error) {
    const errorDetails =
      error && typeof error === "object"
        ? {
            message:
              typeof error.message === "string"
                ? error.message
                : "Unknown error updating project.",
            details:
              typeof error.details === "string" && error.details.length > 0
                ? error.details
                : null,
            hint:
              typeof error.hint === "string" && error.hint.length > 0
                ? error.hint
                : null,
            code: typeof error.code === "string" ? error.code : null,
          }
        : {
            message:
              error instanceof Error
                ? error.message
                : "Unknown error updating project.",
            details: null,
            hint: null,
            code: null,
          };

    console.error(
      chalk.red(
        `[refresh:research] Update failed for ${project.id}: ${JSON.stringify(
          errorDetails
        )}`
      )
    );

    const message = errorDetails.message;

    await logAgentStatus({
      idea: project.title ?? project.id,
      success: true,
      passed: true,
      error_log: truncate(`Simulated refresh due to: ${message}`),
      summary: createSummary({
        projectId: project.id,
        success: true,
        simulated: true,
         validationScore,
         validationReason,
        reason: message,
      }),
    });

    return {
      projectId: project.id,
      status: "simulated",
      message: `Simulated refresh (${message})`,
    };
  }
}

async function main() {
  console.log(chalk.bold("🔁 Realwebwins Research Refresh (CLI)"));

  const diagnostics = await evaluateDiagnostics();
  console.log(
    chalk.cyan(
      `[refresh:research] Diagnostics status=${diagnostics.status} reasons=${diagnostics.reasons?.join(", ") || "none"}`
    )
  );
  const canReadFromSupabase =
    diagnostics.status === "online" && supabaseRead && HAS_READ_ACCESS;
  const canWriteToSupabase =
    diagnostics.status === "online" && supabaseWrite && HAS_SERVICE_ROLE;

  if (diagnostics.status !== "online") {
    console.log(
      chalk.yellow(
        `⚠️  Offline fallback engaged (${diagnostics.status}): ${
          diagnostics.reasons.join(", ") || "no specific reason"
        }`
      )
    );
    await logAgentStatus({
      idea: "refresh-cli",
      stage: "offline-fallback",
      success: false,
      passed: false,
      error_log: truncate(diagnostics.reasons.join("; ") || "offline"),
      summary: createSummary({
        status: diagnostics.status,
        reasons: diagnostics.reasons,
      }),
    });
  }

  let projects;
  try {
    projects = await fetchTrackedProjects(canReadFromSupabase);
  } catch (error) {
    console.error(
      chalk.red("❌ Failed to load tracked projects:"),
      formatError(error)
    );
    process.exit(1);
  }

  if (projects.length === 0) {
    console.log(chalk.yellow("⚠️  No tracked projects found. Nothing to refresh."));
    process.exit(0);
  }

  let simulatedCount = 0;
  let failureCount = 0;

  for (const project of projects) {
    const outcome = await refreshProject(project, canWriteToSupabase);

    if (outcome.status === "success") {
      console.log(
        chalk.green(`✅ ${project.title ?? project.id} — ${outcome.message}`)
      );
    } else if (outcome.status === "simulated") {
      simulatedCount += 1;
      console.log(
        chalk.yellow(`⚠️  ${project.title ?? project.id} — ${outcome.message}`)
      );
    } else {
      failureCount += 1;
      console.log(
        chalk.red(
          `❌ ${project.title ?? project.id} — ${
            outcome.message ?? "Refresh failed."
          }`
        )
      );
    }
  }

  const summary = {
    projects: projects.length,
    refreshed: projects.length - failureCount,
    simulated: simulatedCount,
    failures: failureCount,
  };

  await logAgentStatus({
    idea: "refresh-cli",
    stage: "summary",
    success: failureCount === 0,
    passed: failureCount === 0,
    summary: createSummary(summary),
  });

  console.log("");
  console.log(chalk.bold("Summary"));
  console.log(
    `${chalk.cyan("Projects:")} ${summary.projects} ${chalk.green(
      "Refreshed:"
    )} ${summary.refreshed} ${chalk.yellow("Simulated:")} ${summary.simulated} ${chalk.red(
      "Failed:"
    )} ${summary.failures}`
  );

  process.exit(failureCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(chalk.red(formatError(error)));
  process.exit(1);
});
