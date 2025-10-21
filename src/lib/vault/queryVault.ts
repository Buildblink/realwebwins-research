import type { ResearchAgentProject } from "@/agents/runResearchAgent";

interface VaultQueryResult {
  sources: Array<{
    id: string;
    title?: string;
    summary?: string;
    url?: string;
  }>;
  notes: string;
}

export async function queryVault(
  project: ResearchAgentProject
): Promise<VaultQueryResult> {
  // Placeholder implementation — future versions will query Supabase or another knowledge source.
  void project;
  return {
    sources: [],
    notes: "vault not yet connected",
  };
}
