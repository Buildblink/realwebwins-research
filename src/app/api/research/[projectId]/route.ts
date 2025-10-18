import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(
  _: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("research_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ project: data });
  } catch (error) {
    console.error("[research.detail] error", error);
    const message =
      error instanceof Error ? error.message : "Unable to fetch project";
    return NextResponse.json(
      { error: "FETCH_FAILED", message },
      { status: 500 }
    );
  }
}
