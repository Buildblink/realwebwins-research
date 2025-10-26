import Link from "next/link";
import type { PainPoint } from "@/types/painpoint";

interface PainCardProps {
  painPoint: PainPoint;
}

export function PainCard({ painPoint }: PainCardProps) {
  return (
    <article className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-[#00ffe0]/60 hover:bg-white/10">
      <header className="mb-2 flex items-center justify-between text-xs text-zinc-500">
        <span>{painPoint.category ?? "Uncategorized"}</span>
        {typeof painPoint.popularity_score === "number" ? (
          <span className="rounded-full bg-[#00ffe0]/10 px-2 py-0.5 text-[#00ffe0]">
            Popularity {painPoint.popularity_score.toFixed(1)}
          </span>
        ) : null}
      </header>
      <h3 className="text-lg font-semibold text-white">
        {painPoint.summary ?? painPoint.text}
      </h3>
      <p className="mt-2 text-sm text-zinc-400 line-clamp-3">{painPoint.text}</p>
      <footer className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span>{painPoint.source ?? "Crowdsourced"}</span>
        <Link
          href={`/pain/${encodeURIComponent(painPoint.id)}`}
          className="text-[#6366f1] transition hover:text-white"
        >
          Open Studio →
        </Link>
      </footer>
    </article>
  );
}
