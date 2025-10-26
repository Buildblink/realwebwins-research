"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/agents/ChatPanel";
import { DownloadModal } from "@/components/mvp/DownloadModal";
import type { PainPoint } from "@/types/painpoint";
import type { SessionMessage } from "@/lib/agents/sessions";

interface StudioClientProps {
  painPoint: PainPoint;
}

interface GenerateResponse {
  success?: boolean;
  session_id?: string;
  mvp_id?: string;
  transcript?: SessionMessage[];
  output?: {
    id: string;
    title: string | null;
    summary: string | null;
    stack: string | null;
    pricing: string | null;
    risk: string | null;
    validation_score: number | null;
  };
  message?: string;
}

export function StudioClient({ painPoint }: StudioClientProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<SessionMessage[]>([]);
  const [mvpId, setMvpId] = useState<string | null>(null);
  const [output, setOutput] = useState<GenerateResponse["output"]>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/mvp/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pain_id: painPoint.id }),
      });
      const json = (await response.json()) as GenerateResponse;
      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Generation failed");
      }
      setTranscript(json.transcript ?? []);
      setMvpId(json.mvp_id ?? null);
      setOutput(json.output ?? null);
    } catch (err) {
      console.error("[studio.generate]", err);
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#00ffe0]">Pain Point</p>
            <h2 className="text-2xl font-semibold text-white">
              {painPoint.summary ?? painPoint.text}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[#6366f1]/30 transition hover:bg-[#6366f1]/80 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isGenerating ? "Generating…" : "Generate MVP"}
          </button>
        </header>
        <p className="text-sm text-zinc-300">{painPoint.text}</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-zinc-500 md:grid-cols-4">
          <div>
            <dt>Category</dt>
            <dd className="text-zinc-300">{painPoint.category ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd className="text-zinc-300">{painPoint.source ?? "Community"}</dd>
          </div>
          <div>
            <dt>Audience</dt>
            <dd className="text-zinc-300">{painPoint.audience ?? "General"}</dd>
          </div>
          <div>
            <dt>Popularity</dt>
            <dd className="text-zinc-300">
              {typeof painPoint.popularity_score === "number"
                ? painPoint.popularity_score.toFixed(1)
                : "n/a"}
            </dd>
          </div>
        </dl>
        {error ? (
          <p className="mt-4 rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Live Agent Feed
        </h3>
        <ChatPanel transcript={transcript} />
      </section>

      {output ? (
        <section className="rounded-2xl border border-[#00ffe0]/30 bg-[#00ffe0]/5 p-5">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#00ffe0]">MVP Blueprint</p>
              <h3 className="text-xl font-semibold text-white">
                {output.title ?? "AI Generated MVP"}
              </h3>
            </div>
            {mvpId ? <DownloadModal mvpId={mvpId} triggerLabel="Download MVP Pack" /> : null}
          </header>
          <p className="text-sm text-zinc-300">{output.summary}</p>
        </section>
      ) : null}
    </div>
  );
}
