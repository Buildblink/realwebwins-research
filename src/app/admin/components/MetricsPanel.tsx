"use client";

import type { AgentDefinitionRecord } from "@/lib/agents/network";

interface MetricsPanelProps {
  agents: AgentDefinitionRecord[];
  runs: Array<{ duration_ms: number | null }>;
}

export function MetricsPanel({ agents, runs }: MetricsPanelProps) {
  const totalAgents = agents.length;
  const enabledAgents = agents.filter((agent) => agent.enabled).length;
  const avgTemperature = agents.length
    ? (agents.reduce((acc, agent) => acc + (agent.temperature ?? 0.7), 0) / agents.length).toFixed(2)
    : "0";
  const avgLatency = runs.length
    ? (runs.reduce((acc, run) => acc + (run.duration_ms ?? 0), 0) / runs.length).toFixed(0)
    : "0";

  return (
    <section className="grid gap-3 md:grid-cols-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Agents</p>
        <p className="text-2xl font-semibold text-white">{totalAgents}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Enabled</p>
        <p className="text-2xl font-semibold text-white">{enabledAgents}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Avg Temp</p>
        <p className="text-2xl font-semibold text-white">{avgTemperature}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Avg Latency</p>
        <p className="text-2xl font-semibold text-white">{avgLatency} ms</p>
      </div>
    </section>
  );
}
