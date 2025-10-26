import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface AgentLinkRow {
  id: string;
  source_agent: string;
  target_agent: string;
  collaboration_type: string | null;
  strength: number | null;
  context: Record<string, unknown> | null;
  created_at: string;
}

export interface AgentNetworkNode {
  id: string;
}

export interface AgentNetworkLink {
  id: string;
  source_agent: string;
  target_agent: string;
  collaboration_type: string | null;
  strength: number | null;
  context: Record<string, unknown> | null;
  created_at: string;
}

export interface AgentNetworkGraph {
  nodes: AgentNetworkNode[];
  links: AgentNetworkLink[];
}

export async function getAgentNetwork(): Promise<AgentNetworkGraph> {
  const supabase = getSupabaseAdminClient();

  const { data: links, error } = await supabase
    .from("agent_links")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`[agents.network] Failed to load agent links: ${error.message}`);
  }

  const normalized = (links ?? []) as AgentLinkRow[];
  const nodeIds = new Set<string>();
  normalized.forEach((link) => {
    if (link.source_agent) {
      nodeIds.add(link.source_agent);
    }
    if (link.target_agent) {
      nodeIds.add(link.target_agent);
    }
  });

  return {
    nodes: Array.from(nodeIds).map((id) => ({ id })),
    links: normalized.map((link) => ({
      id: link.id,
      source_agent: link.source_agent,
      target_agent: link.target_agent,
      collaboration_type: link.collaboration_type,
      strength: link.strength,
      context: link.context,
      created_at: link.created_at,
    })),
  };
}
