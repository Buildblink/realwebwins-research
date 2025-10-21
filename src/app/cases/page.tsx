import { loadFeed, resolveImageUrl } from "@/lib/feed/loadFeed";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseSearchParams(params: Record<string, string | string[] | undefined>) {
  const getValue = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value ?? "";
  };

  const platform = getValue("platform").toLowerCase();
  const minScoreRaw = getValue("minScore");
  const minScore = Number.isFinite(Number(minScoreRaw))
    ? Number(minScoreRaw)
    : null;

  return { platform, minScore };
}

function formatScore(score: number | null | undefined) {
  if (typeof score === "number" && Number.isFinite(score)) {
    return `${score}/100`;
  }
  return "Pending";
}

function formatTimestamp(iso?: string | null) {
  if (!iso) return "Unknown";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toISOString().slice(0, 10);
}

export default async function CasesPage(props: { searchParams: SearchParams }) {
  const searchParams = parseSearchParams(await props.searchParams);
  const feed = await loadFeed();
  const projects = feed.projects ?? [];

  const platforms = Array.from(
    new Set(
      projects
        .map((project) => (project.platform ?? "").trim())
        .filter((value) => value.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  const filtered = projects.filter((project) => {
    const matchesPlatform = searchParams.platform
      ? (project.platform ?? "").toLowerCase() === searchParams.platform
      : true;

    const matchesScore =
      searchParams.minScore !== null
        ? typeof project.score === "number" &&
          project.score >= searchParams.minScore
        : true;

    return matchesPlatform && matchesScore;
  });

  const sorted = filtered.sort((a, b) => {
    const timeA = a.last_refreshed_at ? Date.parse(a.last_refreshed_at) : 0;
    const timeB = b.last_refreshed_at ? Date.parse(b.last_refreshed_at) : 0;
    return timeB - timeA;
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Realwebwins Cases</h1>
        <p className="text-muted-foreground">
          Verified indie wins sourced by the Realwebwins research agent. Filter
          by platform or validation score to explore what&rsquo;s working.
        </p>

        <form className="flex flex-wrap gap-4" action="/cases" method="get">
          <div className="flex flex-col gap-2">
            <label htmlFor="platform" className="text-sm font-medium">
              Platform
            </label>
            <select
              id="platform"
              name="platform"
              defaultValue={searchParams.platform}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">All platforms</option>
              {platforms.map((platform) => (
                <option key={platform} value={platform.toLowerCase()}>
                  {platform}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="minScore" className="text-sm font-medium">
              Minimum validation score
            </label>
            <input
              id="minScore"
              name="minScore"
              type="number"
              min={0}
              max={100}
              step={5}
              defaultValue={searchParams.minScore ?? ""}
              placeholder="e.g. 60"
              className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Apply filters
            </button>
            <Link
              href="/cases"
              className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-muted-foreground/40 p-8 text-center text-muted-foreground">
            No cases match the current filters.
          </div>
        ) : (
          sorted.map((project) => {
            const slug =
              project.slug ??
              slugifyFallback(project.title ?? project.id ?? "case");
            const imageUrl = resolveImageUrl(project);
            return (
              <article
                key={slug}
                className="flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm transition hover:shadow-md"
              >
                <Link href={`/case/${slug}`} className="block">
                  <Image
                    src={imageUrl}
                    alt={project.title ?? "Realwebwins case card"}
                    width={1200}
                    height={675}
                    unoptimized
                    className="h-auto w-full"
                  />
                </Link>
                <div className="flex flex-col gap-3 px-6 py-5">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="uppercase tracking-wide">
                      {project.platform ?? "Independent"}
                    </span>
                    <span>Refreshed {formatTimestamp(project.last_refreshed_at)}</span>
                  </div>
                  <h2 className="text-xl font-semibold">
                    <Link href={`/case/${slug}`}>{project.title ?? "Untitled project"}</Link>
                  </h2>
                  <p className="text-muted-foreground">
                    {project.summary ?? "Summary unavailable."}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                      Score: {formatScore(project.score ?? null)}
                    </span>
                    {project.proof_link ? (
                      <a
                        href={project.proof_link}
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Proof
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

function slugifyFallback(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "case";
}

