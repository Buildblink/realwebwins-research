import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = getSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const limit = Number.parseInt(searchParams.get("limit") ?? "20", 10);

  const { data, error } = await supabase
    .from("agent_insights")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Number.isFinite(limit) && limit > 0 ? limit : 20);

  if (error) {
    console.error("[agents.insights] Failed to load insights:", error);
    return NextResponse.json(
      {
        success: false,
        error: "DB_ERROR",
        message: "Unable to load agent insights.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: data ?? [],
  });
}
