"use client";

import { useState } from "react";
import ActionPlanSection from "@/components/ActionPlanSection";
import PlaybookSection from "@/components/PlaybookSection";
import type { ResearchGeneratedData } from "@/types/research";

interface ProjectStrategyPanelsProps {
  projectId: string;
  researchJson: ResearchGeneratedData | null;
  initialActionPlanMarkdown: string | null;
  initialPlaybookMarkdown: string | null;
}

export default function ProjectStrategyPanels({
  projectId,
  researchJson,
  initialActionPlanMarkdown,
  initialPlaybookMarkdown,
}: ProjectStrategyPanelsProps) {
  const [actionPlanMarkdown, setActionPlanMarkdown] = useState(
    initialActionPlanMarkdown ?? ""
  );

  return (
    <div className="space-y-6">
      <ActionPlanSection
        projectId={projectId}
        researchJson={researchJson}
        initialMarkdown={initialActionPlanMarkdown}
        onPlanGenerated={(markdown) => setActionPlanMarkdown(markdown)}
      />
      <PlaybookSection
        projectId={projectId}
        researchJson={researchJson}
        actionPlanMarkdown={actionPlanMarkdown}
        initialMarkdown={initialPlaybookMarkdown}
      />
    </div>
  );
}
