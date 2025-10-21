import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import runResearchAgent from "@/agents/runResearchAgent";
import computeValidationScore from "@/lib/validation/computeScore";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

interface TrackedProject {
  id: string;
  idea_description: string | null;
  user_id: string | null;
  title: string | null;
}

interface RefreshResult {
  projectId: string;
  success: boolean;
  message?: string;
  simulated?: boolean;
  validationScore?: number | null;
  validationReason?: string | null;
}

interface RefreshSummary {
  projects_checked: number;
  refreshed: number;
  simulated: number;
  failures: number;
  status: string;
  results: RefreshResult[];
  average_score?: number | null;
}

interface DiagnosticsResult {
  status: "online" | "partial" | "offline";
  reasons: string[];
  timestamp: string;
}

interface SlackAlertInput {
  webhookUrl: string;
  summary: RefreshSummary;
  diagnostics: DiagnosticsResult;
  triggeredAt: string;
}

interface EmailAlertInput {
  apiKey: string;
  to: string;
  from: string;
  summary: RefreshSummary;
  diagnostics: DiagnosticsResult;
  triggeredAt: string;
}

type NotifyModule = {
  sendSlackAlert: (args: SlackAlertInput) => Promise<{ success: boolean; error?: string }>;
  sendEmailAlert: (args: EmailAlertInput) => Promise<{ success: boolean; error?: string }>;
};

const MAX_ATTEMPTS = 3;
const FALLBACK_LOG_PATH = path.join(
  process.cwd(),
  "logs",
  "agentstatus-fallback.json"
);

type RunType = "cron" | "cli";

