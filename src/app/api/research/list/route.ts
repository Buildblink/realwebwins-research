import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdminClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = Number(searchParams.get("limit") ?? 20);

    let query = supabase
      .from("research_projects")
      .select(
        "id, title, idea_description, score, verdict, confidence, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 100));

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return NextResponse.json({ projects: data });
  } catch (error) {
    console.error("[research.list] error", error);
    const message = error instanceof Error ? error.message : "Unable to fetch projects";
    return NextResponse.json(
      { error: "FETCH_FAILED", message },
      { status: 500 }
    );
  }
}
