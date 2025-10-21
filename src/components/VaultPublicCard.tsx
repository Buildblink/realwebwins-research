"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VaultProjectSummary } from "@/types/supabase";

interface VaultPublicCardProps {
  project: VaultProjectSummary;
}

function resolveStage(summary: VaultProjectSummary): {
  label: string;
  variant: "success" | "warning" | "neutral";
} {
  if (summary.has_playbook) {
    return { label: "Playbook", variant: "success" };
  }
  if (summary.has_action_plan) {
    return { label: "Action Plan", variant: "warning" };
  }
  return { label: "Research", variant: "neutral" };
}

export function VaultPublicCard({ project }: VaultPublicCardProps) {
  const stage = resolveStage(project);
  const publishedAgo = formatDistanceToNow(new Date(project.created_at), {
    addSuffix: true,
  });
  const title = project.title?.trim() || "Untitled Research";
  const description =
    project.idea_description?.trim() ??
    "Explore this research project to review the insights, action plan, and marketing playbook.";

  return (
    <article className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Badge variant={stage.variant}>{stage.label}</Badge>
          <span>{publishedAgo}</span>
          {project.is_public ? <Badge variant="success">Public</Badge> : null}
        </div>
        <div className="space-y-2">
          <h3 className="font-heading text-xl font-semibold text-slate-900">
            {title}
          </h3>
          <p className="line-clamp-3 text-sm text-slate-600">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {project.tags.length > 0 ? (
            project.tags.map((tag) => (
              <Badge key={tag} variant="neutral">
                {tag}
              </Badge>
            ))
          ) : (
            <Badge variant="neutral">Untagged</Badge>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-primary">
        <span className="font-medium">View full report</span>
        <Link
          href={`/vault/${project.id}`}
          className="inline-flex items-center gap-1 font-semibold transition group-hover:gap-2"
        >
          Details
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
