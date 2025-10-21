import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { fetchVaultFeed } from "@/lib/vaultData";

export const dynamic = "force-dynamic";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const FALLBACK_LOG_PATH = path.join(
  process.cwd(),
  "logs",
  "agentstatus-fallback.json"
);
const REQUIRED_ENV_VARS = [
  "AI_PROVIDER",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_PLAUSIBLE_DOMAIN",
];

interface VerificationSummary {
  supabase: string;
  agentStatus: string;
  trackedProjects: number;
  trackedProjectsTotal: number;
  trackedProjectsNote?: string;
  vaultFeed: string;
  aiProvider: string | null;
  missingEnv: string[];
}

interface DiagnosticsResult {
  status: "online" | "partial" | "offline";
  reasons: string[];
  timestamp: string;
}

type RunType = "cron" | "cli";

interface AgentLogPayload {
  idea: string;
  stage: string;
  run_type: RunType;
  success: boolean;
  passed?: boolean;
  error_log?: string | null;
  summary?: string | null;
}

async function logAgentStatusEntry(
  supabase: ReturnType<typeof getSupabaseAdminClient> | null,
  entry: AgentLogPayload
): Promise<void> {
  const payload = {
    ...entry,
    passed: entry.passed ?? entry.success,
    error_log: truncate(entry.error_log),
    summary: truncate(entry.summary),
  };

  let lastError: unknown = null;

  if (supabase) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const { error } = await supabase.from("AgentStatus").insert([payload]);
        if (!error) {
          return;
        }
        lastError = error;
      } catch (error) {
        lastError = error;
      }
    }
  }

  await writeFallbackLog({
    ...payload,
    fallback_at: new Date().toISOString(),
    fallback_error: lastError ? formatError(lastError) : "supabase unavailable",
  });
}

async function writeFallbackLog(entry: Record<string, unknown>): Promise<void> {
  try {
    await fs.mkdir(path.dirname(FALLBACK_LOG_PATH), { recursive: true });
    await fs.appendFile(FALLBACK_LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (error) {
    console.warn(
      "[cron.verify] Unable to write AgentStatus fallback log:",
      formatError(error)
    );
  }
}

function createSummary(details: Record<string, unknown>): string {
  return JSON.stringify({
    ...details,
    timestamp: new Date().toISOString(),
  });
}

function truncate(value?: string | null, length = 1000): string | null {
  if (!value) return null;
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

function formatError(error: unknown): string {
  if (!error) return "Unknown error";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Use POST for verification.",
      durationMs: 0,
    },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    }
  );
}

