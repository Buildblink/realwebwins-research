import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export interface PublicAgentProfile {
  agentId: string;
  leaderboard?: Record<string, unknown> | null;
  metrics?: Array<Record<string, unknown>>;
  reflections?: Array<Record<string, unknown>>;
}

export async function fetchPublicAgentProfile(agentId: string): Promise<PublicAgentProfile> {
  const supabase = getSupabaseAdminClient();

  const [leaderboard, metrics, reflections] = await Promise.all([
    supabase
      .from("agent_leaderboard")
      .select("*")
      .eq("agent_id", agentId)
      .maybeSingle(),
    supabase
      .from("agent_metrics")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("agent_reflections")
      .select("summary, content, created_at, metadata")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    agentId,
    leaderboard: leaderboard.data ?? null,
    metrics: (metrics.data ?? []) as Array<Record<string, unknown>>,
    reflections: (reflections.data ?? []) as Array<Record<string, unknown>>,
  };
}
