"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PainPointCard } from "./PainPointCard";
import { SearchBar } from "./SearchBar";
import { FilterBar } from "./FilterBar";
import { Pagination } from "./Pagination";
import type { PainPointResponse } from "@/types/painpoint";

interface PainPointListProps {
  initialData?: PainPointResponse;
  categories?: string[];
  niches?: string[];
  sources?: string[];
  audiences?: string[];
}

export function PainPointList({
  initialData,
  categories = [],
  niches = [],
  sources = [],
  audiences = [],
}: PainPointListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<PainPointResponse | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse search params
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const niche = searchParams.get("niche") || "";
  const source = searchParams.get("source") || "";
  const audience = searchParams.get("audience") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  // Update URL with new params
  const updateFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      // Reset to page 1 when filters change (except when changing page itself)
      if (!updates.page && params.get("page") !== "1") {
        params.set("page", "1");
      }

      router.push(`/pain-points?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Fetch pain points
  const fetchPainPoints = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (niche) params.set("niche", niche);
      if (source) params.set("source", source);
      if (audience) params.set("audience", audience);
      params.set("page", page.toString());
      params.set("pageSize", "20");

      const response = await fetch(`/api/pain-points?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch pain points");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch pain points");
      }

      setData({
        data: result.data,
        total: result.pagination.total,
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalPages: result.pagination.totalPages,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [search, category, niche, source, audience, page]);

  // Fetch on mount or when filters change
  useEffect(() => {
    fetchPainPoints();
  }, [fetchPainPoints]);

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <SearchBar
          value={search}
          onChange={(value) => updateFilters({ search: value })}
          placeholder="e.g. YouTube, Etsy, pricing, marketing..."
        />
        <FilterBar
          categories={categories}
          niches={niches}
          sources={sources}
          audiences={audiences}
          selectedCategory={category}
          selectedNiche={niche}
          selectedSource={source}
          selectedAudience={audience}
          onCategoryChange={(value) => updateFilters({ category: value })}
          onNicheChange={(value) => updateFilters({ niche: value })}
          onSourceChange={(value) => updateFilters({ source: value })}
          onAudienceChange={(value) => updateFilters({ audience: value })}
        />
        {(search || category || niche || source || audience) && (
          <button
            onClick={() => router.push("/pain-points", { scroll: false })}
            className="text-sm text-primary hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Results Count */}
      {data && (
        <div className="text-sm text-slate-600">
          Showing {data.data.length} of {data.total} pain points
          {(search || category || niche || source || audience) && " (filtered)"}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="font-semibold">Error loading pain points</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Pain Points Grid */}
      {!isLoading && !error && data && data.data.length > 0 && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((painPoint) => (
              <PainPointCard key={painPoint.id} painPoint={painPoint} />
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="pt-4">
              <Pagination
                currentPage={data.page}
                totalPages={data.totalPages}
                onPageChange={(newPage) => updateFilters({ page: newPage.toString() })}
              />
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && !error && data && data.data.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <p className="text-lg font-semibold text-slate-700">No pain points found</p>
          <p className="mt-2 text-sm text-slate-500">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}
