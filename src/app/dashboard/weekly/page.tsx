import Link from "next/link";
import { listWeeklySummaries } from "@/lib/agents/summary";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export default async function WeeklySummariesPage() {
  const summaries = await listWeeklySummaries(20);

  return (
    <main className="min-h-screen bg-[#060608] p-6 text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">
            Weekly Agent Summaries
          </h1>
          <p className="text-sm text-zinc-400">
            Auto-generated Monday at 09:00 UTC with leaderboards and highlights.
          </p>
          <p className="text-xs text-zinc-500">
            Cron endpoint: <code className="text-indigo-300">/api/cron/weekly-summary</code>
          </p>
        </header>

        {summaries.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No weekly summaries recorded yet. Trigger the cron endpoint to seed
            the first report.
          </p>
        ) : (
          <div className="space-y-4">
            {summaries.map((summary) => (
              <article
                key={summary.id ?? summary.week_start}
                className="rounded-lg border border-white/10 bg-[#111113] p-4"
              >
                <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-indigo-200">
                      Week of {formatDate(summary.week_start)}
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Created {summary.created_at ? new Date(summary.created_at).toLocaleString() : "unknown"}
                    </p>
                  </div>
                  {summary.markdown ? (
                    <Link
                      href={`data:text/markdown;charset=utf-8,${encodeURIComponent(
                        summary.markdown
                      )}`}
                      download={`realwebwins-weekly-${summary.week_start}.md`}
                      className="inline-flex items-center justify-center rounded-md border border-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/10"
                    >
                      Download .md
                    </Link>
                  ) : null}
                </header>
                <section className="space-y-2 text-sm text-zinc-200">
                  <h3 className="font-semibold text-zinc-100">Highlights</h3>
                  <ul className="list-disc space-y-1 pl-4 text-zinc-400">
                    {Array.isArray((summary.report as Record<string, unknown>)?.insights) &&
                    (summary.report as Record<string, unknown>)?.insights
                      ? ((summary.report as Record<string, unknown>)?.insights as Array<{
                          summary?: string;
                        }>).map((insight, index) => (
                          <li key={index}>{insight?.summary ?? "Untitled insight"}</li>
                        ))
                      : [<li key="none">No insight data captured.</li>]}
                  </ul>
                </section>
                {summary.markdown ? (
                  <details className="mt-3 rounded-md border border-white/10 bg-black/20 p-3 text-xs text-zinc-400">
                    <summary className="cursor-pointer text-indigo-300">
                      View Markdown
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-zinc-300">
                      {summary.markdown}
                    </pre>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
