import { AppShell } from "@/components/layout/AppShell";
import AdminClient from "@/app/admin/admin-client";

const PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o-mini",
    available: Boolean(process.env.OPENAI_API_KEY),
    description: "Fast, cost-efficient general model",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    defaultModel: "claude-3-sonnet-20240229",
    available: Boolean(process.env.ANTHROPIC_API_KEY),
    description: "Great reasoning with longer context",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    defaultModel: "gemini-1.5-flash",
    available: Boolean(process.env.GOOGLE_API_KEY),
    description: "Large context window and fast",
  },
  {
    id: "local",
    label: "Local LLM",
    defaultModel: "local-llm",
    available: true,
    description: "For offline development",
  },
] as const;

export const dynamic = "force-dynamic";

export default function AdminPage() {
  if (process.env.ADMIN_MODE !== "true") {
    return (
      <AppShell>
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
          Admin mode is disabled. Set <code>ADMIN_MODE=true</code> in your environment to enable the dashboard.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AdminClient providers={Array.from(PROVIDERS)} />
    </AppShell>
  );
}
