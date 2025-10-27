import { SettingsClient } from "@/app/admin/settings/SettingsClient";

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
    defaultModel: "claude-3-5-sonnet-20240620",
    available: Boolean(process.env.ANTHROPIC_API_KEY),
    description: "Great reasoning with longer context",
  },
  {
    id: "gemini",
    label: "Gemini",
    defaultModel: "gemini-1.5-flash",
    available: Boolean(process.env.GOOGLE_API_KEY),
    description: "Large context window and fast responses",
  },
] as const;

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  const adminEnabled = process.env.ADMIN_MODE === "true";
  return <SettingsClient adminEnabled={adminEnabled} providers={Array.from(PROVIDERS)} />;
}
