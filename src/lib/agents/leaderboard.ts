import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface AgentMetricRow {
  agent_id: string | null;
  average_impact: number | null;
  consistency: number | null;
  meta: Record<string, unknown> | null;
  created_at: string | null;
}

interface AgentLinkRow {
  source_agent: string | null;
  target_agent: string | null;
  strength: number | null;
}

export interface LeaderboardEntry {
  agentId: string;
  rankScore: number;
  impactRank: number;
  consistencyRank: number;
  collaborationRank: number;
  impactAvg: number;
  impactVariance: number;
  collaborationWeightSum: number;
  computedAt: string;
}

export interface LeaderboardInsight {
  agentId: string;
  category: string;
  summary: string;
  metric: Record<string, unknown>;
}

interface MetricAccumulator {
  latest: AgentMetricRow | null;
  impacts: number[];
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function computeVariance(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => {
      const delta = value - mean;
      return sum + delta * delta;
    }, 0) / values.length;
  return Number.isFinite(variance) ? variance : 0;
}

function deriveVarianceFromConsistency(consistency: number | null | undefined) {
  const value = clamp(typeof consistency === "number" ? consistency : 0, 0, 1);
  const variance = Math.pow(1 - value, 2);
  return Number.isFinite(variance) ? variance : 0;
}

function formatScore(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : 0;
}

