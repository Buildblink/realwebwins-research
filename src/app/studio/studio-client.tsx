"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SearchPanel } from "@/components/studio/SearchPanel";
import { AgentStudio } from "@/components/studio/AgentStudio";
import { MVPPanel } from "@/components/studio/MVPPanel";
import { RecentWidget } from "@/components/studio/RecentWidget";
import { useStudioStore } from "@/lib/state/useStudioStore";
import type { PainPoint } from "@/types/painpoint";
import type { SessionMessage } from "@/lib/agents/sessions";
import { addRecentMVP } from "@/lib/storage/localSessions";

export default function StudioClient() {
  const {
    stage,
    query,
    selectedPain,
    transcript,
    sessionId,
    mvpId,
    output,
    error,
    setStage,
    setQuery,
    setPainPoint,
    setTranscript,
    setSession,
    setOutput,
    setMvpId,
    setError,
  } = useStudioStore();

  const [isTyping, setIsTyping] = useState(false);

  const startGeneration = useCallback(
    async (painPoint: PainPoint) => {
      setIsTyping(true);
      setStage("running");
      setTranscript([]);
      setSession(null);
      setOutput(null);
      setMvpId(null);
      setError(null);
      try {
        const response = await fetch("/api/mvp/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pain_id: painPoint.id }),
        });
        const json = (await response.json()) as {
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
        };
        if (!response.ok || !json.success) {
          throw new Error(json.message ?? "Generation failed.");
        }
        setTranscript(json.transcript ?? []);
        setSession(json.session_id ?? null);
        setMvpId(json.mvp_id ?? null);
        if (json.output) {
          setOutput(json.output);
          addRecentMVP({
            id: json.output.id,
            title: json.output.title ?? "Untitled MVP",
            validationScore: json.output.validation_score ?? 0,
            timestamp: new Date().toISOString(),
          });
        }
        if (json.session_id) {
          setStage("running");
        } else {
          setStage("completed");
        }
      } catch (err) {
        console.error("[studio.generate]", err);
        setError(err instanceof Error ? err.message : "Generation failed.");
        setStage("error");
        setIsTyping(false);
      }
    },
    [
      setError,
      setMvpId,
      setOutput,
      setSession,
      setStage,
      setTranscript,
    ]
  );

  const pollSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(`/api/agents/session/${sessionId}?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Session poll failed (${response.status})`);
      }
      const json = (await response.json()) as {
        success?: boolean;
        session?: { status?: string; transcript?: SessionMessage[] };
        output?: {
          id: string;
          title: string | null;
          summary: string | null;
          stack: string | null;
          pricing: string | null;
          risk: string | null;
          validation_score: number | null;
        };
      };
      if (!json.success) {
        throw new Error("Session fetch returned false.");
      }
      if (json.session?.transcript) {
        setTranscript(json.session.transcript);
      }
      if (json.output) {
        setOutput(json.output);
        setMvpId(json.output.id);
        addRecentMVP({
          id: json.output.id,
          title: json.output.title ?? "Untitled MVP",
          validationScore: json.output.validation_score ?? 0,
          timestamp: new Date().toISOString(),
        });
      }
      const nextStatus = (json.session?.status ?? "running").toLowerCase();
      if (nextStatus !== "running") {
        setStage("completed");
        setIsTyping(false);
      }
    } catch (err) {
      console.error("[studio.poll]", err);
      setStage("error");
      setError(err instanceof Error ? err.message : "Session polling failed.");
      setIsTyping(false);
    }
  }, [sessionId, setError, setMvpId, setOutput, setStage, setTranscript]);

  useEffect(() => {
    if (stage !== "running" || !sessionId) return;
    const interval = setInterval(() => {
      void pollSession();
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [stage, sessionId, pollSession]);

  const handleSelect = useCallback(
    (painPoint: PainPoint) => {
      setPainPoint(painPoint);
      setStage("running");
      void startGeneration(painPoint);
    },
    [setPainPoint, setStage, startGeneration]
  );

  const handleRetry = useCallback(() => {
    if (selectedPain) {
      void startGeneration(selectedPain);
    }
  }, [selectedPain, startGeneration]);

  const layoutClass = useMemo(
    () =>
      "grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)_minmax(0,340px)]",
    []
  );

  return (
    <div className={layoutClass}>
      <div className="space-y-6">
        <SearchPanel
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            if (stage === "idle") setStage("search");
          }}
          onSelect={handleSelect}
          activePainId={selectedPain?.id ?? null}
        />
      </div>

      <AgentStudio
        stage={stage}
        painPoint={selectedPain}
        transcript={transcript}
        isTyping={isTyping}
        error={error}
        onRetry={handleRetry}
      />

      <div className="space-y-6">
        <MVPPanel mvpId={mvpId} output={output} />
        <RecentWidget />
      </div>
    </div>
  );
}
