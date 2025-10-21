"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import PlaybookViewer from "@/components/PlaybookViewer";
import { Button } from "@/components/ui/button";
import type { ResearchGeneratedData } from "@/types/research";

interface PlaybookSectionProps {
  projectId: string;
  researchJson: ResearchGeneratedData | null;
  actionPlanMarkdown: string | null;
  initialMarkdown?: string | null;
}

export default function PlaybookSection({
  projectId,
  researchJson,
  actionPlanMarkdown,
  initialMarkdown,
}: PlaybookSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState(initialMarkdown ?? "");

  const hasResearch = Boolean(researchJson);
  const hasActionPlan = Boolean(actionPlanMarkdown && actionPlanMarkdown.trim().length > 0);
  const canGenerate = hasResearch && hasActionPlan;

  const handleGenerate = async () => {
    if (!canGenerate || !researchJson || !actionPlanMarkdown) {
      setError(
        "Missing research or action plan. Generate the action plan first, then try again."
      );
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/playbook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          research_json: researchJson,
          action_plan_markdown: actionPlanMarkdown,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message ??
            "Failed to generate marketing playbook. Try again shortly."
        );
      }

      setMarkdown(payload.markdown ?? "");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unexpected error while generating playbook.";
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
            Marketing Playbook
          </h3>
          <p className="text-sm text-slate-500">
            Turn research insights and your action plan into a multi-channel marketing launch guide.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={!canGenerate || isGenerating}>
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating playbook…
            </span>
          ) : (
            "Generate Playbook"
          )}
        </Button>
      </div>

      {!hasResearch && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Research payload missing. Re-run validation before generating a playbook.
        </div>
      )}

      {hasResearch && !hasActionPlan && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Action plan not generated yet. Create the action plan to unlock the playbook.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {markdown && !isGenerating && <PlaybookViewer markdown={markdown} />}

      {!markdown && !isGenerating && (
        <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-4 text-sm text-secondary/80">
          Playbook not generated yet. Use the button above once your action plan looks good.
        </div>
      )}

      {isGenerating && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
          Generating marketing assets…
        </div>
      )}
    </div>
  );
}
