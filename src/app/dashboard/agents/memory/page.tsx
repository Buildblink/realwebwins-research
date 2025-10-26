"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AgentMemoryEntry {
  id: string;
  agent_id: string;
  topic: string;
  content: string;
  relevance: number | null;
  last_updated: string;
}

interface MemoryResponse {
  success: boolean;
  data: AgentMemoryEntry[];
}

const fetchMemory = async (params: URLSearchParams) => {
  const response = await fetch(`/api/agents/memory?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load memory (${response.status})`);
  }
  const json = (await response.json()) as MemoryResponse;
  return json.data ?? [];
};

export default function AgentMemoryPage() {
  const [entries, setEntries] = useState<AgentMemoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [agentId, setAgentId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const loadMemory = useCallback(async () => {
    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    if (agentId) params.set("agent_id", agentId);
    if (search) params.set("q", search);
    setLoading(true);
    try {
      const data = await fetchMemory(params);
      setEntries(data);
      setError(null);
    } catch (err) {
      console.error("[memory.dashboard] Load failed", err);
      setError(
        err instanceof Error ? err.message : "Unable to load agent memory."
      );
    } finally {
      setLoading(false);
    }
  }, [topic, agentId, search]);

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  const uniqueTopics = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.topic))).sort(),
    [entries]
  );

  return (
    <main className="min-h-screen bg-[#060608] p-6 text-zinc-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header>
          <h1 className="text-3xl font-semibold text-emerald-300">Agent Memory</h1>
          <p className="text-sm text-zinc-400">
            Shared knowledge base synchronized from agent insights.
          </p>
        </header>

        {error && (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <header className="mb-3">
            <h2 className="text-lg font-semibold text-zinc-200">Filters</h2>
          </header>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">Topic</span>
              <input
                className="rounded-md border border-white/10 bg-[#1b1b1f] p-2 text-sm text-zinc-100"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                list="memory-topics"
                placeholder="e.g. trend_analysis"
              />
              <datalist id="memory-topics">
                {uniqueTopics.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">Agent</span>
              <input
                className="rounded-md border border-white/10 bg-[#1b1b1f] p-2 text-sm text-zinc-100"
                value={agentId}
                onChange={(event) => setAgentId(event.target.value)}
                placeholder="agent_researcher"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">Search</span>
              <input
                className="rounded-md border border-white/10 bg-[#1b1b1f] p-2 text-sm text-zinc-100"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="keyword…"
              />
            </label>
            <div className="sm:col-span-3 flex gap-3">
              <button
                type="button"
                onClick={loadMemory}
                className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Apply Filters"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTopic("");
                  setAgentId("");
                  setSearch("");
                }}
                className="inline-flex items-center justify-center rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-200">Memory Entries</h2>
            {loading && <span className="text-xs text-zinc-500">Loading…</span>}
          </header>
          {entries.length === 0 ? (
            <p className="text-sm text-zinc-500">No memory entries found.</p>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {entries.map((entry) => (
                  <motion.article
                    key={entry.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="rounded-md border border-white/5 bg-[#1b1b1f] p-3 text-sm"
                  >
                    <header className="mb-2 flex flex-col gap-1 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        <span className="text-emerald-300">{entry.topic}</span> ·{" "}
                        {entry.agent_id}
                      </span>
                      <span>
                        Updated: {new Date(entry.last_updated).toLocaleString()}
                      </span>
                    </header>
                    <p className="whitespace-pre-wrap text-zinc-100">
                      {entry.content}
                    </p>
                    <footer className="mt-2 text-xs text-zinc-500">
                      Relevance:{" "}
                      {typeof entry.relevance === "number"
                        ? entry.relevance.toFixed(2)
                        : "n/a"}
                    </footer>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
