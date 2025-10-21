import { NextResponse } from "next/server";
import { generateMarketingPlaybookMarkdown } from "@/lib/playbookGenerator";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { ResearchGeneratedData } from "@/types/research";

interface PlaybookRequestBody {
  project_id?: string;
  research_json?: unknown;
  action_plan_markdown?: string;
}

const MAX_PLAYBOOK_ATTEMPTS = 3;

function parseResearch(raw: unknown): ResearchGeneratedData | null {
  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ResearchGeneratedData;
    } catch (error) {
      console.warn("[playbook] unable to parse research_json string", error);
      return null;
    }
  }

  if (typeof raw === "object") {
    return raw as ResearchGeneratedData;
  }

  return null;
}

async function logPlaybookFailure(message: string, errorLog?: string) {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("AgentStatus").insert([
      {
        idea: "playbook",
        stage: "playbook",
        success: false,
        error_log: errorLog ?? message,
        last_run: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.warn("[playbook] failed to log status", error);
    }
  } catch (logError) {
    console.warn("[playbook] unexpected logging failure", logError);
  }
}

function extractIdeaSummary(research: ResearchGeneratedData): string {
  const record = research as unknown as Record<string, unknown>;
  const ideaDescription =
    typeof record.ideaDescription === "string"
      ? (record.ideaDescription as string).trim()
      : "";
  if (ideaDescription.length > 0) {
    return ideaDescription;
  }

  const ideaField =
    typeof record.idea === "string" ? (record.idea as string).trim() : "";
  if (ideaField.length > 0) {
    return ideaField;
  }

  if (
    typeof research.verdict?.summary === "string" &&
    research.verdict.summary.trim().length > 0
  ) {
    return research.verdict.summary.trim();
  }

  return "Marketing launch";
}

export async function POST(req: Request) {
  let body: PlaybookRequestBody;

  try {
    body = (await req.json()) as PlaybookRequestBody;
  } catch (error) {
    await logPlaybookFailure(
      "Invalid JSON body",
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      { success: false, error: "INVALID_JSON", message: "Malformed request body." },
      { status: 400 }
    );
  }

  const projectId = body.project_id?.trim();
  if (!projectId) {
    await logPlaybookFailure("Missing project_id");
    return NextResponse.json(
      { success: false, error: "INVALID_INPUT", message: "project_id is required." },
      { status: 400 }
    );
  }

  const research = parseResearch(body.research_json);
  if (!research) {
    await logPlaybookFailure("Invalid research_json payload");
    return NextResponse.json(
      { success: false, error: "INVALID_INPUT", message: "Valid research_json is required." },
      { status: 400 }
    );
  }

  const actionPlanMarkdown =
    typeof body.action_plan_markdown === "string"
      ? body.action_plan_markdown.trim()
      : "";
  if (actionPlanMarkdown.length === 0) {
    await logPlaybookFailure("Missing action_plan_markdown");
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_INPUT",
        message: "action_plan_markdown must be a non-empty string.",
      },
      { status: 400 }
    );
  }

  const ideaSummary = extractIdeaSummary(research);

  let markdown: string | null = null;
  let attemptError: unknown;

  for (let attempt = 1; attempt <= MAX_PLAYBOOK_ATTEMPTS; attempt += 1) {
    try {
      markdown = await generateMarketingPlaybookMarkdown({
        idea: ideaSummary,
        research,
        actionPlan: actionPlanMarkdown,
      });

      if (markdown && markdown.trim().length > 0) {
        break;
      }
      attemptError = new Error("Generator returned empty playbook");
    } catch (error) {
      attemptError = error;
      console.warn(`[playbook] generation attempt ${attempt} failed`, error);
    }
  }

  if (!markdown) {
    const message =
      attemptError instanceof Error
        ? attemptError.message
        : "Unable to generate marketing playbook.";
    await logPlaybookFailure("Generation failed", message);
    return NextResponse.json(
      { success: false, error: "GENERATION_FAILED", message },
      { status: 500 }
    );
  }

  const supabase = getSupabaseAdminClient();
  await supabase.from("Playbooks").delete().eq("project_id", projectId);

  const { data, error } = await supabase
    .from("Playbooks")
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
    await logPlaybookFailure("Supabase insert failed", error.message);
    return NextResponse.json(
      {
        success: false,
        error: "STORAGE_FAILED",
        message: "Failed to persist marketing playbook.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    id: data.id,
    markdown: data.markdown,
  });
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "NOT_IMPLEMENTED",
      message: "Use POST /api/playbook to generate a playbook.",
    },
    { status: 405 }
  );
}
