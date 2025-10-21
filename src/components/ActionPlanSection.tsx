"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import ActionPlanViewer from "@/components/ActionPlanViewer";
import { Button } from "@/components/ui/button";
import type { ResearchGeneratedData } from "@/types/research";

interface ActionPlanSectionProps {
  projectId: string;
  researchJson: ResearchGeneratedData | null;
  initialMarkdown?: string | null;
  onPlanGenerated?: (markdown: string) => void;
}

export default function ActionPlanSection({
  projectId,
  researchJson,
  initialMarkdown,
  onPlanGenerated,
}: ActionPlanSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string>(initialMarkdown ?? "");

  const canGenerate = Boolean(researchJson);

  const handleGenerate = async () => {
    if (!researchJson) {
      setError("Research data missing. Refresh the page and try again.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/actionplan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          research_json: researchJson,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message ?? "Failed to generate action plan. Try again shortly."
        );
      }

      setMarkdown(payload.markdown ?? "");
      if (payload.markdown && typeof onPlanGenerated === "function") {
        onPlanGenerated(payload.markdown);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error generating plan.";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-foreground/10 bg-white/70 p-6 shadow-inner">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-heading text-lg text-slate-900">
            Action Plan
          </h3>
          <p className="text-sm text-slate-500">
            Automatically convert the research summary into a focused 7-day go-to-market sprint.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating your plan…
            </span>
          ) : (
            "Generate Action Plan"
          )}
        </Button>
      </div>

      {!canGenerate && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Research payload missing or invalid. Please re-run validation first.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {markdown && !isGenerating && <ActionPlanViewer markdown={markdown} />}

      {isGenerating && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
          Creating your plan…
        </div>
      )}
    </div>
  );
}
