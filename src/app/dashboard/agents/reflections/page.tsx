"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AgentReflection {
  id: string;
  agent_id: string;
  behavior_id?: string | null;
  reflection_type?: string | null;
  summary: string;
  content?: string | null;
  confidence?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  content?: string | null;
}

interface ReflectionResponse {
  success: boolean;
  data: AgentReflection[];
}

const fetchReflections = async (): Promise<AgentReflection[]> => {
  const response = await fetch("/api/agents/reflect?limit=100", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load reflections (${response.status})`);
  }
  const json = (await response.json()) as ReflectionResponse;
  return json.data ?? [];
};

export default function AgentReflectionsPage() {
  const [reflections, setReflections] = useState<AgentReflection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const loadReflections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReflections();
      setReflections(data);
      setError(null);
    } catch (err) {
      console.error("[reflections.dashboard] Load failed", err);
      setError(err instanceof Error ? err.message : "Unable to load reflections.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReflections();
    const interval = setInterval(loadReflections, 15000);
    return () => clearInterval(interval);
  }, [loadReflections]);

  const triggerReflection = useCallback(async () => {
    setRunning(true);
    try {
      const response = await fetch("/api/agents/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: "agent_researcher" }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }
      await loadReflections();
    } catch (err) {
      console.error("[reflections.dashboard] Trigger failed", err);
      setError(err instanceof Error ? err.message : "Reflection request failed.");
    } finally {
      setRunning(false);
    }
  }, [loadReflections]);

  const groupedReflections = useMemo(() => {
    const map = new Map<string, AgentReflection[]>();
    for (const reflection of reflections) {
      const key = reflection.agent_id ?? "unknown";
      const bucket = map.get(key) ?? [];
      bucket.push(reflection);
      map.set(key, bucket);
    }
    return Array.from(map.entries());
  }, [reflections]);

  return (
    <main className="min-h-screen bg-[#060608] p-6 text-zinc-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-indigo-300">Agent Reflections</h1>
            <p className="text-sm text-zinc-400">
              Daily summaries of what agents learned and which behaviors delivered impact.
            </p>
          </div>
          <button
            type="button"
            onClick={triggerReflection}
            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={running}
          >
            {running ? "Generating..." : "Trigger Reflection"}
          </button>
        </header>

        {error && (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {groupedReflections.length === 0 ? (
          <section className="rounded-lg border border-white/10 bg-[#111113] p-6 text-sm text-zinc-500">
            No reflections yet. Trigger one to begin the feedback loop.
          </section>
        ) : (
          groupedReflections.map(([agentId, items]) => (
            <section
              key={agentId}
              className="rounded-lg border border-white/10 bg-[#111113] p-4"
            >
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-200">
                  Agent {agentId}
                </h2>
                {loading && (
                  <span className="text-xs text-zinc-500">Refreshing...</span>
                )}
              </header>
              <div className="space-y-3">
                <AnimatePresence>
                  {items.map((reflection) => {
                    const impact =
                      typeof reflection.metadata?.impact === "number"
                        ? reflection.metadata.impact
                        : 0;
                    const confidence = reflection.confidence ?? 0;
                    const impactColor =
                      impact >= 0.8
                        ? "text-emerald-300"
                        : impact <= 0.2
                        ? "text-rose-300"
                        : "text-zinc-300";

                    return (
                      <motion.article
                        key={reflection.id}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="rounded-md border border-white/5 bg-[#1b1b1f] p-3 text-sm"
                      >
                        <p className="whitespace-pre-wrap text-zinc-100">
                          {reflection.content ?? reflection.summary}
                        </p>
                        <footer className="mt-3 flex flex-col gap-1 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-x-2">
                            <span className={impactColor}>
                              impact {impact.toFixed(2)}
                            </span>
                            <span>confidence {confidence.toFixed(2)}</span>
                            {reflection.behavior_id && (
                              <span>behavior {reflection.behavior_id}</span>
                            )}
                          </div>
                          <span>
                            {new Date(reflection.created_at).toLocaleString()}
                          </span>
                        </footer>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}





