#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { evaluateDiagnostics } from "../diagnostics/offlineFallback.mjs";

const FALLBACK_LOG_PATH = path.join(
  process.cwd(),
  "logs",
  "agentstatus-fallback.json"
);

const ANSI_REGEX = /\x1B\[[0-9;]*m/g;

function stripColors(value) {
  if (!value) return "";
  return value.replace(ANSI_REGEX, "");
}

async function main() {
  const diagnostics = await evaluateDiagnostics();
  const supabaseClient = getSupabaseClient();
  let entries = [];
  let source = "supabase";

  if (diagnostics.status === "online" && supabaseClient) {
    const supabaseEntries = await fetchSupabaseEntries(supabaseClient);
    if (supabaseEntries.ok) {
      entries = supabaseEntries.entries;
    } else {
      source = "fallback";
      entries = await readFallbackEntries();
      if (entries.length === 0) {
        console.error(
          chalk.red(
            `âŒ Unable to load AgentStatus from Supabase (${supabaseEntries.error}).`
          )
        );
        console.error(chalk.red("No fallback logs available."));
        process.exit(1);
      }
    }
  } else {
    source = "fallback";
    entries = await readFallbackEntries();
    if (entries.length === 0) {
      console.log(
        chalk.yellow(
          `âš ï¸  Diagnostics report ${diagnostics.status}. No fallback logs found.`
        )
      );
      process.exit(0);
    }
  }

  const sorted = entries
    .map(normalizeEntry)
    .filter((entry) => entry.timestamp)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

  if (sorted.length === 0) {
    console.log(chalk.yellow("âš ï¸  No AgentStatus entries to display."));
    process.exit(0);
  }

  printHeader(diagnostics, source);
  printTable(sorted);
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    null;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchSupabaseEntries(client) {
  try {
    const { data, error } = await client
      .from("AgentStatus")
      .select(
        "id, idea, stage, run_type, success, passed, error_log, summary, last_run"
      )
      .order("last_run", { ascending: false })
      .limit(20);

    if (error) {
      return { ok: false, error: error.message ?? "supabase-error" };
    }

    return { ok: true, entries: data ?? [] };
  } catch (error) {
    return { ok: false, error: formatError(error) };
  }
}

async function readFallbackEntries() {
  try {
    await fs.access(FALLBACK_LOG_PATH);
  } catch {
    return [];
  }

  const content = await fs.readFile(FALLBACK_LOG_PATH, "utf8");
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // ignore malformed lines
    }
  }

  return entries;
}

function normalizeEntry(raw) {
  const summaryData = parseSummary(raw.summary);
  const timestamp =
    raw.last_run ??
    raw.fallback_at ??
    summaryData?.timestamp ??
    new Date().toISOString();

  return {
    id: raw.id ?? `fallback-${timestamp}-${Math.random()}`,
    idea: raw.idea ?? "unknown",
    stage: raw.stage ?? "unknown",
    runType: raw.run_type ?? "cli",
    success: Boolean(raw.success),
    passed: raw.passed ?? raw.success ?? false,
    errorLog: raw.error_log ?? null,
    summary: summaryData,
    validationScore: extractValidationScore(summaryData),
    timestamp: new Date(timestamp),
  };
}

function parseSummary(summary) {
  if (!summary || typeof summary !== "string") return null;
  try {
    return JSON.parse(summary);
  } catch {
    return { raw: summary };
  }
}

function extractValidationScore(summary) {
  if (!summary || typeof summary !== "object") {
    return null;
  }

  if (
    typeof summary.validationScore === "number" &&
    !Number.isNaN(summary.validationScore)
  ) {
    return summary.validationScore;
  }

  if (
    typeof summary.score === "number" &&
    !Number.isNaN(summary.score)
  ) {
    return summary.score;
  }

  if (
    typeof summary.average_score === "number" &&
    !Number.isNaN(summary.average_score)
  ) {
    return summary.average_score;
  }

  return null;
}

function printHeader(diagnostics, source) {
  console.log(
    chalk.bold(
      `\nRealwebwins AgentStatus Dashboard â€” diagnostics: ${diagnostics.status.toUpperCase()} (source: ${source})`
    )
  );
  if (diagnostics.reasons?.length) {
    console.log(chalk.gray(`Reasons: ${diagnostics.reasons.join(", ")}`));
  }
  console.log("");
}

