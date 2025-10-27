"use client";

import { useState } from "react";
import { LLMSelector } from "@/app/admin/components/LLMSelector";
import type { AgentDefinitionRecord } from "@/lib/agents/network";

interface ProviderOption {
  id: string;
  label: string;
  defaultModel: string;
  available: boolean;
  description?: string;
}

interface AgentCardProps {
  agent: AgentDefinitionRecord;
  providers: readonly ProviderOption[];
  isSelected: boolean;
  onSelect: () => void;
  onSave: (agent: AgentDefinitionRecord) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onTest: (agent: AgentDefinitionRecord) => Promise<void> | void;
}

export function AgentCard({ agent, providers, isSelected, onSelect, onSave, onDelete, onTest }: AgentCardProps) {
  const [form, setForm] = useState(agent);
  const [saving, setSaving] = useState(false);

  function handleChange<K extends keyof AgentDefinitionRecord>(key: K, value: AgentDefinitionRecord[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border ${isSelected ? "border-[#00ffe0]/50 bg-[#00ffe0]/10" : "border-white/10 bg-white/5"} p-4 transition`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <input
          value={form.name}
          onChange={(event) => handleChange("name", event.target.value)}
          className="w-1/2 rounded bg-white/10 px-3 py-2 text-sm font-semibold text-white focus:outline-none"
        />
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={form.enabled ?? false}
            onChange={(event) => handleChange("enabled", event.target.checked)}
          />
          Enabled
        </label>
      </div>
      <input
        value={form.role ?? ""}
        onChange={(event) => handleChange("role", event.target.value)}
        placeholder="Role (e.g. Researcher)"
        className="mt-2 w-full rounded bg-white/5 px-3 py-2 text-xs text-zinc-200 focus:outline-none"
      />
      <textarea
        value={form.prompt}
        onChange={(event) => handleChange("prompt", event.target.value)}
        className="mt-3 h-32 w-full rounded bg-[#0f1117] px-3 py-2 text-xs text-zinc-100 focus:outline-none"
      />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-500">Mode</label>
        <select
          value={form.mode ?? "relay"}
            onChange={(event) => handleChange("mode", event.target.value)}
            className="mt-1 w-full rounded bg-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
          >
            <option value="relay">Relay</option>
            <option value="assist">Assist</option>
            <option value="analyze">Analyze</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-500">Temperature</label>
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={form.temperature ?? 0.7}
            onChange={(event) => handleChange("temperature", Number.parseFloat(event.target.value))}
            className="mt-1 w-full rounded bg-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
          />
        </div>
      </div>

      <LLMSelector
        provider={form.llm_provider}
        model={form.llm_model}
        providers={providers}
        onChange={(provider, model) => {
          handleChange("llm_provider", provider);
          handleChange("llm_model", model);
        }}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleSave();
          }}
          disabled={saving}
          className="rounded bg-[#00ffe0]/20 px-4 py-2 text-xs font-semibold text-[#00ffe0] transition hover:bg-[#00ffe0]/30 disabled:opacity-50"
        >
          ?? Save
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onTest(form);
          }}
          className="rounded bg-[#6366f1]/20 px-4 py-2 text-xs font-semibold text-[#6366f1] transition hover:bg-[#6366f1]/30"
        >
          ?? Test
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(form.id);
          }}
          className="rounded bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/30"
        >
          ?? Delete
        </button>
      </div>
    </div>
  );
}
