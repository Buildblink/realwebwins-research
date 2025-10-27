"use client";

interface RunHistoryProps {
  runs: Array<{
    id: string;
    agent_id: string | null;
    llm_provider: string | null;
    llm_model: string | null;
    duration_ms: number | null;
    created_at: string;
    output: Record<string, unknown> | null;
  }>;
}

export function RunHistory({ runs }: RunHistoryProps) {
  if (runs.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
        Prompt run history will appear here after you test agents.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Run History</h3>
        <span className="text-xs text-zinc-500">Latest {runs.length}</span>
      </header>
      <div className="space-y-3">
        {runs.map((run) => (
          <article key={run.id} className="rounded border border-white/10 bg-[#0f1117] p-3 text-xs text-zinc-300">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
              <span>{new Date(run.created_at).toLocaleString()}</span>
              <span>
                {(run.llm_provider ?? "provider").toUpperCase()} · {run.llm_model ?? "model"} · {run.duration_ms ?? 0}ms
              </span>
            </div>
            <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-[11px] text-zinc-200">
              {JSON.stringify(run.output ?? {}, null, 2)}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}
