'use client';

import { WorkspaceOutputRow, WorkspaceSectionId } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { RatingButtons } from "@/components/workspace/RatingButtons";
import { AffiliateBlock } from "@/components/workspace/AffiliateBlock";
import { extractAffiliateBlocks } from "@/lib/workspace/affiliate";
import ReactMarkdown from "react-markdown";
import { useMemo } from "react";

interface SectionPanelProps {
  section: WorkspaceSectionId;
  title: string;
  systemGoal: string;
  output: WorkspaceOutputRow | null;
  painPointId: string;
  workspaceId?: string;
  playbookSlug?: string;
  isLoading: boolean;
  isGenerating: boolean;
  onGenerate: (section: WorkspaceSectionId) => Promise<void>;
  error?: string | null;
}

export function SectionPanel({
  section,
  title,
  systemGoal,
  output,
  painPointId,
  workspaceId,
  playbookSlug,
  isLoading,
  isGenerating,
  onGenerate,
  error,
}: SectionPanelProps) {
  const showGenerate = !output && !isGenerating;

  // Extract affiliate tools from markdown content
  const affiliateTools = useMemo(() => {
    if (!output?.content_md) return [];
    return extractAffiliateBlocks(output.content_md);
  }, [output?.content_md]);

  return (
    <div className="flex h-full flex-col gap-6 rounded-2xl border border-white/5 bg-[#111113]/80 p-6 shadow-[0_0_30px_rgba(79,70,229,0.08)]">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <Button
            variant="outline"
            onClick={() => onGenerate(section)}
            disabled={isGenerating || isLoading}
            className="border-[#4f46e5]/40 bg-[#18181b] text-xs text-zinc-200 hover:border-[#22d3ee]/60 hover:bg-[#1f1f23]"
          >
            {isGenerating ? "Generating..." : output ? "Regenerate" : "Generate"}
          </Button>
        </div>
        <p className="text-sm text-zinc-500">{systemGoal}</p>
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </header>

      <div className="relative flex-1 overflow-hidden rounded-xl border border-white/5 bg-[#0e0e10]/80">
        <div className="h-full overflow-y-auto p-6 text-sm leading-relaxed text-zinc-200">
          {isLoading && (
            <SkeletonContent />
          )}
          {!isLoading && output?.content_md && (
            <>
              <ReactMarkdown className="prose prose-invert prose-p:my-2 prose-headings:mt-6 prose-headings:mb-2 prose-li:my-1">
                {output.content_md}
              </ReactMarkdown>

              {/* Affiliate tools */}
              {affiliateTools.length > 0 && (
                <div className="mt-6 border-t border-white/5 pt-6">
                  <AffiliateBlock
                    tools={affiliateTools}
                    workspaceId={workspaceId}
                    playbookSlug={playbookSlug}
                  />
                </div>
              )}

              {/* Rating buttons */}
              <div className="mt-6 border-t border-white/5 pt-4">
                <RatingButtons
                  outputId={output.id}
                  painPointId={painPointId}
                  initialRating={output.rating ?? 0}
                  className="justify-start"
                />
              </div>
            </>
          )}
          {!isLoading && !output?.content_md && !isGenerating && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-zinc-500">
              {showGenerate ? (
                <>
                  <span>No cached output yet.</span>
                  <span className="text-xs text-zinc-600">
                    Tap generate to craft a fresh workspace insight.
                  </span>
                </>
              ) : (
                <span>Preparing workspace insight...</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonContent() {
  return (
    <div className="flex animate-pulse flex-col gap-3 text-zinc-700">
      <div className="h-4 w-1/3 rounded bg-zinc-800/80" />
      <div className="h-4 w-2/3 rounded bg-zinc-800/80" />
      <div className="h-4 w-full rounded bg-zinc-900/80" />
      <div className="h-4 w-5/6 rounded bg-zinc-900/80" />
      <div className="h-4 w-2/3 rounded bg-zinc-900/80" />
    </div>
  );
}