interface AgentStatusEntryPayload {
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
  entry: AgentStatusEntryPayload
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
    await fs.appendFile(
      FALLBACK_LOG_PATH,
      `${JSON.stringify(entry)}\n`,
      "utf8"
    );
  } catch (error) {
    console.warn(
      "[cron.research-refresh] Unable to write AgentStatus fallback log:",
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
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && "message" in (error as Record<string, unknown>)) {
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
      updated: 0,
      message: "Use POST to trigger refresh.",
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
  const localMode = process.env.NODE_ENV !== "production";
  const diagnostics = await getDiagnostics();
  const offlineDetected = diagnostics.status !== "online";

  if (offlineDetected) {
    await logAgentStatusEntry(null, {
      idea: "auto-refresh",
      stage: "offline-fallback",
      run_type: "cron",
      success: false,
      passed: false,
      error_log: truncate(diagnostics.reasons.join("; ") || "offline"),
      summary: createSummary({
        status: diagnostics.status,
        reasons: diagnostics.reasons,
        source: "diagnostics",
      }),
    });
  }

  if (localMode || offlineDetected) {
    const summary = buildLocalSummary(diagnostics);
    await handleAlerts(null, summary, diagnostics);
    return NextResponse.json({
      ...summary,
      success: summary.failures === 0,
      diagnostics,
      durationMs: Date.now() - startedAt,
    });
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await performRefreshAttempt(diagnostics);
      return NextResponse.json({
        ...result,
        success: result.failures === 0 || result.status === "missing-columns" || result.status === "no-tracked",
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      lastError = error;
      console.error(
        `[cron.research-refresh] Attempt ${attempt} failed`,
        error instanceof Error ? error.message : error
      );

      if (!isTransientError(error) || attempt === MAX_ATTEMPTS) {
        break;
      }

      await waitForRetry(attempt);
    }
  }

  await logNetworkFallback();

  const fallbackSummary = buildFallbackSummary(lastError);
  await handleAlerts(null, fallbackSummary, diagnostics);

  return NextResponse.json(
    {
      ...fallbackSummary,
      success: false,
      durationMs: Date.now() - startedAt,
    },
    { status: 503 }
  );
}

async function performRefreshAttempt(
  diagnostics: DiagnosticsResult
): Promise<RefreshSummary> {
  const supabase = getSupabaseAdminClient();
  const { projects, missingColumn } = await fetchTrackedProjects(supabase);

  if (missingColumn) {
    const summary: RefreshSummary = {
      projects_checked: 0,
      refreshed: 0,
      simulated: 0,
      failures: 0,
      status: "missing-columns",
      results: [],
    };
    await logRunSummary({ supabase, summary, error: "Tracked columns missing" });
    await handleAlerts(supabase, summary, diagnostics);
    return summary;
  }

  if (!projects || projects.length === 0) {
    const summary: RefreshSummary = {
      projects_checked: 0,
      refreshed: 0,
      simulated: 0,
      failures: 0,
      status: "no-tracked",
      results: [],
    };
    await logRunSummary({ supabase, summary });
    await handleAlerts(supabase, summary, diagnostics);
    return summary;
  }

  const results: RefreshResult[] = [];
  const validationSnapshots: Array<{ projectId: string; score: number | null; reason: string | null }> = [];
  let refreshedCount = 0;
  let simulatedCount = 0;
  let failureCount = 0;

  for (const project of projects) {
    const idea = project.idea_description?.trim();

    if (!idea || idea.length < 10) {
      const warning = `Skipping project ${project.id} due to missing idea description.`;
      console.warn("[cron.research-refresh]", warning);
      failureCount += 1;
      validationSnapshots.push({
        projectId: project.id,
        score: null,
        reason: "invalid-idea",
      });
      results.push({
        projectId: project.id,
        success: false,
        message: "Missing or invalid idea description.",
        validationScore: null,
        validationReason: "invalid-idea",
      });
      await logProjectStatus({
        supabase,
        projectId: project.id,
        success: false,
        validationScore: null,
        validationReason: "invalid-idea",
        message: `Missing or invalid idea description for project ${project.id}.`,
        error: "Missing or invalid idea description.",
      });
      continue;
    }

    try {
      const agentResult = await runResearchAgent(
        {
          id: project.id,
          idea_description: project.idea_description,
          title: project.title,
        },
        { runType: "cron" }
      );
      const refreshedAt = agentResult.completedAt ?? new Date().toISOString();
      const insights = agentResult.insights ?? null;
      const reportMarkdown =
        typeof agentResult.reportMarkdown === "string"
          ? agentResult.reportMarkdown
          : JSON.stringify(agentResult.insights ?? {}, null, 2);
      const verdictData = extractVerdict(insights);
      const { score: validationScore, reason: validationReason } =
        computeValidationScore(verdictData);
      const validationSnapshot = {
        score: validationScore,
        reason: validationReason,
        verdict: verdictData,
        simulated: agentResult.simulated,
        timestamp: refreshedAt,
      };

      validationSnapshots.push({
        projectId: project.id,
        score:
          typeof validationScore === "number"
            ? Math.max(0, Math.min(100, validationScore))
            : null,
        reason: validationReason ?? null,
      });

      await updateProjectRecord({
        supabase,
        projectId: project.id,
        insights,
        reportMarkdown,
        refreshedAt,
        validationScore,
        validationSnapshot,
      });

      await uploadReport({
        supabase,
        projectId: project.id,
        payload: {
          projectId: project.id,
          userId: project.user_id,
          ideaDescription: idea,
          insights,
          reportMarkdown,
          refreshedAt,
          simulated: agentResult.simulated,
          validationSnapshot,
        },
      });

      refreshedCount += 1;
      if (agentResult.simulated) {
        simulatedCount += 1;
      }

      await logProjectStatus({
        supabase,
        projectId: project.id,
        success: true,
        simulated: agentResult.simulated,
        validationScore: validationScore ?? null,
        validationReason,
        message: `Refreshed project ${project.id}${agentResult.simulated ? " (simulated)" : ""}.`,
      });

      results.push({
        projectId: project.id,
        success: true,
        message: agentResult.simulated ? "Simulated refresh completed." : undefined,
        simulated: agentResult.simulated,
        validationScore: validationScore ?? null,
        validationReason,
      });
    } catch (projectError) {
      const errorMessage =
        projectError instanceof Error
          ? projectError.message
          : "Unknown error while refreshing project.";

      console.error(
        `[cron.research-refresh] Failed to refresh project ${project.id}`,
        projectError
      );

      failureCount += 1;
      validationSnapshots.push({
        projectId: project.id,
        score: null,
        reason: errorMessage,
      });

      await logProjectStatus({
        supabase,
        projectId: project.id,
        success: false,
        validationScore: null,
        validationReason: errorMessage,
        error: errorMessage,
        message: `Failed to refresh project ${project.id}: ${errorMessage}`,
      });

      results.push({
        projectId: project.id,
        success: false,
        message: errorMessage,
        validationScore: null,
        validationReason: errorMessage,
      });
    }
  }

  const numericScores = validationSnapshots.filter((snapshot) => typeof snapshot.score === "number") as Array<{ projectId: string; score: number; reason: string | null }>;
  const averageScore = numericScores.length
    ? Math.round(
        numericScores.reduce((acc, snapshot) => acc + snapshot.score, 0) /
          numericScores.length
      )
    : null;

  const summary: RefreshSummary = {
    projects_checked: projects.length,
    refreshed: refreshedCount,
    simulated: simulatedCount,
    failures: failureCount,
    status: failureCount === 0 ? "ok" : "partial",
    results,
    average_score: averageScore,
  };

  await logRunSummary({
    supabase,
    summary,
    error: failureCount > 0 ? "One or more refresh tasks failed" : undefined,
  });
  await handleAlerts(supabase, summary, diagnostics);

  return summary;
}

async function fetchTrackedProjects(
  supabase: ReturnType<typeof getSupabaseAdminClient>
): Promise<{ projects: TrackedProject[]; missingColumn: boolean }> {
  const response = await supabase
    .from("research_projects")
    .select("id, idea_description, user_id, title, is_tracked")
    .eq("is_tracked", true);

  if (response.error) {
    const message = response.error.message?.toLowerCase() ?? "";
    const details = response.error.details?.toLowerCase() ?? "";
    const missingColumn =
      message.includes("is_tracked") ||
      details.includes("is_tracked") ||
      response.error.code === "42703" ||
      (response.status === 400 && !response.error.message);
    if (missingColumn) {
      console.warn(
        "[cron.research-refresh] 'is_tracked' column missing; skipping refresh run."
      );
      return { projects: [], missingColumn: true };
    }

    throw response.error;
  }

  return { projects: (response.data ?? []) as TrackedProject[], missingColumn: false };
}

function buildLocalSummary(diagnostics?: DiagnosticsResult): RefreshSummary {
  const reasons = diagnostics?.reasons?.join(", ") ?? "local simulation";
  const status = diagnostics?.status ?? "simulated-local";
  return {
    projects_checked: 1,
    refreshed: 1,
    simulated: 1,
    failures: 0,
    status,
    results: [
      {
        projectId: "local-simulated",
        success: true,
        message: `Simulated refresh (${reasons}).`,
        simulated: true,
      },
    ],
  };
}

function buildFallbackSummary(error: unknown): RefreshSummary & { error?: string } {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "network degraded fallback used";

  return {
    projects_checked: 0,
    refreshed: 0,
    simulated: 0,
    failures: 0,
    status: "network-degraded",
    results: [],
    average_score: 0,
    error: message,
  };
}

async function waitForRetry(attempt: number) {
  const delay = Math.min(500 * attempt, 2000);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

function isTransientError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === "object" && error && "status" in error) {
    const status = Number((error as { status?: number }).status);
    if (Number.isFinite(status) && status >= 500) {
      return true;
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("fetch failed") ||
      message.includes("ecconnreset") ||
      message.includes("503") ||
      message.includes("network") ||
      message.includes("rate limit")
    );
  }

  return false;
}

async function logNetworkFallback() {
  const entry: AgentStatusEntryPayload = {
    idea: "auto-refresh",
    stage: "offline-fallback",
    run_type: "cron",
    success: false,
    passed: false,
    error_log: "network degraded fallback used",
    summary: createSummary({ status: "network-degraded" }),
  };

  if (process.env.NODE_ENV !== "production") {
    console.info(
      "[cron.research-refresh] Local mode fallback engaged; writing AgentStatus fallback log."
    );
    await logAgentStatusEntry(null, entry);
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    await logAgentStatusEntry(supabase, entry);
  } catch (error) {
    console.warn(
      "[cron.research-refresh] Unable to log network fallback status to Supabase:",
      formatError(error)
    );
    await logAgentStatusEntry(null, entry);
  }
}

async function updateProjectRecord({
  supabase,
  projectId,
  insights,
  reportMarkdown,
  refreshedAt,
  validationScore,
  validationSnapshot,
}: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  projectId: string;
  insights: unknown;
  reportMarkdown: string;
  refreshedAt: string;
  validationScore: number | null;
  validationSnapshot: Record<string, unknown>;
}) {
  const verdictData = extractVerdict(insights);

  try {
    const { error } = await supabase
      .from("research_projects")
      .update({
        score: verdictData.score,
        verdict: verdictData.label,
        confidence: verdictData.confidence,
        research_json: insights,
        research_report: reportMarkdown,
        last_refreshed_at: refreshedAt,
        validation_score:
          typeof validationScore === "number"
            ? Math.max(0, Math.min(100, validationScore))
            : null,
        validation_snapshot: validationSnapshot,
      })
      .eq("id", projectId);

    if (error) {
      throw error;
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update research project record.";
    console.error(
      `[cron.research-refresh] Failed to update project record ${projectId}`,
      error
    );
    throw new Error(message);
  }
}

async function uploadReport({
  supabase,
  projectId,
  payload,
}: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  projectId: string;
  payload: Record<string, unknown>;
}) {
  try {
    const { error } = await supabase.storage
      .from("reports")
      .upload(`reports/${projectId}.json`, Buffer.from(JSON.stringify(payload, null, 2)), {
        contentType: "application/json",
        upsert: true,
      });

    if (error) {
      throw error;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to upload refreshed report.";
    console.warn(
      `[cron.research-refresh] Failed to upload refreshed report for project ${projectId}`,
      message,
      error
    );
  }
}

async function logProjectStatus({
  supabase,
  projectId,
  success,
  simulated,
  validationScore,
  validationReason,
  message,
  error,
}: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  projectId: string;
  success: boolean;
  simulated?: boolean;
  validationScore?: number | null;
  validationReason?: string | null;
  message?: string;
  error?: string;
}) {
  await logAgentStatusEntry(supabase, {
    idea: "auto-refresh",
    stage: "run",
    run_type: "cron",
    success,
    passed: success,
    error_log: truncate(error ?? message),
    summary: createSummary({
      projectId,
      success,
      simulated: Boolean(simulated),
      validationScore: typeof validationScore === "number" ? validationScore : null,
      validationReason: validationReason ?? null,
      message,
    }),
  });
}

