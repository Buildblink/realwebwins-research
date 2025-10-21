import { NextResponse } from "next/server";
import { generateActionPlanMarkdown } from "@/lib/actionPlanGenerator";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { ResearchGeneratedData } from "@/types/research";

interface ActionPlanRequestBody {
  project_id?: string;
  research_json?: unknown;
}

const MAX_GENERATION_ATTEMPTS = 3;

function parseResearchPayload(raw: unknown): ResearchGeneratedData | null {
  if (!raw) {
    return null;
  }

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ResearchGeneratedData;
    } catch (error) {
      console.warn("[actionplan] failed to parse string research_json", error);
      return null;
    }
  }

  if (typeof raw === "object") {
    return raw as ResearchGeneratedData;
  }

  return null;
}

async function logActionPlanFailure(message: string, errorLog?: string) {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("AgentStatus").insert([
      {
        idea: "actionplan",
        stage: "actionplan",
        success: false,
        error_log: errorLog ?? message,
        last_run: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.warn("[actionplan] failed to log status", error);
    }
  } catch (logError) {
    console.warn("[actionplan] unexpected logging error", logError);
  }
}

export async function POST(req: Request) {
  let requestBody: ActionPlanRequestBody;
  try {
    requestBody = (await req.json()) as ActionPlanRequestBody;
  } catch (error) {
    await logActionPlanFailure("Invalid JSON body", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, error: "INVALID_JSON", message: "Malformed request body." },
      { status: 400 }
    );
  }

  const projectId = requestBody.project_id?.trim();
  if (!projectId) {
    await logActionPlanFailure("Missing project_id");
    return NextResponse.json(
      { success: false, error: "INVALID_INPUT", message: "project_id is required." },
      { status: 400 }
    );
  }

  const research = parseResearchPayload(requestBody.research_json);
  if (!research) {
    await logActionPlanFailure("Invalid research_json payload");
    return NextResponse.json(
      { success: false, error: "INVALID_INPUT", message: "Valid research_json is required." },
      { status: 400 }
    );
  }

  const researchRecord = research as unknown as Record<string, unknown>;
  const ideaRaw =
    typeof researchRecord.ideaDescription === "string"
      ? (researchRecord.ideaDescription as string)
      : typeof researchRecord.idea === "string"
      ? (researchRecord.idea as string)
      : "";
  const ideaSummary =
    ideaRaw.trim().length > 0
      ? ideaRaw.trim()
      : typeof research.verdict?.summary === "string" && research.verdict.summary.length > 0
      ? research.verdict.summary
      : "Product validation sprint";

  let markdown: string | null = null;
  let attemptError: unknown;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      markdown = await generateActionPlanMarkdown({ idea: ideaSummary, research });
      if (markdown && markdown.trim().length > 0) {
        break;
      }
      attemptError = new Error("Empty action plan returned from generator.");
    } catch (error) {
      attemptError = error;
      console.warn(`[actionplan] generation attempt ${attempt} failed`, error);
    }
  }

  if (!markdown) {
    const errorMessage =
      attemptError instanceof Error ? attemptError.message : "Unable to generate action plan.";
    await logActionPlanFailure("Generation failed", errorMessage);
    return NextResponse.json(
      { success: false, error: "GENERATION_FAILED", message: errorMessage },
      { status: 500 }
    );
  }

  const supabase = getSupabaseAdminClient();
  await supabase.from("ActionPlans").delete().eq("project_id", projectId);

  const { data, error } = await supabase
    .from("ActionPlans")
    .insert([
      {
        project_id: projectId,
        markdown,
        created_at: new Date().toISOString(),
      },
    ])
    .select("id, markdown")
    .single();

  if (error) {
    await logActionPlanFailure("Supabase insert failed", error.message);
    return NextResponse.json(
      {
        success: false,
        error: "STORAGE_FAILED",
        message: "Failed to persist action plan.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    markdown: data.markdown,
    id: data.id,
  });
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "NOT_IMPLEMENTED",
      message: "Use POST /api/actionplan to generate an action plan.",
    },
    { status: 405 }
  );
}
