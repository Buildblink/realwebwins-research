"use client";

import Link from "next/link";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import { useRecommendations } from "@/hooks/useRecommendations";
import { Badge } from "@/components/ui/badge";

interface RecommendationsSidebarProps {
  workspaceId: string;
  userId?: string;
  className?: string;
}

export function RecommendationsSidebar({
  workspaceId,
  userId,
  className = "",
}: RecommendationsSidebarProps) {
  const { recommendations, isLoading, error } = useRecommendations(workspaceId, {
    userId,
    limit: 5,
  });

  if (isLoading) {
    return (
      <div className={`flex flex-col gap-4 rounded-2xl border border-white/5 bg-[#111113]/80 p-5 ${className}`}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#22d3ee]" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#22d3ee]">
            Recommended
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col gap-4 rounded-2xl border border-white/5 bg-[#111113]/80 p-5 ${className}`}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#22d3ee]" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#22d3ee]">
            Recommended
          </h2>
        </div>
        <p className="text-xs text-rose-400">{error}</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className={`flex flex-col gap-4 rounded-2xl border border-white/5 bg-[#111113]/80 p-5 ${className}`}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#22d3ee]" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#22d3ee]">
            Recommended
          </h2>
        </div>
        <p className="text-xs text-zinc-500">
          No recommendations available yet.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 rounded-2xl border border-white/5 bg-[#111113]/80 p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#22d3ee]" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#22d3ee]">
            Recommended For You
          </h2>
        </div>
        {recommendations.length > 0 && (
          <Badge variant="neutral" className="border-[#22d3ee]/30 bg-[#22d3ee]/10 text-[#22d3ee] text-[10px]">
            {recommendations.length}
          </Badge>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        Similar workspaces based on your interests
      </p>

      <div className="flex flex-col gap-3">
        {recommendations.map((rec) => (
          <Link
            key={rec.id}
            href={`/workspace/${rec.pain_point_id}`}
            className="group block"
          >
            <div className="rounded-xl border border-white/5 bg-[#0e0e10]/70 p-3 transition-all hover:border-[#22d3ee]/30 hover:bg-[#0e0e10]/90">
              {/* Relevance indicator */}
              {rec.relevance_score >= 0.7 && (
                <div className="mb-2 flex items-center gap-1 text-[10px] text-[#22d3ee]">
                  <TrendingUp className="h-3 w-3" />
                  <span>Highly relevant</span>
                </div>
              )}

              {/* Title */}
              <h3 className="mb-2 text-xs font-semibold text-zinc-200 line-clamp-2 group-hover:text-[#22d3ee] transition-colors">
                {rec.title}
              </h3>

              {/* Pain point preview */}
              <p className="mb-2 text-[10px] text-zinc-400 line-clamp-2">
                {rec.pain_point_text}
              </p>

              {/* Meta badges */}
              <div className="flex flex-wrap gap-1">
                {rec.category && (
                  <span className="rounded-md bg-[#4f46e5]/20 px-1.5 py-0.5 text-[9px] font-medium text-[#4f46e5]">
                    {rec.category}
                  </span>
                )}
                {rec.niche && (
                  <span className="rounded-md bg-zinc-700/50 px-1.5 py-0.5 text-[9px] font-medium text-zinc-300">
                    {rec.niche}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-2 pt-3 border-t border-white/5">
        <p className="text-[10px] text-zinc-600">
          Recommendations based on category, niche, and your activity
        </p>
      </div>
    </div>
  );
}
