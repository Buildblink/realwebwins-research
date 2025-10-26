import { NextResponse } from "next/server";
import { createAgentReflection } from "@/lib/agents/reflection";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.WEEKLY_SUMMARY_SECRET ?? ""}`;

  if (!process.env.WEEKLY_SUMMARY_SECRET || authHeader !== expectedAuth) {
    console.warn("[agents.reflect.cron] Unauthorized attempt");
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_behaviors")
    .select("agent_id")
    .eq("enabled", true);

  if (error) {
    console.error("[agents.reflect.cron] Failed to load agents:", error);
    return NextResponse.json(
      {
        success: false,
        error: "FETCH_FAILED",
        message: error.message,
      },
      { status: 500 }
    );
  }

  const agentIds = Array.from(
    new Set((data ?? []).map((row) => row.agent_id).filter(Boolean))
  );

  let reflections = 0;
  for (const agentId of agentIds) {
    try {
      await createAgentReflection({ agentId });
      reflections += 1;
    } catch (error) {
      console.error(
        `[agents.reflect.cron] Reflection failed for ${agentId}:`,
        error
      );
    }
  }

  return NextResponse.json({
    success: true,
    reflections,
  });
}
