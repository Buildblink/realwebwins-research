import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface ReflectionRow {
  agent_id: string;
  metadata: Record<string, unknown> | null;
}

interface BehaviorRow {
  agent_id: string;
}

function extractImpact(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function POST() {
  const supabase = getSupabaseAdminClient();

  const [{ data: reflectionRows, error: reflectionsError }, { data: behaviorRows, error: behaviorError }] =
    await Promise.all([
      supabase
        .from("agent_reflections")
        .select("agent_id, metadata")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("agent_behaviors").select("agent_id"),
    ]);

  if (reflectionsError) {
    console.error("[agents.metrics] Failed to load reflections", reflectionsError);
    return NextResponse.json(
      {
        success: false,
        error: "REFLECTION_QUERY_FAILED",
        message: reflectionsError.message,
      },
      { status: 500 }
    );
  }

  if (behaviorError) {
    console.error("[agents.metrics] Failed to load behaviors", behaviorError);
    return NextResponse.json(
      {
        success: false,
        error: "BEHAVIOR_QUERY_FAILED",
        message: behaviorError.message,
      },
      { status: 500 }
    );
  }

  const groupedImpacts = new Map<
    string,
    { impacts: number[]; reflectionCount: number }
  >();
  const behaviorCounts = new Map<string, number>();

  (behaviorRows as BehaviorRow[] | null)?.forEach((row) => {
    if (!row?.agent_id) return;
    behaviorCounts.set(row.agent_id, (behaviorCounts.get(row.agent_id) ?? 0) + 1);
  });

  (reflectionRows as ReflectionRow[] | null)?.forEach((row) => {
    if (!row?.agent_id) return;
    const impact = extractImpact((row.metadata ?? {})["impact"]);
    const entry =
      groupedImpacts.get(row.agent_id) ?? { impacts: [], reflectionCount: 0 };
    entry.reflectionCount += 1;
    if (impact !== null) {
      entry.impacts.push(impact);
    }
    groupedImpacts.set(row.agent_id, entry);
  });

  const agentIds = new Set<string>([
    ...groupedImpacts.keys(),
    ...behaviorCounts.keys(),
  ]);

  const calculatedAt = new Date().toISOString();
  const rows = Array.from(agentIds)
    .map((agentId) => {
      const entry = groupedImpacts.get(agentId) ?? {
        impacts: [],
        reflectionCount: 0,
      };
      const impacts = entry.impacts;
    const count = impacts.length;
    const average =
      count > 0
        ? impacts.reduce((sum, value) => sum + value, 0) / count
        : 0;
    const variance =
      count > 0
        ? impacts.reduce((sum, value) => {
            const delta = value - average;
            return sum + delta * delta;
          }, 0) / count
        : 0;
    const consistency = 1 - Math.min(1, Math.sqrt(variance));

    return {
      agent_id: agentId,
      average_impact: Number.isFinite(average) ? average : 0,
      consistency: Number.isFinite(consistency) ? consistency : 0,
      reflection_count: entry.reflectionCount,
      behavior_count: behaviorCounts.get(agentId) ?? 0,
      last_tune_at: calculatedAt,
      meta: {
        calculated_at: calculatedAt,
        impact_samples: count,
      },
    };
    })
    .filter(
      (entry) =>
        entry.reflection_count > 0 || (entry.behavior_count ?? 0) > 0
    );

  if (rows.length === 0) {
    return NextResponse.json({ success: true, updated: 0, rows: [] });
  }

  const { error: insertError } = await supabase
    .from("agent_metrics")
    .insert(rows);

  if (insertError) {
    console.error("[agents.metrics] Failed to insert metrics", insertError);
    return NextResponse.json(
      {
        success: false,
        error: "INSERT_FAILED",
        message: insertError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    updated: rows.length,
  });
}

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_metrics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[agents.metrics] Failed to load metrics", error);
    return NextResponse.json(
      {
        success: false,
        error: "METRICS_QUERY_FAILED",
        message: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}
