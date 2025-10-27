import { NextResponse } from "next/server";
import { validateArtifact } from "@/lib/artifacts/validator";
import type { ArtifactValidationInput } from "@/lib/artifacts/types";
import { updateArtifactStatus } from "@/lib/mvp/artifacts";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  let payload: Partial<ArtifactValidationInput> & {
    content?: unknown;
    artifact_id?: string;
    preview_html?: string | null;
    tier?: string | null;
  };
  try {
    payload = (await request.json()) as ArtifactValidationInput;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_JSON",
        message: "Unable to parse request body.",
      },
      { status: 400 }
    );
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_PAYLOAD",
        message: "Request body must be a JSON object.",
      },
      { status: 400 }
    );
  }

  if (!payload.type || typeof payload.type !== "string") {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_TYPE",
        message: "Provide an artifact type string.",
      },
      { status: 400 }
    );
  }

  if (!payload.format || typeof payload.format !== "string") {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_FORMAT",
        message: "Provide an artifact format string.",
      },
      { status: 400 }
    );
  }

  const result = validateArtifact({
    type: payload.type,
    format: payload.format,
    content: payload.content ?? "",
  });

  const status = result.status === "valid" ? "valid" : result.status === "warning" ? "warning" : "invalid";
  if (payload.artifact_id) {
    try {
      await updateArtifactStatus(
        payload.artifact_id,
        status,
        result.errors,
        payload.preview_html ?? null,
        payload.tier ?? undefined
      );
    } catch (error) {
      console.error(
        "[artifacts.validate] Failed to persist artifact status",
        error instanceof Error ? error.message : error
      );
    }
  }

  try {
    const supabase = getSupabaseAdminClient();
    void supabase.from("AgentStatus").insert([
      {
        idea: "artifact_validate",
        stage: "manual-check",
        success: status !== "invalid",
        passed: status === "valid",
        summary: JSON.stringify({
          artifact_id: payload.artifact_id ?? null,
          type: payload.type,
          status,
          errors: result.errors.length,
          warnings: result.warnings.length,
        }),
      },
    ]);
  } catch (error) {
    console.warn(
      "[artifacts.validate] Failed to log AgentStatus",
      error instanceof Error ? error.message : error
    );
  }

  return NextResponse.json({
    success: true,
    result,
  });
}
