"use client";

import { useCallback, useEffect, useState } from "react";
import { LLMSelector } from "@/app/admin/components/LLMSelector";

interface ProviderOption {
  id: string;
  label: string;
  defaultModel: string;
  available: boolean;
  description?: string;
}

interface ProviderSetting {
  provider: string;
  model: string;
  temperature: number;
}

interface TestResult {
  provider: string;
  model: string;
  durationMs: number;
  tokens: number | null;
  content: string;
}

interface SettingsClientProps {
  adminEnabled: boolean;
  providers: readonly ProviderOption[];
}

export function SettingsClient({ adminEnabled, providers }: SettingsClientProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("Summarize how Realwebwins accelerates MVP delivery.");
  const [result, setResult] = useState<TestResult | null>(null);
  const [settings, setSettings] = useState<ProviderSetting>({
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.7,
  });

  useEffect(() => {
    if (!adminEnabled) {
      setLoading(false);
      return;
    }

    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/settings?key=llm_provider");
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json?.message ?? "Failed to load settings");
        }

        if (json.data?.value) {
          const value = json.data.value as ProviderSetting;
          setSettings({
            provider: value.provider ?? "openai",
            model: value.model ?? "gpt-4o-mini",
            temperature:
              typeof value.temperature === "number" && Number.isFinite(value.temperature)
                ? value.temperature
                : 0.7,
          });
        }
      } catch (cause) {
        console.error(cause);
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setLoading(false);
      }
    }

    loadSettings().catch((cause) => {
      console.error(cause);
      setError(cause instanceof Error ? cause.message : String(cause));
      setLoading(false);
    });
  }, [adminEnabled]);

  const saveSettings = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "llm_provider", value: settings }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.message ?? "Failed to save settings");
      }
      setSuccess("Settings saved successfully.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const testProvider = useCallback(async () => {
    if (!prompt.trim()) {
      setError("Provide a prompt before testing.");
      return;
    }
    setTesting(true);
    setError(null);
    setSuccess(null);
    setResult(null);
    try {
      const response = await fetch("/api/admin/test-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.message ?? "LLM test failed");
      }
      setResult(json.data as TestResult);
      setSuccess(`Prompt test succeeded with ${json.data.provider}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setTesting(false);
    }
  }, [prompt]);

  if (!adminEnabled) {
    return (
      <div className="p-8 text-sm text-zinc-400">
        Admin mode is disabled. Set <code>ADMIN_MODE=true</code> to manage settings.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050505] via-[#101020] to-[#050505] p-6 text-white">
      <div className="mx-auto max-w-4xl rounded-3xl border border-cyan-500/30 bg-white/5 p-6 shadow-2xl shadow-cyan-500/10">
        <div className="flex flex-col gap-2 pb-6">
          <span className="text-sm uppercase tracking-[0.4em] text-cyan-400/80">
            Admin Controls
          </span>
          <h1 className="text-3xl font-bold text-white">LLM Provider Settings</h1>
          <p className="text-sm text-zinc-400">
            Configure the default provider, model, and temperature used across Realwebwins Studio.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-6 text-sm text-zinc-400">
            Loading settings...
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <h2 className="text-lg font-semibold text-white">Provider & Model</h2>
              <p className="text-sm text-zinc-400">
                Choose an available provider. Only providers with configured API keys will be active.
              </p>
              <LLMSelector
                provider={settings.provider}
                model={settings.model}
                providers={providers}
                onChange={(provider, model) => setSettings((prev) => ({ ...prev, provider, model }))}
              />

              <div className="mt-6">
                <label className="text-xs uppercase tracking-wide text-zinc-500">Temperature</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.temperature}
                  onChange={(event) => setSettings((prev) => ({ ...prev, temperature: Number(event.target.value) }))}
                  className="mt-2 w-full accent-cyan-400"
                />
                <div className="mt-1 text-sm text-cyan-300">{settings.temperature.toFixed(2)}</div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
                <button
                  onClick={testProvider}
                  disabled={testing}
                  className="rounded-full border border-cyan-500/60 px-5 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {testing ? "Testing..." : "Run Prompt Test"}
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5">
              <h2 className="text-lg font-semibold text-white">Prompt Sandbox</h2>
              <p className="text-sm text-zinc-400">
                Use the current provider configuration to run a quick sanity check.
              </p>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="mt-4 h-32 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm leading-relaxed text-zinc-100 focus:outline focus:outline-2 focus:outline-cyan-500/60"
              />

              {result && (
                <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-cyan-300/80">
                    <span>
                      {result.provider} · {result.model}
                    </span>
                    <span>
                      {result.durationMs}ms · {result.tokens ?? "?"} tokens
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-cyan-50">{result.content}</p>
                </div>
              )}
            </div>

            {(error || success) && (
              <div className="mt-6 text-sm">
                {error && <p className="text-red-400">⚠️ {error}</p>}
                {success && <p className="text-emerald-400">✅ {success}</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
