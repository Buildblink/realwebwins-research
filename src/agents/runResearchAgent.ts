import { createHash } from "crypto";
import path from "path";
import { promises as fs } from "fs";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { queryVault } from "@/lib/vault/queryVault";

type RunType = "cron" | "cli";

export interface ResearchAgentProject {
  id: string;
  idea_description: string | null;
  title: string | null;
  platform?: string | null;
}

export interface ResearchAgentResult {
  insights: unknown;
  reportMarkdown: string;
  completedAt: string;
  simulated: boolean;
}

const FALLBACK_LOG_PATH = path.join(
  process.cwd(),
  "logs",
  "agentstatus-fallback.json"
);

export default async function runResearchAgent(
  project: ResearchAgentProject,
  options: { runType?: RunType } = {}
): Promise<ResearchAgentResult> {
  const runType = options.runType ?? "cron";
  const startedAt = new Date();
  const logger = createAgentLogger(runType);
  const idea = project.idea_description?.trim() || project.title || `project-${project.id}`;

  await logger.log({
    idea: "auto-refresh",
    stage: "agent-start",
    success: true,
    summary: { projectId: project.id, idea, runType },
  });

  try {
    const vaultData = await queryVault(project);
    const simulated = buildSimulatedInsights(
      idea,
      startedAt.toISOString(),
      `vault placeholder: ${vaultData.notes ?? "no notes"}`
    );

    const result: ResearchAgentResult = {
      insights: {
        ...simulated,
        vault: vaultData,
      },
      reportMarkdown: addVaultAppendix(simulated.reportMarkdown, vaultData),
      completedAt: simulated.completedAt,
      simulated: true,
    };

    await logger.log({
      idea: "auto-refresh",
      stage: "agent-finish",
      success: true,
      summary: {
        projectId: project.id,
        runtimeMs: Date.now() - startedAt.getTime(),
        simulated: result.simulated,
        runType,
      },
    });

    return result;
  } catch (error) {
    const fallback = buildSimulatedInsights(
      idea,
      new Date().toISOString(),
      formatError(error)
    );

    await logger.log({
      idea: "auto-refresh",
      stage: "agent-error",
      success: false,
      error_log: formatError(error),
      summary: {
        projectId: project.id,
        simulated: true,
        runType,
      },
    });

    return {
      insights: fallback,
      reportMarkdown: fallback.reportMarkdown,
      completedAt: fallback.completedAt,
      simulated: true,
    };
  }
}

function addVaultAppendix(markdown: string, vaultData: Awaited<ReturnType<typeof queryVault>>) {
  if (!vaultData || !vaultData.sources || vaultData.sources.length === 0) {
    return `${markdown}\n\n---\n_Vault sources unavailable (placeholder)._`;
  }

  const appendix = vaultData.sources
    .map(
      (source, index) =>
        `- [${source.title ?? `Source ${index + 1}`}](#) — ${source.summary ?? "No summary"}`
    )
    .join("\n");

  return `${markdown}\n\n---\n**Vault Sources**\n${appendix}`;
}

function buildSimulatedInsights(idea: string, timestamp: string, reason: string) {
  const reportMarkdown = `# Simulated Refresh\n\n- Idea: ${idea}\n- Completed at: ${timestamp}\n- Reason: ${reason}\n`;
  return {
    idea,
    simulated: true,
    completedAt: timestamp,
    summary: `Simulated refresh completed at ${timestamp}`,
    reason,
    verdict: {
      label: "simulation",
      confidence: "low",
      score: 0,
    },
    reportMarkdown,
  };
}

function createAgentLogger(runType: RunType) {
  const supabase = safeGetSupabaseClient();

  return {
    async log(entry: {
      idea: string;
      stage: string;
      success: boolean;
      error_log?: string | null;
      summary?: Record<string, unknown>;
    }) {
      const payload = {
        idea: entry.idea,
        stage: entry.stage,
        run_type: runType,
        success: entry.success,
        passed: entry.success,
        error_log: truncate(entry.error_log),
        summary: entry.summary
          ? truncate(JSON.stringify({ ...entry.summary, timestamp: new Date().toISOString() }))
          : null,
      };

      if (supabase) {
        try {
          await supabase.from("AgentStatus").insert([payload]);
          return;
        } catch (error) {
          console.warn(
            "[runResearchAgent] Failed to log AgentStatus entry:",
            formatError(error)
          );
        }
      }

      await writeFallbackLog({
        ...payload,
        fallback_at: new Date().toISOString(),
        id: createHash("sha1").update(JSON.stringify(payload)).digest("hex"),
      });
    },
  };
}

function safeGetSupabaseClient() {
  try {
    return getSupabaseAdminClient();
  } catch {
    return null;
  }
}

async function writeFallbackLog(entry: Record<string, unknown>) {
  try {
    await fs.mkdir(path.dirname(FALLBACK_LOG_PATH), { recursive: true });
    await fs.appendFile(FALLBACK_LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (error) {
    console.warn(
      "[runResearchAgent] Unable to write AgentStatus fallback log:",
      formatError(error)
    );
  }
}

function truncate(value?: string | null, length = 1000): string | null {
  if (!value) return null;
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

function formatError(error: unknown): string {
  if (!error) return "unknown-error";
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
