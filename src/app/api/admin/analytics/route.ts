import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

function adminEnabled() {
  return process.env.ADMIN_MODE === "true";
}

function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: "ADMIN_DISABLED", message: "Admin mode is disabled." },
    { status: 403 }
  );
}

export async function GET(request: Request) {
  if (!adminEnabled()) {
    return unauthorizedResponse();
  }

  const supabase = getSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const model = searchParams.get("model");
  const limit = Number.parseInt(searchParams.get("limit") ?? "200", 10);

  let query = supabase
    .from("agent_run_metrics")
    .select("agent_id, llm_provider, llm_model, tokens, duration_ms, success, created_at")
    .order("created_at", { ascending: false })
    .limit(Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 200);

  if (provider) {
    query = query.eq("llm_provider", provider);
  }
  if (model) {
    query = query.eq("llm_model", model);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: "ANALYTICS_FETCH_FAILED", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}
