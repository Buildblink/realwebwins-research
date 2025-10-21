"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import VaultSearchBar from "@/components/VaultSearchBar";
import VaultFilters from "@/components/VaultFilters";
import VaultAnalytics from "@/components/VaultAnalytics";
import VaultResults from "@/components/VaultResults";
import { calculateVaultStats } from "@/lib/analytics";
import type { VaultProjectSummary } from "@/types/supabase";

interface VaultPageClientProps {
  initialProjects: VaultProjectSummary[];
  initialPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  initialQuery?: {
    tag?: string;
    stage?: string;
    q?: string;
  };
}

interface VaultApiResponse {
  success: boolean;
  data: VaultProjectSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  error?: string;
  message?: string;
}

export default function VaultPageClient({
  initialProjects,
  initialPagination,
  initialQuery,
}: VaultPageClientProps) {
  const [projects, setProjects] = useState<VaultProjectSummary[]>(initialProjects);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState(initialQuery?.q ?? "");
  const [selectedTag, setSelectedTag] = useState(initialQuery?.tag ?? "All");
  const [selectedStage, setSelectedStage] = useState(initialQuery?.stage ?? "all");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchVault = useCallback(
    async (pageOverride?: number) => {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams();
      const page = pageOverride ?? pagination.page;
      params.set("page", String(page));

      if (search.trim().length > 0) {
        params.set("q", search.trim());
      }
      if (selectedTag && selectedTag.toLowerCase() !== "all") {
        params.set("tag", selectedTag);
      }
      if (selectedStage && selectedStage !== "all") {
        params.set("stage", selectedStage);
      }

      try {
        const response = await fetch(`/api/vault?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await response.json()) as VaultApiResponse;

        if (!response.ok || !json.success) {
          throw new Error(json.message ?? "Failed to load insights.");
        }

        setProjects(json.data);
        setPagination(json.pagination);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to refresh vault data.";
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.page, search, selectedTag, selectedStage]
  );

  useEffect(() => {
    void fetchVault(1);
  }, [search, selectedTag, selectedStage, fetchVault]);

  const stats = useMemo(() => calculateVaultStats(projects), [projects]);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="font-heading text-3xl font-semibold text-slate-900">
          Insights Vault
        </h1>
        <VaultSearchBar value={search} onChange={setSearch} />
        <VaultFilters
          selectedTag={selectedTag}
          onTagChange={setSelectedTag}
          selectedStage={selectedStage}
          onStageChange={setSelectedStage}
        />
      </div>

      <VaultAnalytics {...stats} />

      {errorMessage && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {errorMessage}
        </div>
      )}

      <VaultResults
        projects={projects}
        page={pagination.page}
        totalPages={pagination.totalPages}
        isLoading={isLoading}
        onPageChange={(nextPage) => {
          setPagination((prev) => ({ ...prev, page: nextPage }));
          void fetchVault(nextPage);
        }}
      />
    </div>
  );
}