async function logRunSummary({
  supabase,
  summary,
  error,
}: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  summary: RefreshSummary;
  error?: string;
}) {
  await logAgentStatusEntry(supabase, {
    idea: "auto-refresh",
    stage: "run-summary",
    run_type: "cron",
    success: summary.failures === 0,
    passed: summary.failures === 0,
    error_log: truncate(error),
    summary: createSummary({
      projects_checked: summary.projects_checked,
      refreshed: summary.refreshed,
      simulated: summary.simulated,
      failures: summary.failures,
      status: summary.status,
    }),
  });
}

async function handleAlerts(
  supabase: ReturnType<typeof getSupabaseAdminClient> | null,
  summary: RefreshSummary,
  diagnostics: DiagnosticsResult
): Promise<void> {
  const shouldAlert =
    summary.failures > 0 || summary.status !== "ok";

  if (!shouldAlert) {
    return;
  }

  const triggeredAt = new Date().toISOString();
  const transports: string[] = [];
  const errors: string[] = [];

  let notifyApiModule: NotifyModule | null = null;

  async function ensureNotifyModule() {
    if (!notifyApiModule) {
      notifyApiModule = await loadNotifyModule();
    }
    return notifyApiModule!;
  }

  const messageContext = {
    summary,
    diagnostics,
    triggeredAt,
  };

  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  if (slackWebhook) {
    try {
      const alertsModule = await ensureNotifyModule();
      const slackResult = await alertsModule.sendSlackAlert({
        webhookUrl: slackWebhook,
        ...messageContext,
      });
      if (slackResult.success) {
        transports.push("slack");
      } else {
        errors.push(slackResult.error ?? "slack-unknown-error");
      }
    } catch (error) {
      errors.push(`slack:${formatError(error)}`);
    }
  }

  if (transports.length === 0) {
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.ALERT_EMAIL;
    if (apiKey && to) {
      const from =
        process.env.ALERT_EMAIL_FROM ?? "Realwebwins Alerts <alerts@realwebwins.app>";
      try {
        const alertsModule = await ensureNotifyModule();
        const emailResult = await alertsModule.sendEmailAlert({
          apiKey,
          to,
          from,
          ...messageContext,
        });
        if (emailResult.success) {
          transports.push("email");
        } else {
          errors.push(emailResult.error ?? "email-unknown-error");
        }
      } catch (error) {
        errors.push(`email:${formatError(error)}`);
      }
    }
  }

  if (transports.length === 0 && errors.length === 0) {
    errors.push("no-alert-transports-configured");
  }

  const sent = transports.length > 0;

  await logAgentStatusEntry(supabase, {
    idea: "auto-refresh",
    stage: "alert",
    run_type: "cron",
    success: sent,
    passed: sent,
    error_log: errors.length ? truncate(errors.join("; ")) : null,
    summary: createSummary({
      triggeredAt,
      transports: transports.length ? transports : ["none"],
      sent,
      projects_checked: summary.projects_checked,
      refreshed: summary.refreshed,
      simulated: summary.simulated,
      failures: summary.failures,
      status: summary.status,
      diagnostics: diagnostics.status,
    }),
  });
}

async function loadNotifyModule(): Promise<NotifyModule> {
  const notifyModule = (await import(
    "../../../../../utils/notify.mjs"
  )) as unknown as NotifyModule;
  return notifyModule;
}

function extractVerdict(insights: unknown): {
  score: number | null;
  label: string | null;
  confidence: string | null;
} {
  const verdict = (
    insights as {
      verdict?: { score?: number; label?: string; confidence?: string };
    }
  )?.verdict;

  return {
    score: typeof verdict?.score === "number" ? verdict.score : null,
    label: typeof verdict?.label === "string" ? verdict.label : null,
    confidence:
      typeof verdict?.confidence === "string" ? verdict.confidence : null,
  };
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

























