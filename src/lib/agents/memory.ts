import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export interface AgentMemoryFilters {
  topic?: string | null;
  agent_id?: string | null;
  search?: string | null;
  limit?: number;
}

export interface AgentMemoryEntry {
  id: string;
  agent_id: string;
  topic: string;
  summary: string | null;
  content: string | null;
  importance: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function getAgentMemory({
  topic = null,
  agent_id = null,
  search = null,
  limit = 50,
}: AgentMemoryFilters) {
  const supabase = getSupabaseAdminClient();
  let query = supabase.from("agent_memory").select("*");

  if (topic) {
    query = query.eq("topic", topic);
  }

  if (agent_id) {
    query = query.eq("agent_id", agent_id);
  }

  if (search) {
    query = query.or(`summary.ilike.%${search}%,content.ilike.%${search}%`);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`[memory] Failed to fetch agent memory: ${error.message}`);
  }

  return (data ?? []) as AgentMemoryEntry[];
}

export interface UpsertAgentMemoryInput {
  id?: string;
  agent_id: string;
  topic: string;
  summary?: string | null;
  content?: string | null;
  importance?: number | null;
  metadata?: Record<string, unknown> | null;
}

async function refreshSupabaseSchema() {
  const supabase = getSupabaseAdminClient();
  try {
    await supabase.rpc("pg_reload_conf");
  } catch (error) {
    console.warn("[memory] Schema refresh rpc failed", error);
  }
}

export async function upsertAgentMemory(entry: UpsertAgentMemoryInput) {
  const supabase = getSupabaseAdminClient();

  await refreshSupabaseSchema();

  if (entry.id) {
    const { data, error } = await supabase
      .from("agent_memory")
      .update({
        summary: entry.summary ?? null,
        content: entry.content ?? null,
        importance: entry.importance ?? null,
        metadata: entry.metadata ?? null,
      })
      .eq("id", entry.id)
      .select()
      .single();

    if (error) {
      console.error("[agents.memory] Update failed", { error, entry });
      throw new Error(
        `[memory] Failed to update memory entry: ${error.message}`
      );
    }

    return data as AgentMemoryEntry;
  }

  const payload = {
    agent_id: entry.agent_id,
    topic: entry.topic,
    summary: entry.summary ?? null,
    content: entry.content ?? null,
    importance: entry.importance ?? null,
    metadata: entry.metadata ?? null,
  };

  const { data, error } = await supabase
    .from("agent_memory")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("[agents.memory] Insert failed", { error, payload });
    throw new Error(
      `[memory] Failed to insert memory entry: ${error.message}`
    );
  }

  return data as AgentMemoryEntry;
}

export async function syncInsightsToMemory(limit = 25) {
  const supabase = getSupabaseAdminClient();
  await refreshSupabaseSchema();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: insights, error } = await supabase
    .from("agent_insights")
    .select("id, agent_id, insight_type, summary, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`[memory] Failed to load recent insights: ${error.message}`);
  }

  const entries =
    insights
      ?.filter((insight) => insight.summary)
      .map((insight) => ({
        agent_id: insight.agent_id ?? "agent_researcher",
        topic: insight.insight_type ?? "general",
        summary: insight.summary as string,
        content: insight.summary as string,
        importance: 0.9,
        metadata: { source: "agent_insights", insight_id: insight.id },
      })) ?? [];

  if (entries.length === 0) {
    return { added: 0 };
  }

  const { error: insertError } = await supabase
    .from("agent_memory")
    .insert(entries);

  if (insertError) {
    console.error("[agents.memory] Bulk insert failed", {
      error: insertError,
      entries,
    });
    throw new Error(
      `[memory] Failed to insert synced insights: ${insertError.message}`
    );
  }

  return { added: entries.length };
}
