import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  if (process.env.ADMIN_MODE !== "true") {
    return NextResponse.json(
      { success: false, error: "ADMIN_DISABLED", message: "Admin mode is disabled." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  const offset = Number.parseInt(searchParams.get("offset") ?? "0", 10);
  const agentId = searchParams.get("agentId");

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("agent_runs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + Math.max(1, limit) - 1);

  if (agentId) {
    query = query.eq("agent_id", agentId);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: "RUN_LIST_FAILED", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: data ?? [],
    pagination: {
      limit,
      offset,
      count: count ?? data?.length ?? 0,
    },
  });
}
