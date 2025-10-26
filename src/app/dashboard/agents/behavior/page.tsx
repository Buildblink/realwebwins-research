"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface AgentBehavior {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  action_type: string;
  config: Record<string, unknown> | null;
  enabled: boolean | null;
  last_run: string | null;
  created_at: string;
}

interface AgentReflection {
  id: string;
  agent_id: string;
  behavior_id?: string | null;
  confidence?: number | null;
  summary: string;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

interface BehaviorResponse {
  success: boolean;
  data: AgentBehavior[];
}

interface ReflectionResponse {
  success: boolean;
  data: AgentReflection[];
}

async function fetchBehaviors(): Promise<AgentBehavior[]> {
  const response = await fetch("/api/agents/behavior", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load behaviors (${response.status})`);
  }
  const json = (await response.json()) as BehaviorResponse;
  return json.data ?? [];
}

async function fetchReflections(): Promise<AgentReflection[]> {
  const response = await fetch("/api/agents/reflect?limit=120", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load reflections (${response.status})`);
  }
  const json = (await response.json()) as ReflectionResponse;
  return json.data ?? [];
}

export default function AgentBehaviorPage() {
  const [behaviors, setBehaviors] = useState<AgentBehavior[]>([]);
  const [reflections, setReflections] = useState<AgentReflection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [runningBehaviorId, setRunningBehaviorId] = useState<string | null>(null);

  const [agentId, setAgentId] = useState("agent_researcher");
  const [triggerType, setTriggerType] = useState("daily");
  const [actionType, setActionType] = useState("analyze");

  const loadBehaviors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBehaviors();
      setBehaviors(data);
      setError(null);
    } catch (err) {
      console.error("[behavior.dashboard] Load failed", err);
      setError(err instanceof Error ? err.message : "Unable to load behaviors.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReflections = useCallback(async () => {
    try {
      const data = await fetchReflections();
      setReflections(data);
    } catch (err) {
      console.warn("[behavior.dashboard] Reflection load failed", err);
    }
  }, []);

  useEffect(() => {
    loadBehaviors();
    loadReflections();

    const behaviorInterval = setInterval(loadBehaviors, 10000);
    const reflectionInterval = setInterval(loadReflections, 15000);

    return () => {
      clearInterval(behaviorInterval);
      clearInterval(reflectionInterval);
    };
  }, [loadBehaviors, loadReflections]);

  const handleCreate = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsCreating(true);
      try {
        const response = await fetch("/api/agents/behavior", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_id: agentId,
            name: `${agentId}-${actionType}`.toLowerCase(),
            description: `Auto ${triggerType} ${actionType}`,
            action_type: actionType,
            trigger_type: triggerType,
            config: { trigger_type: triggerType },
          }),
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text);
        }

        await Promise.all([loadBehaviors(), loadReflections()]);
        setAgentId("agent_researcher");
        setTriggerType("daily");
        setActionType("analyze");
      } catch (err) {
        console.error("[behavior.dashboard] Create failed", err);
        setError(err instanceof Error ? err.message : "Unable to create behavior.");
      } finally {
        setIsCreating(false);
      }
    },
    [agentId, triggerType, actionType, loadBehaviors, loadReflections]
  );

  const handleRun = useCallback(
    async (behaviorId: string) => {
      setRunningBehaviorId(behaviorId);
      try {
        const response = await fetch("/api/agents/behavior", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: behaviorId, run: true }),
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text);
        }
        await Promise.all([loadBehaviors(), loadReflections()]);
      } catch (err) {
        console.error("[behavior.dashboard] Run failed", err);
        setError(err instanceof Error ? err.message : "Behavior run failed.");
      } finally {
        setRunningBehaviorId(null);
      }
    },
    [loadBehaviors, loadReflections]
  );

  const sortedBehaviors = useMemo(
    () =>
      [...behaviors].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [behaviors]
  );

  const latestImpactByBehavior = useMemo(() => {
    const map = new Map<string, { impact: number; confidence: number; when: string }>();
    for (const reflection of reflections) {
      if (!reflection.behavior_id) continue;
      const impactValue =
        typeof reflection.metadata?.impact === "number"
          ? reflection.metadata.impact
          : null;
      if (impactValue === null) continue;
      const existing = map.get(reflection.behavior_id);
      if (
        !existing ||
        new Date(reflection.created_at).getTime() >
          new Date(existing.when).getTime()
      ) {
        map.set(reflection.behavior_id, {
          impact: impactValue,
          confidence: reflection.confidence ?? 0,
          when: reflection.created_at,
        });
      }
    }
    return map;
  }, [reflections]);

  const renderImpactBadge = (behaviorId: string) => {
    const record = latestImpactByBehavior.get(behaviorId);
    if (!record) return null;

    const { impact } = record;
    let color =
      "border-white/10 bg-white/5 text-zinc-200 hover:border-white/20";
    if (impact >= 0.8) {
      color = "border-emerald-500/50 bg-emerald-500/20 text-emerald-200";
    } else if (impact <= 0.2) {
      color = "border-rose-500/50 bg-rose-500/20 text-rose-200";
    }

    return (
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}
      >
        impact {impact.toFixed(2)}
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-[#060608] p-6 text-zinc-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header>
          <h1 className="text-3xl font-semibold text-amber-300">Agent Behaviors</h1>
          <p className="text-sm text-zinc-400">
            Define autonomous loops, monitor their impact, and trigger manual runs.
          </p>
        </header>

        {error && (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <h2 className="text-lg font-semibold text-zinc-200">Create Behavior</h2>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-3 sm:gap-4"
            onSubmit={handleCreate}
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">Agent ID</span>
              <input
                className="rounded-md border border-white/10 bg-[#1b1b1f] p-2 text-sm text-zinc-100"
                value={agentId}
                onChange={(event) => setAgentId(event.target.value)}
                placeholder="agent_researcher"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">Trigger</span>
              <select
                className="rounded-md border border-white/10 bg-[#1b1b1f] p-2 text-sm text-zinc-100"
                value={triggerType}
                onChange={(event) => setTriggerType(event.target.value)}
              >
                <option value="daily">daily</option>
                <option value="manual">manual</option>
                <option value="event">event</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">Action</span>
              <select
                className="rounded-md border border-white/10 bg-[#1b1b1f] p-2 text-sm text-zinc-100"
                value={actionType}
                onChange={(event) => setActionType(event.target.value)}
              >
                <option value="analyze">Analyze</option>
                <option value="analyze_pain_points">Analyze Pain Points</option>
                <option value="relay">Relay Message</option>
              </select>
            </label>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isCreating}
              >
                {isCreating ? "Creating…" : "Add Behavior"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-200">Behavior List</h2>
            {loading && <span className="text-xs text-zinc-500">Refreshing…</span>}
          </header>
          {sortedBehaviors.length === 0 ? (
            <p className="text-sm text-zinc-500">No behaviors defined yet.</p>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {sortedBehaviors.map((behavior) => {
                  const config = (behavior.config ?? {}) as {
                    trigger_type?: string;
                  };
                  const trigger = config.trigger_type ?? "unspecified";

                  return (
                    <motion.article
                      key={behavior.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="rounded-md border border-white/5 bg-[#1b1b1f] p-3 text-sm"
                    >
                      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-indigo-200">
                            {behavior.name}
                          </h3>
                          <p className="text-xs text-zinc-400">
                            Agent: {behavior.agent_id} | Trigger: {trigger} | Action:{" "}
                            {behavior.action_type}
                          </p>
                          {behavior.description && (
                            <p className="text-xs text-zinc-500">
                              {behavior.description}
                            </p>
                          )}
                          {renderImpactBadge(behavior.id)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRun(behavior.id)}
                          className="inline-flex items-center justify-center rounded-md border border-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={runningBehaviorId === behavior.id}
                        >
                          {runningBehaviorId === behavior.id ? "Running…" : "Run Now"}
                        </button>
                      </header>
                      <footer className="mt-2 flex flex-col gap-1 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                        <span>Enabled: {behavior.enabled === false ? "no" : "yes"}</span>
                        <span>
                          Last run:{" "}
                          {behavior.last_run
                            ? new Date(behavior.last_run).toLocaleString()
                            : "never"}
                        </span>
                      </footer>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
