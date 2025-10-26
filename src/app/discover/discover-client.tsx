"use client";

import { useEffect, useState } from "react";
import { SearchBar } from "@/components/painpoint/SearchBar";
import { PainCard } from "@/components/painpoint/PainCard";
import type { PainPoint } from "@/types/painpoint";

interface DiscoverClientProps {
  initialPainPoints: PainPoint[];
  initialQuery?: string;
}

export function DiscoverClient({ initialPainPoints, initialQuery }: DiscoverClientProps) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [results, setResults] = useState(initialPainPoints);
  const [isLoading, setIsLoading] = useState(false);

  async function runSearch(search: string) {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      const response = await fetch(`/api/painpoints?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Failed to search pain points (${response.status})`);
      }
      const json = (await response.json()) as { data?: PainPoint[]; success?: boolean };
      if (json.success && Array.isArray(json.data)) {
        setResults(json.data);
      }
    } catch (error) {
      console.error("[discover.search]", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (query) {
      runSearch(query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <SearchBar
        defaultValue={query}
        isLoading={isLoading}
        onSearch={(value) => {
          setQuery(value);
          void runSearch(value);
        }}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {results.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
            No matching pain points yet. Try a different term or add one via the admin tools.
          </p>
        ) : (
          results.map((painPoint) => <PainCard key={painPoint.id} painPoint={painPoint} />)
        )}
      </div>
    </div>
  );
}
