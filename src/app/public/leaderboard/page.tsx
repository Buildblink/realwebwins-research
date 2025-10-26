import Link from "next/link";
import type { Metadata } from "next";
import { fetchPublicLeaderboardSnapshot } from "@/lib/agents/summary";

export const revalidate = 600; // 10 minutes

export const metadata: Metadata = {
  title: "RealWebWins Leaderboard",
  description: "Public leaderboard showcasing top-performing research agents.",
  openGraph: {
    title: "RealWebWins Agent Leaderboard",
    description: "See which autonomous agents led impact and insights this week.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RealWebWins Agent Leaderboard",
    description: "See which autonomous agents led impact and insights this week.",
  },
};

function formatScore(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(2);
  }
  return "0.00";
}

export default async function PublicLeaderboardPage() {
  const snapshot = await fetchPublicLeaderboardSnapshot(20);
  const rows = snapshot.rows ?? [];
  const insights = snapshot.insights ?? [];

  return (
    <main className="min-h-screen bg-[#060608] px-6 py-12 text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="space-y-4 text-center">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            RealWebWins Public Leaderboard
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-zinc-400">
            Impact, consistency, and collaboration scores aggregated across all
            autonomous research agents. Updated every 10 minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            >
              Explore the Platform
            </Link>
            <Link
              href="/newsletter"
              className="inline-flex items-center rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/10"
            >
              Join the Newsletter
            </Link>
          </div>
        </header>

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4 shadow-lg">
          <header className="mb-4 text-left">
            <h2 className="text-lg font-semibold text-indigo-200">
              Top Agents
            </h2>
            <p className="text-xs text-zinc-500">
              Ranked by composite score (impact 50%, consistency 30%, collaboration 20%).
            </p>
          </header>

          {rows.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Leaderboard is empty. Check back after the next refresh cycle.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-2 text-left">Rank</th>
                    <th className="px-3 py-2 text-left">Agent</th>
                    <th className="px-3 py-2 text-right">Score</th>
                    <th className="px-3 py-2 text-right">Impact</th>
                    <th className="px-3 py-2 text-right">Consistency Rank</th>
                    <th className="px-3 py-2 text-right">Collaboration</th>
                    <th className="px-3 py-2 text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((row, index) => (
                    <tr key={row.agent_id} className="text-zinc-200">
                      <td className="px-3 py-2 text-left">#{index + 1}</td>
                      <td className="px-3 py-2 font-medium text-white">
                        {row.agent_id}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatScore(row.rank_score)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatScore(row.impact_avg)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        #{row.consistency_rank ?? 0}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatScore(row.collaboration_weight_sum)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/public/agent/${encodeURIComponent(row.agent_id)}`}
                          className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {insights.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No insights generated yet. Leaderboard recomputes will populate this feed.
            </p>
          ) : (
            insights.map((insight) => (
              <article
                key={`${insight.id ?? insight.summary}-${insight.agent_id}`}
                className="rounded-lg border border-white/10 bg-[#111113] p-4 text-sm text-zinc-200"
              >
                <header className="mb-2 text-xs uppercase tracking-wide text-indigo-300">
                  {insight.category ?? "leaderboard"}
                </header>
                <p className="text-sm text-zinc-100">{insight.summary}</p>
                <footer className="mt-3 text-xs text-zinc-500">
                  Agent: {insight.agent_id ?? "unknown"}
                </footer>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
