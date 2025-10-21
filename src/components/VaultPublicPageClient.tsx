"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import VaultSearchBar from "@/components/VaultSearchBar";
import { Button } from "@/components/ui/button";
import { VaultPublicCard } from "@/components/VaultPublicCard";
import type { VaultProjectSummary } from "@/types/supabase";
import type { VaultTagsResult } from "@/lib/vaultData";

interface VaultPublicPageClientProps {
  initialProjects: VaultProjectSummary[];
  initialPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  initialTags: VaultTagsResult[];
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
  message?: string;
}

interface TagApiResponse {
  success: boolean;
  tags: VaultTagsResult[];
  message?: string;
}

const STAGE_OPTIONS = [
  { label: "All stages", value: "all" },
  { label: "Research only", value: "research" },
  { label: "Action plan ready", value: "plan" },
  { label: "Playbook complete", value: "playbook" },
] as const;

export default function VaultPublicPageClient({
  initialProjects,
  initialPagination,
  initialTags,
  initialQuery,
}: VaultPublicPageClientProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState(initialQuery?.q ?? "");
  const [selectedTag, setSelectedTag] = useState(initialQuery?.tag ?? "All");
  const [selectedStage, setSelectedStage] = useState(initialQuery?.stage ?? "all");
  const [tags, setTags] = useState<VaultTagsResult[]>(initialTags);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshTags = useCallback(async () => {
    try {
      const res = await fetch("/api/vault/tags?public=true", {
        cache: "no-store",
      });
      const json = (await res.json()) as TagApiResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.message ?? "Failed to load tags.");
      }
      setTags(json.tags);
    } catch (error) {
      console.warn("[vault-public] Unable to refresh tags", error);
    }
  }, []);

  const fetchProjects = useCallback(
    async (pageOverride?: number) => {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams();
      const nextPage = pageOverride ?? pagination.page ?? 1;
      params.set("public", "true");
      params.set("page", String(nextPage));
      params.set("pageSize", String(pagination.pageSize ?? 20));

      const trimmedSearch = search.trim();
      if (trimmedSearch.length > 0) {
        params.set("q", trimmedSearch);
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
          throw new Error(json.message ?? "Failed to load vault results.");
        }

        setProjects(json.data);
        setPagination(json.pagination);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load vault results.";
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.page, pagination.pageSize, search, selectedTag, selectedStage]
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    void fetchProjects(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedTag, selectedStage]);

  const tagOptions = useMemo(() => {
    const normalized = new Set(tags.map((entry) => entry.tag.toLowerCase()));
    const base = [{ tag: "All", count: pagination.total }];
    const tagList = tags.filter((entry) => entry.tag.trim().length > 0);
    if (!normalized.has("all")) {
      return base.concat(tagList);
    }
    return tagList;
  }, [tags, pagination.total]);

  const handleStageChange = useCallback(
    (value: string) => {
      setSelectedStage(value);
    },
    []
  );

  const handleTagChange = useCallback(
    (tag: string) => {
      setSelectedTag(tag);
    },
    []
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setPagination((prev) => ({ ...prev, page: nextPage }));
      void fetchProjects(nextPage);
    },
    [fetchProjects]
  );

  return (
    <div className="space-y-10">
      <section className="space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="font-heading text-4xl font-semibold text-slate-900">
            RealWebWins Vault
          </h1>
          <p className="text-sm text-slate-600">
            Browse founder-friendly research, action plans, and marketing playbooks
            generated by our AI agents. Filter by tag, stage, or keyword to find your
            next inspiration.
          </p>
        </div>
        <div className="mx-auto max-w-2xl">
          <VaultSearchBar value={search} onChange={setSearch} placeholder="Search public research..." />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((entry) => {
              const label = entry.tag;
              const isActive = selectedTag.toLowerCase() === label.toLowerCase();
              return (
                <Button
                  key={label}
                  type="button"
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => handleTagChange(label)}
                >
                  {label}
                  {label !== "All" ? (
                    <span className="ml-2 rounded-full bg-black/10 px-2 text-xs text-slate-700">
                      {entry.count}
                    </span>
                  ) : null}
                </Button>
              );
            })}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={() => void refreshTags()}
            >
              Refresh tags
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="stage-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Stage
            </label>
            <select
              id="stage-filter"
              value={selectedStage}
              onChange={(event) => handleStageChange(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {STAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <VaultPublicCard key={project.id} project={project} />
          ))}
        </div>

        {projects.length === 0 && !isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
            No public projects match the current filters yet. Try adjusting the tag or search query.
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
            Loading vault insights…
          </div>
        ) : null}

        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-500 md:flex-row">
          <span>
            Page {pagination.page} of {pagination.totalPages || 1}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1 || isLoading}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 text-sm text-slate-600">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold text-slate-900">
              Want to generate your own report?
            </h2>
            <p>Run the RealWebWins pipeline to capture insights tailored to your idea.</p>
          </div>
          <Button asChild size="sm">
            <Link href="/research">Run research</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
