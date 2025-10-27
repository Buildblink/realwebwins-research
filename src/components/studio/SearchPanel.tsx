"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { PainPoint } from "@/types/painpoint";
import { SearchBar } from "@/components/painpoint/SearchBar";

interface SearchPanelProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (painPoint: PainPoint) => void;
  activePainId: string | null;
}

export function SearchPanel({ query, onQueryChange, onSelect, activePainId }: SearchPanelProps) {
  const [results, setResults] = useState<PainPoint[]>([]);
  const [trending, setTrending] = useState<PainPoint[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(false);

  async function fetchPainPoints(term: string, categoryFilter: string) {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (term) params.set("q", term);
      if (categoryFilter && categoryFilter !== "All") {
        params.set("category", categoryFilter);
      }
      params.set("sort", "popularity");
      const response = await fetch(`/api/painpoints?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Failed to search pain points (${response.status})`);
      }
      const json = (await response.json()) as { data?: PainPoint[]; success?: boolean };
      if (json.success && Array.isArray(json.data)) {
        setResults(json.data);
        if (categories.length === 0) {
          const unique = Array.from(
            new Set(
              json.data
                .map((item) => item.category)
                .filter((item): item is string => typeof item === "string")
            )
          );
          if (unique.length > 0) {
            setCategories(["All", ...unique]);
          }
        }
      }
    } catch (error) {
      console.error("[studio.search]", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function hydrateInitial() {
    try {
      const trendingRes = await fetch("/api/painpoints?sort=popularity&pageSize=6", {
        cache: "no-store",
      });
      if (trendingRes.ok) {
        const json = (await trendingRes.json()) as { data?: PainPoint[]; success?: boolean };
        if (json.success && Array.isArray(json.data)) {
          setTrending(json.data);
          const uniqueCategories = Array.from(
            new Set(
              json.data
                .map((item) => item.category)
                .filter((item): item is string => typeof item === "string")
            )
          );
          if (uniqueCategories.length > 0) {
            setCategories(["All", ...uniqueCategories]);
          }
        }
      }
    } catch (error) {
      console.error("[studio.hydrate]", error);
    }
  }

  useEffect(() => {
    void hydrateInitial();
    void fetchPainPoints(query, category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      void fetchPainPoints(query, category);
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query, category]);

  const categoryList = useMemo(() => {
    if (categories.length > 0) return categories;
    return ["All", "AI", "SaaS", "E-commerce", "Freelance", "Content"];
  }, [categories]);

  const handleLucky = () => {
    const pool = results.length > 0 ? results : trending;
    if (pool.length === 0) return;
    const random = pool[Math.floor(Math.random() * pool.length)];
    onSelect(random);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchBar
          defaultValue={query}
          isLoading={isLoading}
          onSearch={onQueryChange}
        />
        <button
          type="button"
          onClick={handleLucky}
          className="self-start rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/10"
        >
          I feel lucky
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {categoryList.map((item) => {
          const isActive = category === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-full px-4 py-1 text-xs font-medium transition ${
                isActive
                  ? "bg-[#00ffe0]/20 text-[#00ffe0]"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {trending.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Trending
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {trending.map((painPoint) => (
              <motion.button
                key={`trending-${painPoint.id}`}
                type="button"
                onClick={() => onSelect(painPoint)}
                className={`text-left transition ${activePainId === painPoint.id ? "opacity-80" : "opacity-100"}`}
                whileHover={{ scale: 1.01 }}
              >
              </motion.button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Results
          </h3>
          {isLoading ? <span className="text-xs text-zinc-500">Searching…</span> : null}
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {results.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
              No matching pain points yet. Try a different term or add one via the admin tools.
            </p>
          ) : (
            results.map((painPoint) => (
              <motion.button
                key={painPoint.id}
                type="button"
                onClick={() => onSelect(painPoint)}
                className={`text-left transition ${
                  activePainId === painPoint.id ? "opacity-80" : "opacity-100"
                }`}
                whileHover={{ scale: 1.01 }}
              >
              </motion.button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
