"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChatPanel } from "@/components/agents/ChatPanel";
import { DownloadModal } from "@/components/mvp/DownloadModal";
import type { PainPoint } from "@/types/painpoint";
import type { SessionMessage } from "@/lib/agents/sessions";
import { addRecentMVP } from "@/lib/storage/localSessions";

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
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<SessionMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "error">("idle");
  const [output, setOutput] = useState<GenerateResponse["output"]>(null);
  const [mvpId, setMvpId] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);

  const heroTitle = useMemo(() => painPoint.summary ?? painPoint.text, [painPoint]);

  const pollSession = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/agents/session/${id}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Session poll failed (${response.status})`);
        }
        const json = (await response.json()) as {
          success?: boolean;
          session?: { status?: string; transcript?: SessionMessage[] };
          output?: GenerateResponse["output"];
        };
        if (!json.success) {
          throw new Error("Session fetch returned false");
        }
        const session = json.session;
        if (session?.transcript) {
          setTranscript(session.transcript);
        }
        if (json.output) {
          setOutput(json.output);
          setMvpId(json.output.id ?? null);
        }

        const nextStatus = (session?.status ?? "running").toLowerCase();
        if (nextStatus !== "running") {
          setStatus("completed");
          setIsTyping(false);
        }
      } catch (err) {
        console.error("[studio.poll]", err);
        setStatus("error");
        setIsTyping(false);
        setError(err instanceof Error ? err.message : "Polling failed.");
      }
    },
    []
  );

  useEffect(() => {
    if (!sessionId || status !== "running") return;
    const interval = setInterval(() => {
      void pollSession(sessionId);
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [sessionId, status, pollSession]);

  useEffect(() => {
    if (status === "completed" && output && !recorded) {
      addRecentMVP({
        id: output.id ?? sessionId ?? "",
        title: output.title ?? heroTitle ?? "Untitled MVP",
        validationScore: output.validation_score ?? 0,
        timestamp: new Date().toISOString(),
      });
      setRecorded(true);
    }
  }, [status, output, recorded, heroTitle, sessionId]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setIsTyping(true);
    setError(null);
    setRecorded(false);
    setStatus("running");
    setTranscript([]);
    setOutput(null);
    setMvpId(null);

    try {
      const response = await fetch("/api/mvp/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pain_id: painPoint.id }),
      });
      const json = (await response.json()) as GenerateResponse;
      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Generation failed.");
      }
      setTranscript(json.transcript ?? []);
      setSessionId(json.session_id ?? null);
      setMvpId(json.mvp_id ?? null);
      setOutput(json.output ?? null);
      if (json.output) {
        setStatus("completed");
        setIsTyping(false);
      }
    } catch (err) {
      console.error("[studio.generate]", err);
      setError(err instanceof Error ? err.message : "Generation failed.");
      setStatus("error");
      setIsTyping(false);
    } finally {
      setIsGenerating(false);
    }
  }, [painPoint.id]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#00ffe0]">Pain Point</p>
            <h2 className="text-2xl font-semibold text-white">{heroTitle}</h2>
          </div>
          <div className="flex items-center gap-2">
            {status === "running" ? (
              <span className="text-xs uppercase tracking-wide text-[#00ffe0]">
                Agents collaborating…
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[#6366f1]/30 transition hover:bg-[#6366f1]/80 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isGenerating ? "Generating…" : sessionId ? "Regenerate MVP" : "Generate MVP"}
            </button>
          </div>
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
          <div className="mt-4 flex items-center justify-between rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
            <span>{error}</span>
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-100"
            >
              Retry
            </button>
          </div>
        ) : null}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Live Agent Feed
        </h3>
        <ChatPanel transcript={transcript} isTyping={isTyping} />
      </section>

      {output ? (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="rounded-2xl border border-[#00ffe0]/30 bg-[#00ffe0]/5 p-5"
        >
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#00ffe0]">MVP Blueprint</p>
              <h3 className="text-xl font-semibold text-white">
                {output.title ?? "AI Generated MVP"}
              </h3>
            </div>
            {mvpId ? <DownloadModal mvpId={mvpId} triggerLabel="Download MVP Pack" /> : null}
          </header>
          <div className="space-y-3 text-sm text-zinc-200">
            <p>{output.summary}</p>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <h4 className="text-xs uppercase tracking-wide text-zinc-400">Stack</h4>
                <p>{output.stack ?? "Not specified"}</p>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wide text-zinc-400">Pricing</h4>
                <p>{output.pricing ?? "Not specified"}</p>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wide text-zinc-400">Validation</h4>
                <p>{((output.validation_score ?? 0) * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </motion.section>
      ) : null}
    </div>
  );
}
