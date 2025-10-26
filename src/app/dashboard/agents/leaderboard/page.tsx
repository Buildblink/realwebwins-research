"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AgentTabs } from "@/components/agents/AgentTabs";

interface LeaderboardRow {
  id?: string;
  agent_id: string;
  rank_score: number;
  impact_rank: number;
  consistency_rank: number;
  collaboration_rank: number;
  impact_avg: number;
  impact_variance: number;
  collaboration_weight_sum: number;
  computed_at: string;
}

interface InsightRow {
  id: string;
  agent_id: string | null;
  summary: string | null;
  meta: Record<string, unknown> | null;
  category?: string | null;
  created_at?: string | null;
}

interface LeaderboardResponse {
  success: boolean;
  data: LeaderboardRow[];
  insights: InsightRow[];
  error?: string;
  message?: string;
}

function formatNumber(value: number, fractionDigits = 2) {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(fractionDigits);
}

function formatRank(rank: number) {
  return `#${Number.isFinite(rank) ? rank : 0}`;
}

export default function AgentLeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let controller = new AbortController();

    async function loadLeaderboard() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/agents/leaderboard", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load leaderboard (${response.status})`);
        }
        const json = (await response.json()) as LeaderboardResponse;
        if (!json.success) {
          throw new Error(json.message ?? json.error ?? "Unknown error");
        }
        if (mounted) {
          setRows(json.data ?? []);
          setInsights(json.insights ?? []);
          setError(null);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        console.error("[dashboard.agents.leaderboard] Load failed", err);
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Unable to load leaderboard."
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadLeaderboard();
    const interval = setInterval(() => {
      controller.abort();
      controller = new AbortController();
      loadLeaderboard();
    }, 10000);

    return () => {
      mounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  const chartData = useMemo(() => {
    return rows.map((row) => ({
      agent: row.agent_id,
      rank_score: row.rank_score,
      impact_avg: row.impact_avg,
      collaboration_weight_sum: row.collaboration_weight_sum,
    }));
  }, [rows]);

  const updatedAt = useMemo(() => {
    if (rows.length === 0) return null;
    const timestamps = rows
      .map((row) => new Date(row.computed_at).getTime())
      .filter((value) => Number.isFinite(value));
    if (timestamps.length === 0) return null;
    const max = Math.max(...timestamps);
    return new Date(max);
  }, [rows]);

  return (
    <main className="min-h-screen bg-[#060608] p-6 text-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-white">
            Agent Leaderboard
          </h1>
          <p className="text-sm text-zinc-400">
            Ranked impact, consistency, and collaboration metrics across all autonomous agents.
          </p>
          <AgentTabs />
        </div>

        {error && (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <h2 className="text-lg font-semibold text-indigo-200">Share Publicly</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Promote agent performance externally with the public leaderboard and
            agent profile pages.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/public/leaderboard"
              className="inline-flex items-center rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            >
              View Public Leaderboard
            </Link>
            <Link
              href="/public/agent/agent_researcher"
              className="inline-flex items-center rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/10"
            >
              Sample Agent Profile
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Rank Score Overview
              </h2>
              <p className="text-xs text-zinc-500">
                Composite scores weighting impact (50%), consistency (30%), and collaboration (20%).
              </p>
            </div>
            <span className="text-xs text-zinc-500">
              {isLoading
                ? "Refreshing…"
                : updatedAt
                ? `Updated ${updatedAt.toLocaleTimeString()}`
                : "Awaiting data"}
            </span>
          </header>

          {chartData.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No leaderboard entries yet. Run POST `/api/agents/leaderboard` to generate rankings.
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="agent" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#111113",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "0.5rem",
                    }}
                    labelStyle={{ color: "#d4d4d8" }}
                  />
                  <Bar dataKey="rank_score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">
              Top 10 Agents
            </h2>
            <p className="text-xs text-zinc-500">
              Sorted by composite rank score. Lower ranks indicate better performance.
            </p>
          </header>

          {rows.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Leaderboard entries will appear after the recompute job completes.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/5 text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-2 text-left">Rank</th>
                    <th className="px-3 py-2 text-left">Agent</th>
                    <th className="px-3 py-2 text-right">Impact Avg</th>
                    <th className="px-3 py-2 text-right">Impact Rank</th>
                    <th className="px-3 py-2 text-right">Variance</th>
                    <th className="px-3 py-2 text-right">Consistency Rank</th>
                    <th className="px-3 py-2 text-right">Collab Weight</th>
                    <th className="px-3 py-2 text-right">Collab Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((row, index) => (
                    <tr key={row.agent_id} className="text-zinc-200">
                      <td className="px-3 py-2 text-left">{formatRank(index + 1)}</td>
                      <td className="px-3 py-2 font-medium text-indigo-200">
                        {row.agent_id}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(row.impact_avg)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatRank(row.impact_rank)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(row.impact_variance, 4)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatRank(row.consistency_rank)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(row.collaboration_weight_sum)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatRank(row.collaboration_rank)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Insight Feed
              </h2>
              <p className="text-xs text-zinc-500">
                Generated automatically after each recompute run.
              </p>
            </div>
            {isLoading && (
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                Refreshing…
              </span>
            )}
          </header>

          {insights.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No insights yet. Trigger a leaderboard recompute to populate highlights.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {insights.map((insight) => (
                <article
                  key={insight.id}
                  className="rounded-md border border-white/10 bg-[#1b1b1f] p-3"
                >
                  <header className="mb-2 text-xs uppercase tracking-wide text-indigo-300">
                    {insight.category ?? "leaderboard"}
                  </header>
                  <p className="text-sm text-zinc-100">
                    {insight.summary ?? "Insight unavailable."}
                  </p>
                  <footer className="mt-3 text-xs text-zinc-500">
                    Agent: {insight.agent_id ?? "unknown"}
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