export async function POST() {
  const startedAt = Date.now();
  const diagnostics = await getDiagnostics();
  const baseSummary: VerificationSummary = {
    supabase: "unknown",
    agentStatus: "unknown",
    trackedProjects: 0,
    trackedProjectsTotal: 0,
    trackedProjectsNote: undefined,
    vaultFeed: "unknown",
    aiProvider: process.env.AI_PROVIDER ?? null,
    missingEnv: findMissingEnv(),
  };

  let supabase: ReturnType<typeof getSupabaseAdminClient> | null = null;
  let supabaseInitError: string | null = null;

  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    supabaseInitError = formatError(error);
  }

  const offlineTriggered =
    diagnostics.status !== "online" || Boolean(supabaseInitError);

  if (supabaseInitError && !diagnostics.reasons.includes(supabaseInitError)) {
    diagnostics.reasons.push(`client-init:${supabaseInitError}`);
  }

  if (offlineTriggered) {
    const summary = buildOfflineVerificationSummary(baseSummary, diagnostics);
    await logAgentStatusEntry(supabase, {
      idea: "system-verification",
      stage: "offline-fallback",
      run_type: "cron",
      success: false,
      passed: false,
      error_log: truncate(
        diagnostics.reasons.join("; ") || supabaseInitError || "offline"
      ),
      summary: createSummary({
        status: diagnostics.status,
        reasons: diagnostics.reasons,
      }),
    });

    return NextResponse.json({
      success: false,
      summary,
      diagnostics,
      durationMs: Date.now() - startedAt,
    });
  }

  const summary = baseSummary;
  let success = true;

  // Supabase connectivity check
  try {
    const supabaseCheck = await supabase!
      .from("research_projects")
      .select("id", { count: "exact", head: true });

    if (supabaseCheck.error) {
      throw supabaseCheck.error;
    }

    summary.supabase = "ok";
    summary.trackedProjectsTotal = supabaseCheck.count ?? 0;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Supabase connectivity failed.";
    console.error("[cron.verify] Supabase connectivity check failed:", error);
    summary.supabase = `error: ${message}`;
    success = false;
  }

  // AgentStatus freshness
  try {
    const { data, error } = await supabase!
      .from("AgentStatus")
      .select("last_run, stage, success")
      .order("last_run", { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    const entry = data?.[0];
    if (!entry?.last_run) {
      summary.agentStatus = "missing";
      success = false;
    } else {
      const lastRun = new Date(entry.last_run).getTime();
      const ageMs = Date.now() - lastRun;
      if (Number.isNaN(lastRun) || ageMs > TWENTY_FOUR_HOURS_MS) {
        summary.agentStatus = `stale (${Math.round(ageMs / (60 * 60 * 1000))}h)`;
        success = false;
      } else if (!entry.success) {
        summary.agentStatus = "recent_fail";
        success = false;
      } else {
        summary.agentStatus = "ok";
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AgentStatus query failed.";
    console.error("[cron.verify] AgentStatus check failed:", error);
    summary.agentStatus = `error: ${message}`;
    success = false;
  }

  // Tracked projects freshness
  let trackedCheckSkipped = false;

  try {
    const thresholdIso = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();

    const trackedCountResult = await supabase!
      .from("research_projects")
      .select("id", { count: "exact", head: true })
      .eq("is_tracked", true);

    if (trackedCountResult.error) {
      if (isMissingColumnError(trackedCountResult.error, trackedCountResult.status)) {
        trackedCheckSkipped = true;
        summary.trackedProjectsNote = "skipped (columns missing)";
        summary.trackedProjectsTotal = 0;
      } else {
        throw trackedCountResult.error;
      }
    }

    if (!trackedCheckSkipped) {
      summary.trackedProjectsTotal = trackedCountResult.count ?? 0;
    }

    if (!trackedCheckSkipped && summary.trackedProjectsTotal > 0) {
      const freshResult = await supabase!
        .from("research_projects")
        .select("id", { count: "exact", head: true })
        .eq("is_tracked", true)
        .gte("last_refreshed_at", thresholdIso);

      if (freshResult.error) {
        if (isMissingColumnError(freshResult.error, freshResult.status)) {
          trackedCheckSkipped = true;
          summary.trackedProjectsNote = "skipped (columns missing)";
          summary.trackedProjectsTotal = 0;
        } else {
          throw freshResult.error;
        }
      }

      if (!trackedCheckSkipped) {
        summary.trackedProjects = freshResult.count ?? 0;
        if (summary.trackedProjects === 0) {
          success = false;
        }
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Tracked project check failed.";
    console.error("[cron.verify] Tracked project check failed:", message, error);
    summary.trackedProjects = 0;
    success = false;
  }

  // Vault feed validation
  try {
    const feed = await fetchVaultFeed({ limit: 5 });
    summary.vaultFeed = Array.isArray(feed) ? "ok" : "unexpected";
    if (!Array.isArray(feed)) {
      success = false;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Vault feed query failed.";
    console.error("[cron.verify] Vault feed check failed:", message, error);
    summary.vaultFeed = `error: ${message}`;
    success = false;
  }

  if (summary.missingEnv.length > 0) {
    success = false;
  }

  await logVerificationStatus({
    supabase: supabase!,
    success,
    summary,
  });

  return NextResponse.json({
    success,
    summary,
    diagnostics,
    durationMs: Date.now() - startedAt,
  });
}

function findMissingEnv(): string[] {
  return REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key];
    return !value || String(value).trim().length === 0;
  });
}

async function logVerificationStatus({
  supabase,
  success,
  summary,
}: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  success: boolean;
  summary: VerificationSummary;
}) {
  await logAgentStatusEntry(supabase, {
    idea: "system-verification",
    stage: "verify",
    run_type: "cron",
    success,
    passed: success,
    error_log: success ? null : truncate(JSON.stringify(summary)),
    summary: createSummary({
      supabase: summary.supabase,
      agentStatus: summary.agentStatus,
      trackedProjects: summary.trackedProjects,
      trackedProjectsTotal: summary.trackedProjectsTotal,
      vaultFeed: summary.vaultFeed,
      missingEnv: summary.missingEnv,
    }),
  });
}

function isMissingColumnError(
  error: unknown,
  status?: number
): boolean {
  if (status === 400 && error && typeof error === "object" && !(error as { message?: string }).message) {
    return true;
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "42703"
  ) {
    return true;
  }

  const message = extractErrorMessage(error);
  return message.toLowerCase().includes("column");
}

function extractErrorMessage(error: unknown): string {
  if (!error) {
    return "Unknown error";
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object") {
    const maybeMessage = (error as { message?: string }).message;
    const maybeDetails = (error as { details?: string }).details;
    const maybeHint = (error as { hint?: string }).hint;
    const maybeCode = (error as { code?: string }).code;

    const parts = [
      maybeMessage,
      maybeDetails,
      maybeHint,
      maybeCode ? `code=${maybeCode}` : null,
    ].filter((part): part is string => Boolean(part && part.length > 0));

    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function getDiagnostics(): Promise<DiagnosticsResult> {
  try {
    const diagnosticsModule = (await import(
      "../../../../../diagnostics/offlineFallback.mjs"
    )) as {
      evaluateDiagnostics: () => Promise<DiagnosticsResult>;
    };
    return await diagnosticsModule.evaluateDiagnostics();
  } catch (error) {
    return {
      status: "partial",
      reasons: [`diagnostics-error:${formatError(error)}`],
      timestamp: new Date().toISOString(),
    };
  }
}

function buildOfflineVerificationSummary(
  base: VerificationSummary,
  diagnostics: DiagnosticsResult
): VerificationSummary {
  return {
    ...base,
    supabase: `offline (${diagnostics.reasons.join(", ") || "unavailable"})`,
    agentStatus: "unknown",
    trackedProjects: 0,
    trackedProjectsTotal: 0,
    trackedProjectsNote: "offline fallback",
    vaultFeed: "offline",
  };
}
