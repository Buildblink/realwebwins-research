import { generateResearchInsights } from "@/lib/anthropicClient";
import { formatResearchMarkdown } from "@/lib/researchFormatter";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { ResearchGeneratedData } from "@/types/research";

const MAX_ATTEMPTS = 3;
const MAX_ERROR_LOG_LENGTH = 1000;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let ensureAgentStatusTablePromise: Promise<void> | null = null;
let agentStatusTableReady = false;
let agentStatusLoggingDisabled = false;

interface ResearchAgentParams {
  idea: string;
}

export interface ResearchAgentResult {
  insights: ResearchGeneratedData;
  reportMarkdown: string;
  completedAt: string;
}

type RequiredField = "verdict" | "market_size" | "competition";

export async function researchAgent(
  params: ResearchAgentParams
): Promise<ResearchAgentResult> {
  const { idea } = params;
  const supabase = getSupabaseAdminClient();

  await ensureAgentStatusTableExists(supabase);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await logAgentStatus({
      supabase,
      idea,
      stage: `attempt_${attempt}_start`,
      success: false,
    });

    try {
      const initialInsights = await generateResearchInsights(idea);
      const repairedInsights = await selfRepairIfNeeded(
        supabase,
        idea,
        initialInsights
      );

      const missingAfterRepair = findMissingFields(repairedInsights);
      if (missingAfterRepair.length > 0) {
        throw new Error(
          `Incomplete insights after repair: missing ${missingAfterRepair.join(", ")}`
        );
      }

      const reportMarkdown = formatResearchMarkdown(idea, repairedInsights);
      const completedAt = new Date().toISOString();

      await logAgentStatus({
        supabase,
        idea,
        stage: `attempt_${attempt}_completed`,
        success: true,
      });

      return {
        insights: repairedInsights,
        reportMarkdown,
        completedAt,
      };
    } catch (error) {
      const shouldRetry =
        attempt < MAX_ATTEMPTS && (isRetriable(error) || isIncompleteError(error));

      await logAgentStatus({
        supabase,
        idea,
        stage: `attempt_${attempt}_failed`,
        success: false,
        errorLog: serializeError(error),
      });

      if (!shouldRetry) {
        throw error instanceof Error
          ? error
          : new Error("Unknown error while generating research insights.");
      }
    }
  }

  throw new Error("Unable to generate research insights after retries.");
}

function isRetriable(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof Error) {
    const status =
      (error as { status?: number }).status ??
      (error as { response?: { status?: number } }).response?.status;

    if (status && (status === 429 || status >= 500)) {
      return true;
    }

    const message = error.message.toLowerCase();
    return message.includes("timeout") || message.includes("rate limit");
  }

  return false;
}

function isIncompleteError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Incomplete insights");
}

async function selfRepairIfNeeded(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  idea: string,
  insights: ResearchGeneratedData
): Promise<ResearchGeneratedData> {
  const missingFields = findMissingFields(insights);
  if (missingFields.length === 0) {
    return insights;
  }

  await logAgentStatus({
    supabase,
    idea,
    stage: "self_repair_start",
    success: false,
    errorLog: `Regenerating missing fields: ${missingFields.join(", ")}`,
  });

  const regenerated = await generateResearchInsights(idea);
  const mergedInsights: ResearchGeneratedData = {
    ...insights,
    verdict:
      missingFields.includes("verdict") && regenerated.verdict
        ? regenerated.verdict
        : insights.verdict,
    market_size:
      missingFields.includes("market_size") && regenerated.market_size
        ? regenerated.market_size
        : insights.market_size,
    competition:
      missingFields.includes("competition") && regenerated.competition?.length
        ? regenerated.competition
        : insights.competition,
  };

  return mergedInsights;
}

function findMissingFields(
  insights: ResearchGeneratedData | null | undefined
): RequiredField[] {
  const missing: RequiredField[] = [];

  if (
    !insights?.verdict ||
    typeof insights.verdict.score !== "number" ||
    !insights.verdict.label
  ) {
    missing.push("verdict");
  }

  if (
    !insights?.market_size ||
    !insights.market_size.tam ||
    !insights.market_size.growth
  ) {
    missing.push("market_size");
  }

  if (
    !Array.isArray(insights?.competition) ||
    insights.competition.length === 0 ||
    insights.competition.some((entry) => !entry?.name)
  ) {
    missing.push("competition");
  }

  return missing;
}

