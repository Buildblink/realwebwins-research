"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchBar } from "@/components/painpoint/SearchBar";
import { PainCard } from "@/components/painpoint/PainCard";
import type { PainPoint } from "@/types/painpoint";

const CATEGORIES_FALLBACK = [
  "AI",
  "SaaS",
  "E-commerce",
  "Freelance",
  "Content",
  "Fintech",
];

interface DiscoverClientProps {
  initialPainPoints: PainPoint[];
  trending: PainPoint[];
  categories: string[];
  initialQuery?: string;
}

export function DiscoverClient({
  initialPainPoints,
  trending,
  categories,
  initialQuery,
}: DiscoverClientProps) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [activeCategory, setActiveCategory] = useState("All");
  const [results, setResults] = useState(initialPainPoints);
  const [isLoading, setIsLoading] = useState(false);

  const categoryList = useMemo(() => {
    const items = categories.length > 0 ? categories : ["All", ...CATEGORIES_FALLBACK];
    return items.includes("All") ? items : ["All", ...items];
  }, [categories]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (activeCategory && activeCategory !== "All") {
          params.set("category", activeCategory);
        }
        params.set("sort", "popularity");
        const response = await fetch(`/api/painpoints?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to search pain points (${response.status})`);
        }
        const json = (await response.json()) as { data?: PainPoint[]; success?: boolean };
        if (json.success && Array.isArray(json.data)) {
          setResults(json.data);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("[discover.search]", error);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query, activeCategory]);

  function pickRandomPain() {
    const pool = results.length > 0 ? results : trending;
    if (pool.length === 0) return;
    const random = pool[Math.floor(Math.random() * pool.length)];
    window.location.href = `/pain/${encodeURIComponent(random.id)}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchBar
          defaultValue={query}
          isLoading={isLoading}
          onSearch={(value) => {
            setQuery(value);
          }}
        />
        <button
          type="button"
          onClick={pickRandomPain}
          className="self-start rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/10"
        >
          I feel lucky
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {categoryList.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-4 py-1 text-xs font-medium transition ${
                isActive
                  ? "bg-[#00ffe0]/20 text-[#00ffe0]"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Trending
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {trending.slice(0, 6).map((painPoint) => (
            <PainCard key={`trending-${painPoint.id}`} painPoint={painPoint} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Results
          </h3>
          {isLoading ? (
            <span className="text-xs text-zinc-500">Searching…</span>
          ) : null}
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {results.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
              No matching pain points yet. Try a different term or add one via the admin tools.
            </p>
          ) : (
            results.map((painPoint) => <PainCard key={painPoint.id} painPoint={painPoint} />)
          )}
        </div>
      </section>
    </div>
  );
}
