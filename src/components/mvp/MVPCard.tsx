import Link from "next/link";

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
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">{output.title ?? "MVP Blueprint"}</h2>
        <span className="rounded-full bg-[#ffb300]/20 px-3 py-1 text-xs font-semibold text-[#ffb300]">
          Validation {(output.validation_score ?? 0) * 100}%
        </span>
      </header>
      <section className="space-y-4 text-sm text-zinc-300">
        <div>
          <h3 className="text-xs uppercase tracking-wide text-zinc-500">Summary</h3>
          <p className="mt-1 text-zinc-100">{output.summary ?? "Not available"}</p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-zinc-500">Stack</h3>
          <p className="mt-1">{output.stack ?? "Not specified"}</p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-zinc-500">Pricing</h3>
          <p className="mt-1">{output.pricing ?? "Not specified"}</p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-zinc-500">Risks</h3>
          <p className="mt-1">{output.risk ?? "Not specified"}</p>
        </div>
      </section>
      <footer className="mt-5 flex justify-end">
        <Link
          href={`/api/export/mvp/${output.id}`}
          className="rounded-lg bg-[#00ffe0]/20 px-4 py-2 text-sm font-medium text-[#00ffe0] transition hover:bg-[#00ffe0]/30"
        >
          Download Pack
        </Link>
      </footer>
    </article>
  );
}
