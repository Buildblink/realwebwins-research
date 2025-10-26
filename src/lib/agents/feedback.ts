import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface ReflectionRow {
  behavior_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface BehaviorImpact {
  behaviorId: string;
  averageImpact: number;
  reflections: number;
}

function extractImpact(metadata: Record<string, unknown> | null | undefined) {
  const impact = metadata?.impact;
  if (typeof impact === "number" && Number.isFinite(impact)) {
    return impact;
  }
  return null;
}

async function loadBehaviorImpacts(days = 7): Promise<BehaviorImpact[]> {
  const supabase = getSupabaseAdminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("agent_reflections")
    .select("behavior_id, metadata")
    .gte("created_at", since)
    .not("behavior_id", "is", null);

  if (error) {
    throw new Error(`Failed to load reflections: ${error.message}`);
  }

  const grouped = new Map<string, { total: number; count: number }>();

  for (const row of data as ReflectionRow[] ?? []) {
    const behaviorId = row.behavior_id ?? undefined;
    const impact = extractImpact(row.metadata);
    if (!behaviorId || impact === null) continue;

    const current = grouped.get(behaviorId) ?? { total: 0, count: 0 };
    current.total += impact;
    current.count += 1;
    grouped.set(behaviorId, current);
  }

  return Array.from(grouped.entries()).map(([behaviorId, value]) => ({
    behaviorId,
    averageImpact: value.count > 0 ? value.total / value.count : 0,
    reflections: value.count,
  }));
}

async function disableBehavior(behaviorId: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("agent_behaviors")
    .update({ enabled: false })
    .eq("id", behaviorId);

  if (error) {
    throw new Error(`Failed to disable behavior ${behaviorId}: ${error.message}`);
  }
}

async function recordHighImpactBehavior(behaviorId: string, impact: number) {
  const supabase = getSupabaseAdminClient();
  const { data: behavior, error } = await supabase
    .from("agent_behaviors")
    .select("agent_id, name")
    .eq("id", behaviorId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load behavior ${behaviorId}: ${error.message}`);
  }

  if (!behavior) return;

  await supabase.from("agent_insights").insert([
    {
      agent_id: behavior.agent_id,
      source_table: "agent_behaviors",
      source_id: behaviorId,
      insight_type: "behavior_feedback",
      summary: `Behavior ${behavior.name} received high impact score (${impact.toFixed(
        2
      )}).`,
      confidence: 0.95,
      meta: {
        behavior_id: behaviorId,
        impact,
      },
    },
  ]);
}

export async function runBehaviorFeedbackOptimization() {
  const impacts = await loadBehaviorImpacts();
  let disabled = 0;
  let boosted = 0;

  for (const record of impacts) {
    if (record.averageImpact < 0.2) {
      await disableBehavior(record.behaviorId);
      disabled += 1;
    } else if (record.averageImpact > 0.8) {
      await recordHighImpactBehavior(record.behaviorId, record.averageImpact);
      boosted += 1;
    }
  }

  return {
    analyzed: impacts.length,
    disabled,
    boosted,
  };
}
