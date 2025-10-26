"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AgentMetricRow {
  id: string;
  agent_id: string;
  average_impact: number | null;
  consistency: number | null;
  reflection_count: number | null;
  behavior_count: number | null;
  created_at: string;
  last_tune_at?: string | null;
  meta?: Record<string, unknown> | null;
}

interface MetricsResponse {
  success: boolean;
  data: AgentMetricRow[];
  error?: string;
  message?: string;
}

const agentPalette = [
  "#22d3ee",
  "#c084fc",
  "#f7c948",
  "#f97316",
  "#34d399",
  "#f472b6",
  "#a3e635",
  "#60a5fa",
];

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.toLocaleDateString()} ${date
    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    .toLowerCase()}`;
}

function ConsistencyGauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(1, value));
  const percent = Math.round(clamped * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="h-2 w-full rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-emerald-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400">{percent}% steady</span>
    </div>
  );
}

export default function AgentAnalyticsPage() {
  const [metrics, setMetrics] = useState<AgentMetricRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadMetrics() {
      try {
        const response = await fetch("/api/agents/metrics", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Failed to load metrics (${response.status})`);
        }
        const json = (await response.json()) as MetricsResponse;
        if (!json.success) {
          throw new Error(json.message ?? json.error ?? "Unknown error");
        }
        if (mounted) {
          setMetrics(json.data ?? []);
          setError(null);
        }
      } catch (err) {
        console.error("[dashboard.agent-analytics] Load failed", err);
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Unable to load metrics data."
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadMetrics();
    const interval = setInterval(loadMetrics, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const agents = useMemo(() => {
    return Array.from(new Set(metrics.map((row) => row.agent_id))).sort();
  }, [metrics]);

  const colorByAgent = useMemo(() => {
    return new Map(
      agents.map((agentId, index) => [
        agentId,
        agentPalette[index % agentPalette.length],
      ])
    );
  }, [agents]);

  const chartData = useMemo(() => {
    const grouped = new Map<string, Record<string, unknown>>();

    metrics.forEach((row) => {
      const timestamp = row.created_at ?? row.last_tune_at ?? "";
      if (!timestamp) {
        return;
      }
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const key = date.toISOString();
      const entry =
        grouped.get(key) ??
        {
          timestamp: key,
          label: formatTimestamp(timestamp),
        };
      entry[row.agent_id] = row.average_impact ?? 0;
      grouped.set(key, entry);
    });

    return Array.from(grouped.values()).sort((a, b) => {
      const dateA = new Date(String(a.timestamp)).getTime();
      const dateB = new Date(String(b.timestamp)).getTime();
      return dateA - dateB;
    });
  }, [metrics]);

  const latestByAgent = useMemo(() => {
    const latest = new Map<string, AgentMetricRow>();
    metrics.forEach((row) => {
      const existing = latest.get(row.agent_id);
      if (!existing) {
        latest.set(row.agent_id, row);
        return;
      }
      const createdAt = new Date(row.created_at ?? 0).getTime();
      const existingTime = new Date(existing.created_at ?? 0).getTime();
      if (createdAt > existingTime) {
        latest.set(row.agent_id, row);
      }
    });
    return latest;
  }, [metrics]);

  return (
    <main className="min-h-screen bg-[#060608] p-6 text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header>
          <h1 className="text-3xl font-semibold text-sky-300">
            Agent Performance Analytics
          </h1>
          <p className="text-sm text-zinc-400">
            Track average impact trends and stability across autonomous agents.
          </p>
        </header>

        {error && (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Performance Over Time
              </h2>
              <p className="text-xs text-zinc-500">
                Average impact scores grouped by collection timestamp.
              </p>
            </div>
            {isLoading && (
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                Loading…
              </span>
            )}
          </header>

          {chartData.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No metrics recorded yet. Run `/api/agents/metrics` to populate
              trends.
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111113",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "0.5rem",
                    }}
                    labelStyle={{ color: "#d4d4d8" }}
                  />
                  <Legend />
                  {agents.map((agentId) => (
                    <Line
                      key={agentId}
                      type="monotone"
                      dataKey={agentId}
                      stroke={colorByAgent.get(agentId)}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">
              Consistency Snapshot
            </h2>
            <p className="text-xs text-zinc-500">
              Latest stability, reflections, and behavior triggers for each agent.
            </p>
          </header>

          {latestByAgent.size === 0 ? (
            <p className="text-sm text-zinc-500">
              Consistency scores will appear after the first metrics run.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from(latestByAgent.entries()).map(([agentId, row]) => {
                const consistency = row.consistency ?? 0;
                const averageImpact = row.average_impact ?? 0;
                return (
                  <article
                    key={agentId}
                    className="rounded-md border border-white/10 bg-[#1b1b1f] p-4"
                  >
                    <header className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-indigo-300">
                        {agentId}
                      </h3>
                      <span className="text-xs text-zinc-500">
                        {formatTimestamp(row.created_at)}
                      </span>
                    </header>
                    <div className="mb-3 flex items-baseline gap-2">
                      <span className="text-2xl font-semibold text-zinc-100">
                        {averageImpact.toFixed(2)}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-zinc-500">
                        Avg Impact
                      </span>
                    </div>
                    <ConsistencyGauge value={consistency} />
                    <footer className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                      <span>
                        {row.reflection_count ?? 0} reflections
                      </span>
                      <span>{row.behavior_count ?? 0} behaviors</span>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
