"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { ChatPanel } from "@/components/agents/ChatPanel";
import type { PainPoint } from "@/types/painpoint";
import type { SessionMessage } from "@/lib/agents/sessions";
import type { StudioStage } from "@/lib/state/useStudioStore";

interface AgentStudioProps {
  stage: StudioStage;
  painPoint: PainPoint | null;
  transcript: SessionMessage[];
  isTyping: boolean;
  error: string | null;
  onRetry: () => void;
}

const HERO_TEXT = {
  idle: {
    title: "Pick a pain point to start",
    description: "Use the search on the left to pick a problem space and watch the agents work.",
  },
  search: {
    title: "Search for a pain point",
    description: "Agents will activate as soon as you select a pain point to explore.",
  },
  running: {
    title: "Agents collaborating…",
    description: "Researcher, Builder, and Validator are working together to craft your MVP.",
  },
  completed: {
    title: "Collaboration complete",
    description: "Review the MVP blueprint on the right and export the full pack.",
  },
  error: {
    title: "Something went wrong",
    description: "Retry the generation or pick another pain point to continue exploring.",
  },
} as const;

export function AgentStudio({
  stage,
  painPoint,
  transcript,
  isTyping,
  error,
  onRetry,
}: AgentStudioProps) {
  const hero = HERO_TEXT[stage] ?? HERO_TEXT.idle;

  const agentBanner = useMemo(() => {
    if (!painPoint) return null;
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-wide text-[#00ffe0]">Analyzing</p>
        <h3 className="mt-1 text-lg font-semibold text-white">{painPoint.summary ?? painPoint.text}</h3>
        <p className="mt-2 text-sm text-zinc-300">{painPoint.text}</p>
      </div>
    );
  }, [painPoint]);

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-5 shadow-md shadow-black/30 backdrop-blur">
        <motion.h2
          key={hero.title}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="text-xl font-semibold text-white"
        >
          {hero.title}
        </motion.h2>
        <motion.p
          key={hero.description}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
          className="mt-1 text-sm text-zinc-400"
        >
          {hero.description}
        </motion.p>
        {error ? (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">
            <span>{error}</span>
            <button
              type="button"
              onClick={onRetry}
              className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-100 transition hover:bg-rose-500/20"
            >
              Retry
            </button>
          </div>
        ) : null}
      </header>

      {agentBanner}

      <ChatPanel transcript={transcript} isTyping={isTyping} />
    </div>
  );
}
