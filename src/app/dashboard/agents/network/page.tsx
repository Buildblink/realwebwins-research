"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AgentNetworkResponse {
  success: boolean;
  nodes: Array<{ id: string }>;
  links: Array<{
    id: string;
    source_agent: string;
    target_agent: string;
    relationship?: string | null;
  }>;
}

export default function AgentNetworkPage() {
  const [graph, setGraph] = useState<AgentNetworkResponse>({
    success: true,
    nodes: [],
    links: [],
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadNetwork() {
      try {
        const response = await fetch("/api/agents/network", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Failed to load network (${response.status})`);
        }
        const json = (await response.json()) as AgentNetworkResponse;
        if (mounted) {
          setGraph(json);
        }
      } catch (err) {
        console.error("[dashboard.agent-network] Load failed", err);
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Unable to load agent network."
          );
        }
      }
    }

    loadNetwork();
    const interval = setInterval(loadNetwork, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#060608] p-6 text-zinc-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header>
          <h1 className="text-3xl font-semibold text-indigo-300">Agent Network</h1>
          <p className="text-sm text-zinc-400">
            Visual snapshot of autonomous agent relationships and active links.
          </p>
        </header>

        {error && (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <h2 className="text-lg font-semibold text-zinc-200">Active Links</h2>
          {graph.links.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No agent links recorded yet. Create links via `/api/agents/link`.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              <AnimatePresence>
                {graph.links.map((link) => (
                  <motion.div
                    key={link.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="rounded-md border border-white/5 bg-[#1b1b1f] px-3 py-2 text-sm text-zinc-200"
                  >
                    <span className="text-indigo-300">{link.source_agent}</span>
                    <span className="px-2 text-xs text-zinc-500">→</span>
                    <span className="text-emerald-300">{link.target_agent}</span>
                    {link.relationship && (
                      <span className="ml-3 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-300">
                        {link.relationship}
                      </span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <h2 className="text-lg font-semibold text-zinc-200">Agents</h2>
          {graph.nodes.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No agents discovered yet.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {graph.nodes.map((node) => (
                <span
                  key={node.id}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-200"
                >
                  {node.id}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
