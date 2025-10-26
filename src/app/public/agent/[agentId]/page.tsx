import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPublicAgentProfile } from "@/lib/agents/public";
import type { Metadata } from "next";

type Params = Promise<{ agentId: string }>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const params = await props.params;
  const agentId = params.agentId;
  return {
    title: `Agent ${agentId} — RealWebWins`,
    description: `Performance history and reflections for agent ${agentId}.`,
    openGraph: {
      title: `Agent ${agentId}`,
      description: `Performance history and reflections from the RealWebWins research system.`,
    },
    twitter: {
      card: "summary",
      title: `Agent ${agentId}`,
      description: `Performance history and reflections from the RealWebWins research system.`,
    },
  };
}

function formatNumber(value: unknown, fractionDigits = 2) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(fractionDigits);
  }
  return "0.00";
}

function formatDate(value: unknown) {
  if (typeof value !== "string") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default async function PublicAgentPage(props: { params: Params }) {
  const params = await props.params;
  const agentId = params.agentId;
  const profile = await fetchPublicAgentProfile(agentId);

  if (!profile.leaderboard) {
    return notFound();
  }

  const metrics = profile.metrics ?? [];
  const reflections = profile.reflections ?? [];

  return (
    <main className="min-h-screen bg-[#060608] px-6 py-12 text-zinc-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Agent Profile: {agentId}
          </h1>
          <p className="text-sm text-zinc-400">
            Snapshot of the agent&apos;s leaderboard scores, performance metrics, and
            latest reflections gathered by RealWebWins.
          </p>
          <Link
            href="/public/leaderboard"
            className="inline-flex items-center justify-center rounded-md border border-white/10 px-4 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
          >
            ← Back to Leaderboard
          </Link>
        </header>

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <h2 className="text-lg font-semibold text-indigo-200">Leaderboard Stats</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                Rank Score
              </dt>
              <dd className="text-xl font-semibold text-white">
                {formatNumber((profile.leaderboard as Record<string, unknown>)?.rank_score)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                Impact Average
              </dt>
              <dd className="text-xl font-semibold text-white">
                {formatNumber((profile.leaderboard as Record<string, unknown>)?.impact_avg)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                Consistency Rank
              </dt>
              <dd className="text-xl font-semibold text-white">
                #
                {(
                  (profile.leaderboard as Record<string, unknown>)?.consistency_rank ??
                  "—"
                ).toString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                Collaboration Weight
              </dt>
              <dd className="text-xl font-semibold text-white">
                {formatNumber(
                  (profile.leaderboard as Record<string, unknown>)?.collaboration_weight_sum
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-indigo-200">
              Recent Metrics
            </h2>
            <p className="text-xs text-zinc-500">
              Snapshot of the latest computed averages and consistency scores.
            </p>
          </header>

          {metrics.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No metric history available for this agent yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-2 text-left">Captured</th>
                    <th className="px-3 py-2 text-right">Impact Avg</th>
                    <th className="px-3 py-2 text-right">Consistency</th>
                    <th className="px-3 py-2 text-right">Reflections</th>
                    <th className="px-3 py-2 text-right">Behaviors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {metrics.map((row, index) => (
                    <tr key={`${row.created_at ?? index}`} className="text-zinc-200">
                      <td className="px-3 py-2 text-left">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(row.average_impact)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(row.consistency)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {(row.reflection_count as number | undefined) ?? 0}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {(row.behavior_count as number | undefined) ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-indigo-200">
              Latest Reflections
            </h2>
            <p className="text-xs text-zinc-500">
              Excerpts generated by the reflection agent with impact metadata.
            </p>
          </header>

          {reflections.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No reflections recorded yet for this agent.
            </p>
          ) : (
            <div className="space-y-3">
              {reflections.map((reflection, index) => (
                <article
                  key={`${reflection.created_at ?? index}`}
                  className="rounded-md border border-white/10 bg-[#1b1b1f] p-3 text-sm"
                >
                  <header className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                    <span>{formatDate(reflection.created_at)}</span>
                    <span>
                      Impact:{" "}
                      {formatNumber(
                        (reflection.metadata as Record<string, unknown>)?.impact ?? 0
                      )}
                    </span>
                  </header>
                  <p className="text-sm text-zinc-100">
                    {reflection.summary ?? reflection.content ?? "No summary available."}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
