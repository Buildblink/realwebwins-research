import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface UpdateVaultPayload {
  is_public?: boolean;
  tags?: string[];
}

function normalizeTags(tags: unknown): string[] | undefined {
  if (!Array.isArray(tags)) {
    return undefined;
  }

  const normalized = tags
    .map((tag) => (typeof tag === "string" ? tag.trim() : null))
    .filter((tag): tag is string => typeof tag === "string" && tag.length > 0);

  return Array.from(new Set(normalized));
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!process.env.ADMIN_MODE) {
    return NextResponse.json(
      { success: false, error: "FORBIDDEN", message: "Publishing is disabled." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "INVALID_ID", message: "Project id is required." },
      { status: 400 }
    );
  }

  let payload: UpdateVaultPayload;
  try {
    payload = (await req.json()) as UpdateVaultPayload;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_JSON",
        message: error instanceof Error ? error.message : "Malformed request body.",
      },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {};
  if (typeof payload.is_public === "boolean") {
    update.is_public = payload.is_public;
  }

  const normalizedTags = normalizeTags(payload.tags);
  if (normalizedTags) {
    update.tags = normalizedTags;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "NO_FIELDS",
        message: "Provide at least one field to update.",
      },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("research_projects")
      .update(update)
      .eq("id", id)
      .select("id, is_public, tags")
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[vault.publish] update failed", error);
    const message =
      error instanceof Error ? error.message : "Unexpected error updating project.";
    return NextResponse.json(
      { success: false, error: "UPDATE_FAILED", message },
      { status: 500 }
    );
  }
}