function printTable(entries) {
  const header = formatRow({
    time: chalk.gray("Time"),
    idea: chalk.gray("Idea"),
    stage: chalk.gray("Stage"),
    run: chalk.gray("Run"),
    status: chalk.gray("Status"),
    val: chalk.gray("Val"),
    detail: chalk.gray("Summary / Notes"),
  });
  console.log(header);
  console.log(chalk.gray("-".repeat(header.length)));

  for (const entry of entries) {
    const row = buildRow(entry);
    console.log(formatRow(row));
  }

  console.log("");
}

function buildRow(entry) {
  const time = entry.timestamp.toISOString().replace("T", " ").replace("Z", "");
  const ideaLabel = entry.idea;
  const stageLabel = entry.stage;
  const runType = entry.runType ?? "n/a";

  const { icon, color } = statusIcon(entry);

  const validationScore = deriveValidationScore(entry);
  const scoreDisplay =
    typeof validationScore === "number" ? validationScore.toString() : "-";

  const summaryText = summarizeEntry(entry, validationScore);

  return {
    time: color(time),
    idea: color(ideaLabel),
    stage: color(stageLabel),
    run: color(runType),
    status: color(icon),
    val: color(scoreDisplay),
    detail: color(summaryText),
  };
}

function summarizeEntry(entry, validationScore) {
  const parts = [];
  if (typeof validationScore === "number") {
    parts.push(`score:${validationScore}`);
  }
  if (entry.summary) {
    if (typeof entry.summary === "object") {
      if ("status" in entry.summary) {
        parts.push(`status:${entry.summary.status}`);
      }
      if ("projects_checked" in entry.summary) {
        parts.push(
          `P:${entry.summary.projects_checked} R:${entry.summary.refreshed ?? 0} S:${entry.summary.simulated ?? 0} F:${entry.summary.failures ?? 0}`
        );
      }
      if ("reasons" in entry.summary && Array.isArray(entry.summary.reasons)) {
        parts.push(`reasons:${entry.summary.reasons.join(",")}`);
      }
      if ("raw" in entry.summary) {
        parts.push(entry.summary.raw);
      }
    } else {
      parts.push(entry.summary);
    }
  }

  if (entry.errorLog) {
    parts.push(`err:${entry.errorLog}`);
  }

  if (parts.length === 0) {
    parts.push("no-details");
  }

  return parts.join(" | ");
}


function deriveValidationScore(entry) {
  if (typeof entry.validationScore === "number" && !Number.isNaN(entry.validationScore)) {
    return entry.validationScore;
  }
  if (entry.summary && typeof entry.summary === "object") {
    if (
      typeof entry.summary.validationScore === "number" &&
      !Number.isNaN(entry.summary.validationScore)
    ) {
      return entry.summary.validationScore;
    }
    if (
      typeof entry.summary.score === "number" &&
      !Number.isNaN(entry.summary.score)
    ) {
      return entry.summary.score;
    }
    if (
      typeof entry.summary.average_score === "number" &&
      !Number.isNaN(entry.summary.average_score)
    ) {
      return entry.summary.average_score;
    }
  }
  return null;
}
function statusIcon(entry) {
  if (entry.passed) {
    return { icon: "OK", color: chalk.green };
  }

  if (
    entry.stage.includes("offline") ||
    entry.summary?.status === "network-degraded" ||
    entry.summary?.status === "partial"
  ) {
    return { icon: "WARN", color: chalk.yellow };
  }

  return { icon: "FAIL", color: chalk.red };
}

function formatRow(row) {
  const columns = [
    pad(row.time, 24),
    pad(row.idea, 20),
    pad(row.stage, 16),
    pad(row.run, 8),
    pad(row.status, 6),
    pad(row.val, 6),
    row.detail,
  ];

  return columns.join("  ");
}

function pad(value, width) {
  const plain = stripColors(value ?? "");
  if (plain.length >= width) {
    return value;
  }
  return value + " ".repeat(width - plain.length);
}

function formatError(error) {
  if (!error) return "unknown-error";
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

main().catch((error) => {
  console.error(chalk.red(formatError(error)));
  process.exit(1);
});








