"use client";

import { Button } from "@/components/ui/button";

const TAG_OPTIONS = ["All", "SaaS", "Etsy", "YouTube", "Substack", "Gumroad", "Other"] as const;
const STAGE_OPTIONS = [
  { label: "Research", value: "research" },
  { label: "Action Plan", value: "plan" },
  { label: "Playbook Complete", value: "playbook" },
] as const;

interface VaultFiltersProps {
  selectedTag: string;
  onTagChange: (tag: string) => void;
  selectedStage: string;
  onStageChange: (stage: string) => void;
}

export default function VaultFilters({
  selectedTag,
  onTagChange,
  selectedStage,
  onStageChange,
}: VaultFiltersProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {TAG_OPTIONS.map((tag) => {
          const isActive = selectedTag.toLowerCase() === tag.toLowerCase();
          return (
            <Button
              key={tag}
              type="button"
              variant={isActive ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => onTagChange(tag)}
            >
              {tag}
            </Button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {STAGE_OPTIONS.map((stage) => {
          const isActive = selectedStage === stage.value;
          return (
            <Button
              key={stage.value}
              type="button"
              variant={isActive ? "secondary" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => onStageChange(stage.value)}
            >
              {stage.label}
            </Button>
          );
        })}
        <Button
          type="button"
          variant={selectedStage === "all" ? "secondary" : "ghost"}
          size="sm"
          className="rounded-full"
          onClick={() => onStageChange("all")}
        >
          Show All
        </Button>
      </div>
    </div>
  );
}
