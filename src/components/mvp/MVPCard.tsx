interface MVPCardProps {
  output: {
    id: string;
    title: string | null;
    summary: string | null;
    stack: string | null;
    pricing: string | null;
    risk: string | null;
    validation_score: number | null;
  };
}

export function MVPCard({ output }: MVPCardProps) {
  const validation = ((output.validation_score ?? 0) * 100).toFixed(0);

  return (
    <article className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 shadow-lg shadow-black/20 backdrop-blur">
      <header className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#00ffe0]">MVP Blueprint</p>
          <h2 className="text-2xl font-semibold text-white md:text-3xl">
            {output.title ?? "AI Generated MVP"}
          </h2>
        </div>
        <span className="inline-flex items-center rounded-full bg-[#ffb300]/15 px-4 py-1 text-sm font-semibold text-[#ffb300]">
          Validation {validation}%
        </span>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-zinc-400">Summary</h3>
          <p className="text-sm text-zinc-200">
            {output.summary ?? "This MVP summary will appear once the agents complete their run."}
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-zinc-400">Stack</h3>
          <p className="text-sm text-zinc-200">{output.stack ?? "Not specified"}</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-zinc-400">Pricing</h3>
          <p className="text-sm text-zinc-200">{output.pricing ?? "Not specified"}</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-zinc-400">Risk</h3>
          <p className="text-sm text-zinc-200">{output.risk ?? "Not specified"}</p>
        </div>
      </section>
    </article>
  );
}
