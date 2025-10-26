import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export interface AgentEventInput {
  agentId: string;
  type: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
}

export interface HealthStatusInput {
  component: string;
  status: string;
  details?: Record<string, unknown>;
  checkedAt?: string;
}

export interface HealthSnapshot {
  uptimePercentage: number;
  errorCount24h: number;
  components: Array<{
    component: string;
    status: string;
    checked_at: string;
    details: Record<string, unknown> | null;
  }>;
  recentEvents: Array<{
    id: string;
    agent_id: string;
    type: string;
    payload: Record<string, unknown> | null;
    created_at: string;
  }>;
  lastCheckedAt: string | null;
}

export async function recordAgentEvent(input: AgentEventInput) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("agent_events").insert([
    {
      agent_id: input.agentId,
      type: input.type,
      payload: input.payload ?? {},
      created_at: input.createdAt ?? new Date().toISOString(),
    },
  ]);

  if (error) {
    throw new Error(`[health] Failed to record agent event: ${error.message}`);
  }
}

export async function recordSystemHealth(input: HealthStatusInput) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("system_health").insert([
    {
      component: input.component,
      status: input.status,
      details: input.details ?? {},
      checked_at: input.checkedAt ?? new Date().toISOString(),
    },
  ]);

  if (error) {
    throw new Error(`[health] Failed to record system health: ${error.message}`);
  }
}

export async function getSystemHealthSnapshot(): Promise<HealthSnapshot> {
  const supabase = getSupabaseAdminClient();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: healthRows, error: healthError },
    { data: eventRows, error: eventsError },
  ] = await Promise.all([
    supabase
      .from("system_health")
      .select("*")
      .order("checked_at", { ascending: false })
      .limit(50),
    supabase
      .from("agent_events")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (healthError) {
    throw new Error(`[health] Failed to load system health: ${healthError.message}`);
  }

  if (eventsError) {
    throw new Error(`[health] Failed to load agent events: ${eventsError.message}`);
  }

  const byComponent = new Map<
    string,
    { ok: number; total: number; lastChecked: string | null; row: (typeof healthRows)[number] }
  >();

  (healthRows ?? []).forEach((row) => {
    const existing = byComponent.get(row.component) ?? {
      ok: 0,
      total: 0,
      lastChecked: row.checked_at ?? null,
      row,
    };
    const status = (row.status ?? "").toLowerCase();
    if (status === "ok" || status === "healthy" || status === "pass") {
      existing.ok += 1;
    }
    existing.total += 1;
    if (
      existing.lastChecked &&
      row.checked_at &&
      new Date(row.checked_at).getTime() > new Date(existing.lastChecked).getTime()
    ) {
      existing.lastChecked = row.checked_at;
      existing.row = row;
    }
    byComponent.set(row.component, existing);
  });

  const totalOk = Array.from(byComponent.values()).reduce(
    (acc, entry) => {
      acc.ok += entry.ok;
      acc.total += entry.total;
      return acc;
    },
    { ok: 0, total: 0 }
  );

  const uptimePercentage =
    totalOk.total === 0 ? 100 : Number(((totalOk.ok / totalOk.total) * 100).toFixed(2));

  const errorCount24h = (eventRows ?? []).filter((row) =>
    (row.type ?? "").toLowerCase().includes("error")
  ).length;

  const components = Array.from(byComponent.values()).map((entry) => ({
    component: entry.row.component,
    status: entry.row.status,
    checked_at: entry.row.checked_at,
    details: (entry.row.details ?? {}) as Record<string, unknown>,
  }));

  const lastCheckedAt =
    components.length > 0
      ? components
          .map((entry) => entry.checked_at)
          .filter(Boolean)
          .sort()
          .slice(-1)[0] ?? null
      : null;

  return {
    uptimePercentage,
    errorCount24h,
    components,
    recentEvents:
      (eventRows ?? []).map((row) => ({
        id: row.id,
        agent_id: row.agent_id,
        type: row.type,
        payload: (row.payload ?? {}) as Record<string, unknown>,
        created_at: row.created_at,
      })) ?? [],
    lastCheckedAt,
  };
}
