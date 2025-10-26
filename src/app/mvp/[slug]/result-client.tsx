"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MVPCard } from "@/components/mvp/MVPCard";
import { DownloadModal } from "@/components/mvp/DownloadModal";
import { ChatPanel } from "@/components/agents/ChatPanel";
import { RecentMVPs } from "@/components/dashboard/RecentMVPs";
import type { MVPOutputRecord } from "@/lib/mvp/outputs";
import type { SessionRecord } from "@/lib/agents/sessions";
import { addRecentMVP } from "@/lib/storage/localSessions";

interface ResultClientProps {
  output: MVPOutputRecord;
  session: SessionRecord;
}

export function ResultClient({ output, session }: ResultClientProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    addRecentMVP({
      id: output.id,
      title: output.title ?? "Untitled MVP",
      validationScore: output.validation_score ?? 0,
      timestamp: output.created_at ?? new Date().toISOString(),
    });
  }, [output]);

  async function handleShare() {
    try {
      if (typeof window !== "undefined" && navigator.clipboard) {
        const url = window.location.href;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch (error) {
      console.error("[mvp.share]", error);
    }
    if (typeof window !== "undefined") {
      alert(`Copy this link: ${window.location.href}`);
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex-1 space-y-4">
          <MVPCard output={output} />
          <div className="flex flex-wrap gap-3">
            <DownloadModal mvpId={output.id} triggerLabel="Download MVP Pack" />
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
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 md:w-72">
          <RecentMVPs />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Agent Transcript
        </h2>
        <ChatPanel transcript={session.transcript} />
      </section>
    </div>
  );
}
