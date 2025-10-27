"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MVPCard } from "@/components/mvp/MVPCard";
import { DownloadModal } from "@/components/mvp/DownloadModal";

interface MVPPanelProps {
  mvpId: string | null;
  output: {
    id: string;
    title: string | null;
    summary: string | null;
    stack: string | null;
    pricing: string | null;
    risk: string | null;
    validation_score: number | null;
  } | null;
}

export function MVPPanel({ mvpId, output }: MVPPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!output || !mvpId) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
        The MVP blueprint will appear here once the agents finish their collaboration.
      </div>
    );
  }

  const shareLink = typeof window !== "undefined" ? window.location.origin + `/mvp/${mvpId}` : "";

  async function handleShare() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error("[studio.share]", error);
      alert(`Copy this link: ${shareLink}`);
    }
  }

  return (
    <div className="space-y-4">
      <MVPCard output={output} />
      <div className="flex flex-wrap gap-3">
        <DownloadModal mvpId={mvpId} />
        <Link
          href="/discover"
          className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100 transition hover:bg-white/10"
        >
          Remix Another Pain
        </Link>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center rounded-lg border border-[#6366f1]/40 bg-[#6366f1]/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6366f1]/30"
        >
          Share Link
        </button>
        {copied ? (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="rounded-full bg-[#00ffe0]/20 px-3 py-1 text-xs text-[#00ffe0]"
          >
            Link copied!
          </motion.span>
        ) : null}
      </div>
    </div>
  );
}