export async function calculateAgentLeaderboard() {
  const supabase = getSupabaseAdminClient();

  const [{ data: metricsData, error: metricsError }, { data: linksData, error: linksError }] =
    await Promise.all([
      supabase
        .from("agent_metrics")
        .select("agent_id, average_impact, consistency, meta, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("agent_links").select("source_agent, target_agent, strength"),
    ]);

  if (metricsError) {
    throw new Error(
      `[leaderboard] Failed to load agent metrics: ${metricsError.message}`
    );
  }

  if (linksError) {
    throw new Error(
      `[leaderboard] Failed to load agent links: ${linksError.message}`
    );
  }

  const metricsAccumulator = new Map<string, MetricAccumulator>();

  (metricsData as AgentMetricRow[] | null)?.forEach((row) => {
    if (!row?.agent_id) {
      return;
    }
    const agentId = row.agent_id;
    const impact = typeof row.average_impact === "number" ? row.average_impact : null;
    const accumulator =
      metricsAccumulator.get(agentId) ?? {
        latest: null,
        impacts: [],
      };
    if (!accumulator.latest) {
      accumulator.latest = row;
    }
    if (impact !== null && Number.isFinite(impact)) {
      accumulator.impacts.push(impact);
    }
    metricsAccumulator.set(agentId, accumulator);
  });

  const collaborationWeights = new Map<string, number>();

  (linksData as AgentLinkRow[] | null)?.forEach((row) => {
    if (!row) return;
    const strength =
      typeof row.strength === "number" && Number.isFinite(row.strength)
        ? row.strength
        : 0;
    if (row.source_agent) {
      collaborationWeights.set(
        row.source_agent,
        (collaborationWeights.get(row.source_agent) ?? 0) + strength
      );
    }
    if (row.target_agent) {
      collaborationWeights.set(
        row.target_agent,
        (collaborationWeights.get(row.target_agent) ?? 0) + strength
      );
    }
  });

  const agentIds = new Set<string>([
    ...metricsAccumulator.keys(),
    ...collaborationWeights.keys(),
  ]);

  const computedAt = new Date().toISOString();

  const entries: LeaderboardEntry[] = Array.from(agentIds).map((agentId) => {
    const metrics = metricsAccumulator.get(agentId);
    const latest = metrics?.latest ?? null;
    const impactAvg =
      typeof latest?.average_impact === "number" && Number.isFinite(latest.average_impact)
        ? latest.average_impact
        : 0;
    const consistency =
      typeof latest?.consistency === "number" && Number.isFinite(latest.consistency)
        ? latest.consistency
        : 0;
    const impactValues = metrics?.impacts ?? [];
    const varianceFromSamples = computeVariance(impactValues);
    const variance =
      varianceFromSamples > 0
        ? varianceFromSamples
        : deriveVarianceFromConsistency(consistency);
    const collaborationWeight =
      collaborationWeights.get(agentId) && Number.isFinite(collaborationWeights.get(agentId)!)
        ? collaborationWeights.get(agentId)!
        : 0;

    return {
      agentId,
      rankScore: 0,
      impactRank: 0,
      consistencyRank: 0,
      collaborationRank: 0,
      impactAvg: Number.isFinite(impactAvg) ? impactAvg : 0,
      impactVariance: Number.isFinite(variance) ? variance : 0,
      collaborationWeightSum: Number.isFinite(collaborationWeight)
        ? collaborationWeight
        : 0,
      computedAt,
    };
  });

  if (entries.length === 0) {
    return { entries: [], insights: [] as LeaderboardInsight[] };
  }

  const maxImpact = Math.max(...entries.map((entry) => entry.impactAvg), 0);
  const maxCollaboration = Math.max(
    ...entries.map((entry) => entry.collaborationWeightSum),
    0
  );

  entries.forEach((entry) => {
    const impactScore =
      maxImpact > 0 ? clamp(entry.impactAvg / maxImpact) : clamp(entry.impactAvg);
    const consistencyScore = clamp(1 - Math.sqrt(entry.impactVariance));
    const collaborationScore =
      maxCollaboration > 0
        ? clamp(entry.collaborationWeightSum / maxCollaboration)
        : clamp(entry.collaborationWeightSum);
    const rankScore =
      impactScore * 0.5 + consistencyScore * 0.3 + collaborationScore * 0.2;
    entry.rankScore = formatScore(rankScore);
  });

  const byImpact = [...entries].sort(
    (a, b) => b.impactAvg - a.impactAvg || a.agentId.localeCompare(b.agentId)
  );
  byImpact.forEach((entry, index) => {
    entry.impactRank = index + 1;
  });

  const byConsistency = [...entries].sort(
    (a, b) =>
      a.impactVariance - b.impactVariance || a.agentId.localeCompare(b.agentId)
  );
  byConsistency.forEach((entry, index) => {
    entry.consistencyRank = index + 1;
  });

  const byCollaboration = [...entries].sort(
    (a, b) =>
      b.collaborationWeightSum - a.collaborationWeightSum ||
      a.agentId.localeCompare(b.agentId)
  );
  byCollaboration.forEach((entry, index) => {
    entry.collaborationRank = index + 1;
  });

  const byRankScore = [...entries].sort(
    (a, b) => b.rankScore - a.rankScore || a.agentId.localeCompare(b.agentId)
  );

  const topImpact = byImpact[0];
  const topConsistency = byConsistency[0];
  const topCollaboration = byCollaboration[0];

  const insights: LeaderboardInsight[] = [];

  if (topImpact) {
    insights.push({
      agentId: topImpact.agentId,
      category: "leaderboard",
      summary: `Top Performer: ${topImpact.agentId} leads with impact ${topImpact.impactAvg.toFixed(
        2
      )}.`,
      metric: {
        rank: topImpact.impactRank,
        impact_avg: Number(topImpact.impactAvg.toFixed(3)),
      },
    });
  }

  if (topConsistency) {
    insights.push({
      agentId: topConsistency.agentId,
      category: "leaderboard",
      summary: `Most Consistent: ${topConsistency.agentId} keeps variance at ${topConsistency.impactVariance.toFixed(
        3
      )}.`,
      metric: {
        rank: topConsistency.consistencyRank,
        impact_variance: Number(topConsistency.impactVariance.toFixed(4)),
      },
    });
  }

  if (topCollaboration) {
    insights.push({
      agentId: topCollaboration.agentId,
      category: "leaderboard",
      summary: `Most Collaborative: ${topCollaboration.agentId} leads with collaboration weight ${topCollaboration.collaborationWeightSum.toFixed(
        2
      )}.`,
      metric: {
        rank: topCollaboration.collaborationRank,
        collaboration_weight_sum: Number(
          topCollaboration.collaborationWeightSum.toFixed(3)
        ),
      },
    });
  }

  return {
    entries: byRankScore,
    insights,
  };
}

export async function persistLeaderboard(entries: LeaderboardEntry[], insights: LeaderboardInsight[]) {
  const supabase = getSupabaseAdminClient();

  const rows = entries.map((entry) => ({
    agent_id: entry.agentId,
    rank_score: entry.rankScore,
    impact_rank: entry.impactRank,
    consistency_rank: entry.consistencyRank,
    collaboration_rank: entry.collaborationRank,
    impact_avg: entry.impactAvg,
    impact_variance: entry.impactVariance,
    collaboration_weight_sum: entry.collaborationWeightSum,
    computed_at: entry.computedAt,
  }));

  const { error: upsertError } = await supabase
    .from("agent_leaderboard")
    .upsert(rows, { onConflict: "agent_id" });

  if (upsertError) {
    throw new Error(
      `[leaderboard] Failed to upsert leaderboard rows: ${upsertError.message}`
    );
  }

  const { error: deleteInsightsError } = await supabase
    .from("agent_insights")
    .delete()
    .eq("source_table", "agent_leaderboard");

  if (deleteInsightsError) {
    throw new Error(
      `[leaderboard] Failed to remove previous leaderboard insights: ${deleteInsightsError.message}`
    );
  }

  if (insights.length === 0) {
    return;
  }

  const insightRows = insights.map((insight) => ({
    agent_id: insight.agentId,
    source_table: "agent_leaderboard",
    source_id: null,
    insight_type: "phase28",
    summary: insight.summary,
    confidence: 0.9,
    meta: insight.metric,
    insight: insight.summary,
    category: insight.category,
  }));

  const { error: insertInsightsError } = await supabase
    .from("agent_insights")
    .insert(insightRows);

  if (insertInsightsError) {
    throw new Error(
      `[leaderboard] Failed to insert leaderboard insights: ${insertInsightsError.message}`
    );
  }
}

interface AgentInsightRow {
  id: string;
  agent_id: string | null;
  summary: string | null;
  meta: Record<string, unknown> | null;
  category?: string | null;
  created_at?: string | null;
}

export async function fetchLeaderboard(limit = 10) {
  const supabase = getSupabaseAdminClient();

  const [
    { data: leaderboardData, error: leaderboardError },
    { data: insightData, error: insightError },
  ] = await Promise.all([
    supabase
      .from("agent_leaderboard")
      .select("*")
      .order("rank_score", { ascending: false })
      .limit(limit),
    supabase
      .from("agent_insights")
      .select("id, agent_id, summary, meta, category, created_at")
      .eq("source_table", "agent_leaderboard")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (leaderboardError) {
    throw new Error(
      `[leaderboard] Failed to load leaderboard: ${leaderboardError.message}`
    );
  }

  if (insightError) {
    throw new Error(
      `[leaderboard] Failed to load leaderboard insights: ${insightError.message}`
    );
  }

  return {
    rows: leaderboardData ?? [],
    insights: (insightData as AgentInsightRow[] | null) ?? [],
  };
}
