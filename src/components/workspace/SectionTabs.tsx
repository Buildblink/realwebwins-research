'use client';

import { WorkspaceSectionId } from "@/hooks/useWorkspace";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SectionTab {
  id: WorkspaceSectionId;
  label: string;
  description?: string;
}

interface SectionTabsProps {
  sections: SectionTab[];
  active: WorkspaceSectionId;
  onSelect: (id: WorkspaceSectionId) => void;
  generatingSection?: WorkspaceSectionId | null;
}

export function SectionTabs({
  sections,
  active,
  onSelect,
  generatingSection,
}: SectionTabsProps) {
  return (
    <div className="relative flex items-center gap-2 rounded-xl bg-[#18181b]/70 p-1.5 shadow-inner shadow-black/60">
      {sections.map((section) => {
        const isActive = section.id === active;
        const isBusy = generatingSection === section.id;
        return (
          <button
            key={section.id}
            onClick={() => onSelect(section.id)}
            className={cn(
              "relative flex-1 rounded-lg px-4 py-3 text-left transition-colors",
              "text-sm font-medium text-zinc-400 hover:text-zinc-100",
              isActive && "text-zinc-50"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="workspace-tab-highlight"
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#4f46e5]/40 to-[#22d3ee]/30"
              />
            )}
            <span className="relative z-10 flex items-center justify-between gap-2">
              <span>{section.label}</span>
              {isBusy && (
                <span className="h-2 w-2 rounded-full bg-[#22d3ee] animate-pulse" />
              )}
            </span>
            {section.description && (
              <span className="relative z-10 mt-1 block text-xs text-zinc-500">
                {section.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
