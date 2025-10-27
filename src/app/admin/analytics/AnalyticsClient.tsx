"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface MetricRow {
  agent_id: string | null;
  llm_provider: string | null;
  llm_model: string | null;
  tokens: number | null;
  duration_ms: number | null;
  success: boolean | null;
  created_at: string;
}

interface AnalyticsClientProps {
  adminEnabled: boolean;
}

export function AnalyticsClient({ adminEnabled }: AnalyticsClientProps) {
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminEnabled) {
      setLoading(false);
      return;
    }

    async function loadMetrics() {
      try {
        const response = await fetch("/api/admin/analytics");
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json?.message ?? "Failed to load analytics");
        }
        setMetrics(json.data as MetricRow[]);
      } catch (cause) {
        console.error(cause);
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setLoading(false);
      }
    }

    loadMetrics().catch((cause) => {
      console.error(cause);
      setError(cause instanceof Error ? cause.message : String(cause));
      setLoading(false);
    });
  }, [adminEnabled]);

  const providerStats = useMemo(() => {
    const stats = new Map<
      string,
      { count: number; success: number; durationSum: number; tokenSum: number }
    >();

    metrics.forEach((entry) => {
      const provider = entry.llm_provider ?? "unknown";
      const current = stats.get(provider) ?? { count: 0, success: 0, durationSum: 0, tokenSum: 0 };
      current.count += 1;
      current.success += entry.success ? 1 : 0;
      current.durationSum += entry.duration_ms ?? 0;
      current.tokenSum += entry.tokens ?? 0;
      stats.set(provider, current);
    });

    return Array.from(stats.entries()).map(([provider, data]) => ({
      provider,
      count: data.count,
      successRate: data.count > 0 ? Math.round((data.success / data.count) * 100) : 0,
      avgDuration: data.count > 0 ? Math.round(data.durationSum / data.count) : 0,
      avgTokens: data.count > 0 ? Math.round(data.tokenSum / Math.max(data.count, 1)) : 0,
    }));
  }, [metrics]);

  const timelineData = useMemo(() => {
    const grouped = metrics
      .slice()
      .reverse()
      .map((entry) => ({
        timestamp: new Date(entry.created_at).toLocaleTimeString(),
        duration_ms: entry.duration_ms ?? 0,
      }));
    return grouped;
  }, [metrics]);

  if (!adminEnabled) {
    return (
      <div className="p-8 text-sm text-zinc-400">
        Admin mode is disabled. Set <code>ADMIN_MODE=true</code> to view analytics.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#04040c] via-[#0a0f1f] to-[#030304] p-6 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-purple-500/30 bg-white/5 p-6 shadow-2xl shadow-purple-500/10">
          <span className="text-sm uppercase tracking-[0.35em] text-purple-300/80">
            Agent Telemetry
          </span>
          <h1 className="mt-2 text-3xl font-bold text-white">Performance Analytics</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Monitor provider response times, token usage, and success rates across your automated agent runs.
          </p>
        </header>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
            Loading analytics...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
            ⚠️ {error}
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              {providerStats.map((stat) => (
                <div
                  key={stat.provider}
                  className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur"
                >
                  <h2 className="text-xs uppercase tracking-wide text-purple-200/80">
                    {stat.provider}
                  </h2>
                  <p className="mt-2 text-2xl font-bold text-white">{stat.count}</p>
                  <div className="mt-3 space-y-1 text-xs text-zinc-300">
                    <p>✅ Success rate: {stat.successRate}%</p>
                    <p>⏱ Avg duration: {stat.avgDuration} ms</p>
                    <p>🪙 Avg tokens: {stat.avgTokens}</p>
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-white">Response Time Trend</h2>
              <p className="text-sm text-zinc-400">
                Recent agent executions grouped chronologically.
              </p>
              <div className="mt-6 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="colorDur" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.85} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="timestamp" stroke="#ddd" tick={{ fill: "#aaa", fontSize: 12 }} />
                    <YAxis stroke="#ddd" tick={{ fill: "#aaa", fontSize: 12 }} />
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111", borderRadius: "12px", border: "1px solid #333" }}
                      labelStyle={{ color: "#aaa" }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="duration_ms"
                      stroke="#8b5cf6"
                      fillOpacity={1}
                      fill="url(#colorDur)"
                      name="Duration (ms)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
