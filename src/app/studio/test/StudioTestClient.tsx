"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface AgentRecord {
  id: string;
  name: string;
  role: string | null;
  prompt: string;
  mode: string;
  llm_provider: string;
  llm_model: string;
  temperature: number | null;
  enabled: boolean | null;
  updated_at: string;
}

interface TestResult {
  provider: string;
  model: string;
  durationMs: number;
  tokens: number | null;
  content: string;
}

interface StudioTestClientProps {
  adminEnabled: boolean;
}

export function StudioTestClient({ adminEnabled }: StudioTestClientProps) {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);

  useEffect(() => {
    if (!adminEnabled) {
      setIsLoading(false);
      return;
    }
    async function loadAgents() {
      try {
        const response = await fetch("/api/admin/agents", { cache: "no-store" });
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json?.message ?? "Failed to load agents");
        }
        const data = (json.data ?? []) as AgentRecord[];
        setAgents(data);
        if (data.length > 0) {
          setSelectedId(data[0].id);
          setPrompt(data[0].prompt);
        }
      } catch (cause) {
        console.error(cause);
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setIsLoading(false);
      }
    }

    loadAgents().catch((cause) => {
      console.error(cause);
      setError(cause instanceof Error ? cause.message : String(cause));
      setIsLoading(false);
    });
  }, [adminEnabled]);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedId) ?? null,
    [agents, selectedId]
  );

  useEffect(() => {
    if (!selectedAgent) return;
    setPrompt(selectedAgent.prompt);
    setResult(null);
    setError(null);
  }, [selectedAgent?.id]);

  const handleSave = useCallback(async () => {
    if (!selectedAgent) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedAgent.id, prompt }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.message ?? "Failed to save prompt");
      }
      setAgents((previous) =>
        previous.map((agent) =>
          agent.id === selectedAgent.id ? { ...agent, prompt } : agent
        )
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSaving(false);
    }
  }, [prompt, selectedAgent]);

  const handleTest = useCallback(async () => {
    if (!selectedAgent) return;
    if (!prompt.trim()) {
      setError("Provide a prompt before running a test.");
      return;
    }
    setIsTesting(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/admin/test-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          provider: selectedAgent.llm_provider,
          model: selectedAgent.llm_model,
          temperature: selectedAgent.temperature ?? 0.7,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.message ?? "Prompt test failed");
      }
      setResult(json.data as TestResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsTesting(false);
    }
  }, [prompt, selectedAgent]);

  if (!adminEnabled) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-zinc-400">
        Admin mode is disabled. Enable <code>ADMIN_MODE=true</code> to access the prompt sandbox.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-emerald-500/30 bg-white/5 p-6 shadow-2xl shadow-emerald-500/10">
        <span className="text-xs uppercase tracking-[0.4em] text-emerald-300/80">
          Studio Sandbox
        </span>
        <h1 className="mt-2 text-3xl font-bold text-white">Prompt Test Harness</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Iterate on agent prompts safely. Select an agent, tweak the prompt, run an instant LLM test, and save when satisfied.
        </p>
      </header>

      {isLoading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
          Loading agents...
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <aside className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h2 className="text-xs uppercase tracking-wide text-emerald-300/80">Agents</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Pick an active agent to inspect and test its latest prompt configuration.
              </p>
            </div>
            <div className="space-y-2">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedId(agent.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    selectedId === agent.id
                      ? "border-emerald-400/60 bg-emerald-500/15 text-white"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:border-emerald-400/40 hover:text-white"
                  }`}
                >
                  <div className="font-semibold">{agent.name}</div>
                  <div className="text-xs text-zinc-400">
                    {agent.llm_provider} · {agent.llm_model}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
            {selectedAgent ? (
              <>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-white">
                      {selectedAgent.name}
                    </h2>
                    <span className="rounded-full border border-emerald-400/40 px-3 py-1 text-xs uppercase tracking-wide text-emerald-200">
                      {selectedAgent.mode}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    Provider: {selectedAgent.llm_provider} · Model: {selectedAgent.llm_model} · Temp:{" "}
                    {(selectedAgent.temperature ?? 0.7).toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wide text-zinc-500">Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    className="mt-2 h-56 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 font-mono text-sm leading-relaxed text-emerald-50 focus:outline focus:outline-2 focus:outline-emerald-400/60"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={handleTest}
                    className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isTesting ? "Testing..." : "Run Test"}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSave}
                    className="rounded-full border border-emerald-400/60 px-5 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save Prompt"}
                  </button>
                  <span className="text-xs text-zinc-500">
                    Last updated {new Date(selectedAgent.updated_at).toLocaleString()}
                  </span>
                </div>

                {result && (
                  <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-emerald-300/80">
                      <span>
                        {result.provider} · {result.model}
                      </span>
                      <span>
                        {result.durationMs}ms · {result.tokens ?? "?"} tokens
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-emerald-50">
                      {result.content}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-zinc-400">
                Select an agent to begin testing.
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/15 p-4 text-sm text-rose-100">
                ⚠️ {error}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