interface AgentStatusLogParams {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  idea: string;
  stage: string;
  success: boolean;
  errorLog?: string;
}

async function logAgentStatus(params: AgentStatusLogParams): Promise<void> {
  if (agentStatusLoggingDisabled || !agentStatusTableReady) {
    return;
  }

  const { supabase, idea, stage, success, errorLog } = params;

  try {
    const { error } = await supabase.from("AgentStatus").insert([
      {
        idea,
        stage,
        success,
        error_log: errorLog
          ? errorLog.slice(0, MAX_ERROR_LOG_LENGTH)
          : null,
        last_run: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("[researchAgent] failed to log agent status", error);
    }
  } catch (logError) {
    console.error("[researchAgent] unexpected logging failure", logError);
  }
}

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return JSON.stringify(error);
}

async function ensureAgentStatusTableExists(
  supabase: ReturnType<typeof getSupabaseAdminClient>
): Promise<void> {
  if (agentStatusLoggingDisabled || agentStatusTableReady) {
    return;
  }

  if (ensureAgentStatusTablePromise) {
    return ensureAgentStatusTablePromise;
  }

  ensureAgentStatusTablePromise = (async () => {
    const { error: preflightError } = await supabase
      .from("AgentStatus")
      .select("id")
      .limit(1);

    if (!preflightError) {
      agentStatusTableReady = true;
      return;
    }

    if (preflightError.code !== "PGRST205") {
      console.error(
        "[researchAgent] Unexpected error while checking AgentStatus table:",
        preflightError.message
      );
      agentStatusLoggingDisabled = true;
      return;
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn(
        "[researchAgent] Supabase admin credentials missing; AgentStatus logging disabled."
      );
      agentStatusLoggingDisabled = true;
      return;
    }

    const ddl = `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'AgentStatus'
        ) THEN
          CREATE TABLE public."AgentStatus" (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            idea text NOT NULL,
            stage text NOT NULL,
            success boolean NOT NULL DEFAULT false,
            error_log text,
            last_run timestamptz NOT NULL DEFAULT now()
          );
          ALTER TABLE public."AgentStatus" ENABLE ROW LEVEL SECURITY;
        END IF;
        PERFORM pg_notify('pgrst', 'reload schema');
      END
      $$;
    `;

    try {
      const response = await fetch(`${supabaseUrl}/postgres/v1/query`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query: ddl }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[researchAgent] Failed to ensure AgentStatus table:",
          response.status,
          errorText
        );
        agentStatusLoggingDisabled = true;
        return;
      }
    } catch (requestError) {
      console.error(
        "[researchAgent] Error while ensuring AgentStatus table:",
        requestError
      );
      agentStatusLoggingDisabled = true;
      return;
    }

    try {
      await waitForAgentStatusAvailability(supabase);
      agentStatusTableReady = true;
    } catch (availabilityError) {
      console.error(
        "[researchAgent] AgentStatus table did not become available after creation attempt.",
        availabilityError
      );
      agentStatusLoggingDisabled = true;
    }
  })();

  try {
    await ensureAgentStatusTablePromise;
  } catch (error) {
    agentStatusLoggingDisabled = true;
    throw error;
  } finally {
    ensureAgentStatusTablePromise = null;
  }
}

async function waitForAgentStatusAvailability(
  supabase: ReturnType<typeof getSupabaseAdminClient>
): Promise<void> {
  const MAX_CHECK_ATTEMPTS = 5;

  for (let attempt = 0; attempt < MAX_CHECK_ATTEMPTS; attempt += 1) {
    const { error } = await supabase.from("AgentStatus").select("id").limit(1);

    if (!error) {
      agentStatusTableReady = true;
      return;
    }

    if (error.code !== "PGRST205") {
      throw new Error(
        `[researchAgent] Unexpected error while waiting for AgentStatus availability: ${error.message}`
      );
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 200 * Math.pow(2, attempt))
    );
  }

  throw new Error(
    "[researchAgent] AgentStatus table is still unavailable after retries."
  );
}
