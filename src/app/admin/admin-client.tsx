"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { AgentCard } from "@/app/admin/components/AgentCard";
import { MetricsPanel } from "@/app/admin/components/MetricsPanel";
import { RunHistory } from "@/app/admin/components/RunHistory";
import type { AgentDefinitionRecord } from "@/lib/agents/network";

interface ProviderOption {
  id: string;
  label: string;
  defaultModel: string;
  available: boolean;
  description?: string;
}

interface AdminClientProps {
  providers: readonly ProviderOption[];
}

interface AgentResponse {
  success: boolean;
  data?: AgentDefinitionRecord[];
  error?: string;
  message?: string;
}

interface RunResponse {
  success: boolean;
  data?: Array<{
    id: string;
    agent_id: string | null;
    input: Record<string, unknown> | null;
    output: Record<string, unknown> | null;
    llm_provider: string | null;
    llm_model: string | null;
    duration_ms: number | null;
    created_at: string;
  }>;
}

async function fetcher(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }
  return response.json();
}

export default function AdminClient({ providers }: AdminClientProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: agentsData, mutate: mutateAgents } = useSWR<AgentResponse>('/api/admin/agents', fetcher);
  const { data: runsData, mutate: mutateRuns } = useSWR<RunResponse>(`/api/admin/sessions?limit=25`, fetcher);

  const agents = agentsData?.data ?? [];
  const runs = runsData?.data ?? [];

  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const activeAgent = useMemo(() => agents.find((agent) => agent.id === selectedAgentId) ?? null, [agents, selectedAgentId]);

  async function handleCreate(newAgent: Partial<AgentDefinitionRecord>) {
    setError(null);
    try {
      const response = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message ?? json.error ?? 'Create failed');
      }
      await mutateAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSave(agent: AgentDefinitionRecord) {
    setError(null);
    try {
      const response = await fetch('/api/admin/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message ?? json.error ?? 'Update failed');
      }
      await mutateAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this agent?')) return;
    setError(null);
    try {
      const response = await fetch(`/api/admin/agents?id=${id}`, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message ?? json.error ?? 'Delete failed');
      }
      if (selectedAgentId === id) {
        setSelectedAgentId(null);
      }
      await mutateAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleTest(agent: AgentDefinitionRecord) {
    setError(null);
    try {
      const response = await fetch('/api/admin/prompts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: agent.llm_provider,
          model: agent.llm_model,
          prompt: agent.prompt,
          temperature: agent.temperature ?? 0.7,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message ?? json.error ?? 'Prompt test failed');
      }
      await mutateRuns();
      alert('✅ Prompt test succeeded. Check run history for details.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Agents</h2>
          <p className="mt-1 text-xs text-zinc-500">Manage prompts, providers, and runtime settings without redeploys.</p>
        </div>
        <div className="space-y-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              providers={providers}
              isSelected={agent.id === selectedAgentId}
              onSelect={() => setSelectedAgentId(agent.id)}
              onSave={handleSave}
              onDelete={handleDelete}
              onTest={handleTest}
            />
          ))}
          <button
            type="button"
            onClick={() =>
              handleCreate({
                name: `agent-${Math.random().toString(16).slice(2, 8)}`,
                role: "New agent",
                prompt: "You are a helpful assistant.",
                llm_provider: providers.find((p) => p.available)?.id ?? "openai",
                llm_model: providers.find((p) => p.available)?.defaultModel ?? "gpt-4o-mini",
                temperature: 0.7,
                enabled: true,
                mode: "relay",
              } as Partial<AgentDefinitionRecord>)
            }
            className="w-full rounded-lg border border-dashed border-white/20 bg-white/5 py-3 text-sm text-zinc-300 transition hover:bg-white/10"
          >
            + Add Agent
          </button>
          {error ? (
            <p className="rounded-lg border border-rose-500/40 bg-rose-500/15 p-3 text-xs text-rose-100">{error}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-6">
        <MetricsPanel agents={agents} runs={runs} />
        <RunHistory runs={runs} />
      </div>
    </div>
  );
}
