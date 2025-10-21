"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResearchCard } from "@/components/ResearchCard";
import type { DatabaseProject, VaultProjectSummary } from "@/types/supabase";

interface VaultResultsProps {
  projects: VaultProjectSummary[];
  page: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

function summaryToDatabaseProject(summary: VaultProjectSummary): DatabaseProject {
  return {
    id: summary.id,
    user_id: null,
    title: summary.title ?? "Untitled Project",
    idea_description: summary.idea_description ?? "",
    score: summary.score ?? null,
    verdict: summary.verdict ?? "neutral",
    confidence: null,
    research_json: null,
    research_report: null,
    created_at: summary.created_at,
  };
}

export default function VaultResults({
  projects,
  page,
  totalPages,
  isLoading,
  onPageChange,
}: VaultResultsProps) {
  const mappedProjects = useMemo(
    () => projects.map((project) => summaryToDatabaseProject(project)),
    [projects]
  );

  const handlePrev = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (page < totalPages) onPageChange(page + 1);
  };

  return (
    <div className="space-y-6">
      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
          Loading vault insights…
        </div>
      )}

      {!isLoading && projects.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white/70 p-6 text-center text-sm text-slate-500">
          No projects match the current filters yet. Try adjusting the tag or search query.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((summary, index) => (
          <div key={summary.id} className="space-y-3">
            <ResearchCard project={mappedProjects[index]} index={index} />
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge variant={summary.is_public ? "success" : "neutral"}>
                {summary.is_public ? "Public" : "Private"}
              </Badge>
              <Badge
                variant={
                  summary.has_playbook
                    ? "success"
                    : summary.has_action_plan
                    ? "warning"
                    : "neutral"
                }
              >
                {summary.has_playbook
                  ? "Playbook Complete"
                  : summary.has_action_plan
                  ? "Action Plan"
                  : "Research"}
              </Badge>
              {summary.tags.length > 0 ? (
                summary.tags.map((tag) => (
                  <Badge key={tag} variant="neutral">
                    {tag}
                  </Badge>
                ))
              ) : (
                <Badge variant="neutral">Untagged</Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-500">
        <span>
          Page {page} of {totalPages || 1}
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={handlePrev} disabled={page <= 1}>
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleNext}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
