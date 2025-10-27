"use client";

interface ProviderOption {
  id: string;
  label: string;
  defaultModel: string;
  available: boolean;
  description?: string;
}

interface LLMSelectorProps {
  provider?: string | null;
  model?: string | null;
  providers: readonly ProviderOption[];
  onChange: (provider: string, model: string) => void;
}

const MODEL_PRESETS: Record<string, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4o-mini-2024-07-18"],
  anthropic: ["claude-3-5-sonnet-20240620", "claude-3-haiku", "claude-3-sonnet-20240229"],
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro"],
  local: ["local-llm"],
};

export function LLMSelector({ provider, model, providers, onChange }: LLMSelectorProps) {
  const availableProviders = providers.filter((item) => item.available);
  const currentProvider = provider ?? (availableProviders[0]?.id ?? "openai");
  const models = MODEL_PRESETS[currentProvider] ?? [model ?? "gpt-4o-mini"];
  const currentModel = model ?? models[0];

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <div>
        <label className="text-xs uppercase tracking-wide text-zinc-500">Provider</label>
        <select
          value={currentProvider}
          onChange={(event) => {
            const nextProvider = event.target.value;
            const defaultModel = providers.find((p) => p.id === nextProvider)?.defaultModel ?? MODEL_PRESETS[nextProvider]?.[0] ?? currentModel;
            onChange(nextProvider, defaultModel);
          }}
          className="mt-1 w-full rounded bg-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
        >
          {providers.map((option) => (
            <option key={option.id} value={option.id} disabled={!option.available}>
              {option.label} {option.available ? "" : "(missing key)"}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-zinc-500">Model</label>
        <select
          value={currentModel}
          onChange={(event) => onChange(currentProvider, event.target.value)}
          className="mt-1 w-full rounded bg-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
        >
          {models.map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
