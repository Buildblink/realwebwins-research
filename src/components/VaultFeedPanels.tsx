import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ResearchCard } from "@/components/ResearchCard";
import type { VaultFeedItem } from "@/types/supabase";

interface VaultFeedPanelsProps {
  topNew: VaultFeedItem[];
  mostRefreshed: VaultFeedItem[];
  layout?: "widget" | "page";
}

function formatConfidence(value: string | null): string {
  if (!value) return "Confidence: not set";
  const normalized = value.replace(/_/g, " ").trim();
  return `Confidence: ${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function formatRelative(value: string | null): string | null {
  if (!value) return null;
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return null;
  }
}

export function VaultFeedPanels({
  topNew,
  mostRefreshed,
  layout = "page",
}: VaultFeedPanelsProps) {
  const containerClass =
    layout === "widget"
      ? "rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm"
      : "space-y-10";

  const gridClass =
    layout === "widget"
      ? "grid gap-4 md:grid-cols-2"
      : "grid gap-6 md:grid-cols-2";

  const headingClass =
    layout === "widget"
      ? "text-lg font-semibold text-slate-900"
      : "text-2xl font-semibold text-slate-900";

  const metaClass = "text-xs text-slate-500";

  return (
    <div className={containerClass}>
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className={headingClass}>Top 5 new ideas this week</h2>
            {layout === "widget" ? (
              <Link
                href="/vault/feed"
                className="text-sm font-semibold text-primary hover:text-secondary"
              >
                View full feed →
              </Link>
            ) : null}
          </div>
          <p className="text-sm text-slate-600">
            The newest public research projects that landed in the vault in the
            past 7 days.
          </p>
        </div>

        {topNew.length > 0 ? (
          <div className={gridClass}>
            {topNew.map((item, index) => (
              <div key={`new-${item.id}`} className="space-y-2">
                <ResearchCard
                  project={{
                    id: item.id,
                    title: item.title,
                    idea_description: item.idea_description,
                    created_at: item.created_at,
                    score: item.score,
                    verdict: item.verdict,
                  }}
                  index={index}
                  variant="compact"
                />
                <p className={metaClass}>
                  Published {formatRelative(item.created_at) ?? "recently"} ·{" "}
                  {formatConfidence(item.confidence)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-500">
            No public projects were published this week. Check back soon!
          </div>
        )}
      </div>

      <div className="space-y-6 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className={headingClass}>Most refreshed projects</h2>
          {layout === "widget" ? (
            <Link
              href="/vault/feed"
              className="text-sm font-semibold text-primary hover:text-secondary"
            >
              Browse all updates →
            </Link>
          ) : null}
        </div>
        <p className="text-sm text-slate-600">
          Projects the research agent revisited most recently, showing the
          latest learnings.
        </p>

        {mostRefreshed.length > 0 ? (
          <div className={gridClass}>
            {mostRefreshed.map((item, index) => (
              <div key={`refresh-${item.id}`} className="space-y-2">
                <ResearchCard
                  project={{
                    id: item.id,
                    title: item.title,
                    idea_description: item.idea_description,
                    created_at: item.created_at,
                    score: item.score,
                    verdict: item.verdict,
                  }}
                  index={index}
                  variant="compact"
                />
                <p className={metaClass}>
                  Refreshed{" "}
                  {formatRelative(
                    item.last_refreshed_at ?? item.updated_at ?? item.created_at
                  ) ?? "just now"}{" "}
                  · {formatConfidence(item.confidence)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-500">
            No refresh runs have completed yet. Track a project to see it here.
          </div>
        )}
      </div>
    </div>
  );
}
