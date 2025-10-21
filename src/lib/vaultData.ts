import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type {
  VaultProjectSummary,
  VaultProjectDetail,
  VaultStage,
  VaultFeedItem,
} from "@/types/supabase";

export interface VaultQueryParams {
  tag?: string | null;
  stage?: VaultStage | null;
  q?: string | null;
  page?: number;
  pageSize?: number;
  limit?: number;
  publicOnly?: boolean;
}

export interface VaultQueryResult {
  projects: VaultProjectSummary[];
  total: number;
}

export interface VaultTagsResult {
  tag: string;
  count: number;
}

export interface VaultFeedOptions {
  limit?: number;
}

const DEFAULT_PAGE_SIZE = 20;

async function logVaultFailure(message: string, errorLog?: string) {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("AgentStatus").insert([
      {
        idea: "vault",
        stage: "vault_fetch",
        success: false,
        error_log: errorLog ?? message,
        last_run: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.warn("[vaultData] failed to log AgentStatus entry", error);
    }
  } catch (logError) {
    console.warn("[vaultData] unexpected error while logging failure", logError);
  }
}

function computeConfidenceScore(confidence: string | null | undefined): number | null {
  if (!confidence) return null;
  const normalized = confidence.toLowerCase();
  if (normalized === "high") return 90;
  if (normalized === "medium") return 60;
  if (normalized === "low") return 40;
  return null;
}

function deriveStage(summary: {
  hasActionPlan: boolean;
  hasPlaybook: boolean;
}): VaultStage {
  if (summary.hasPlaybook) return "playbook";
  if (summary.hasActionPlan) return "plan";
  return "research";
}

export async function fetchVaultProjects(params: VaultQueryParams): Promise<VaultQueryResult> {
  const {
    tag,
    stage = null,
    q = null,
    page = 1,
    limit,
    pageSize = DEFAULT_PAGE_SIZE,
    publicOnly = false,
  } = params;

  const effectivePageSize = limit ?? pageSize ?? DEFAULT_PAGE_SIZE;
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("research_projects")
    .select(
      `
        id,
        title,
        verdict,
        idea_description,
        tags,
        score,
        confidence,
        created_at,
        updated_at,
        is_public,
        ActionPlans:ActionPlans ( id ),
        Playbooks:Playbooks ( id )
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  } else {
    query = query.range((page - 1) * effectivePageSize, page * effectivePageSize - 1);
  }

  if (publicOnly) {
    query = query.eq("is_public", true);
  }

  if (tag && tag.toLowerCase() !== "all") {
    query = query.contains("tags", [tag]);
  }

  if (q) {
    const searchTerm = `%${q}%`;
    query = query.or(
      `title.ilike.${searchTerm},idea_description.ilike.${searchTerm}`,
      { foreignTable: undefined }
    );
  }

  if (stage === "plan") {
    query = query.not("ActionPlans", "is", null);
  } else if (stage === "playbook") {
    query = query.not("Playbooks", "is", null);
  }

  const { data, error, count } = await query;

  if (error) {
    await logVaultFailure("Supabase vault fetch failed", error.message);
    throw error;
  }

  const projects: VaultProjectSummary[] = (data ?? []).map((item) => {
    const actionPlanRecords = Array.isArray(item.ActionPlans) ? item.ActionPlans : [];
    const playbookRecords = Array.isArray(item.Playbooks) ? item.Playbooks : [];
    const confidenceScore = computeConfidenceScore(
      typeof item.confidence === "string" ? item.confidence : null
    );
    const hasActionPlan = actionPlanRecords.length > 0;
    const hasPlaybook = playbookRecords.length > 0;

    return {
      id: item.id,
      idea_description: item.idea_description ?? "",
      tags: Array.isArray(item.tags) ? item.tags : [],
      confidence_score: confidenceScore,
      has_action_plan: hasActionPlan,
      has_playbook: hasPlaybook,
      created_at: item.created_at,
      updated_at: item.updated_at ?? item.created_at,
      title: item.title,
      verdict: item.verdict ?? null,
      score: typeof item.score === "number" ? item.score : null,
      is_public: Boolean(item.is_public),
    };
  });

  const filteredProjects =
    stage === "research"
      ? projects.filter((project) => !project.has_action_plan && !project.has_playbook)
      : projects;

  return {
    projects: filteredProjects,
    total: count ?? filteredProjects.length,
  };
}

export async function fetchVaultTags(options: { publicOnly?: boolean } = {}): Promise<VaultTagsResult[]> {
  const { publicOnly = false } = options;
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("research_projects")
    .select("tags", { count: "exact" });

  if (publicOnly) {
    query = query.eq("is_public", true);
  }

  const { data, error } = await query;

  if (error) {
    await logVaultFailure("Supabase tag aggregation failed", error.message);
    throw error;
  }

  const tagCounts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!Array.isArray(row.tags)) continue;
    for (const tag of row.tags) {
      if (typeof tag !== "string" || tag.trim().length === 0) continue;
      const normalized = tag.trim();
      tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function fetchVaultProjectDetail(
  id: string,
  options: { requirePublic?: boolean } = {}
): Promise<VaultProjectDetail | null> {
  const { requirePublic = false } = options;
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("research_projects")
    .select(
      `
        id,
        title,
        idea_description,
        research_report,
        verdict,
        score,
        tags,
        is_public,
        created_at,
        updated_at,
        ActionPlans:ActionPlans ( markdown, created_at ),
        Playbooks:Playbooks ( markdown, created_at )
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    await logVaultFailure("Supabase detail fetch failed", error.message);
    throw error;
  }

  if (!data) {
    return null;
  }

  if (requirePublic && !data.is_public) {
    return null;
  }

  const actionPlanRecords = Array.isArray(data.ActionPlans) ? data.ActionPlans : [];
  const playbookRecords = Array.isArray(data.Playbooks) ? data.Playbooks : [];

  const hasActionPlan = actionPlanRecords.length > 0;
  const hasPlaybook = playbookRecords.length > 0;

  const stage = deriveStage({
    hasActionPlan,
    hasPlaybook,
  });

  return {
    id: data.id,
    title: data.title ?? "Untitled Project",
    idea_description: data.idea_description ?? "",
    research_report: typeof data.research_report === "string" ? data.research_report : null,
    action_plan_markdown: hasActionPlan ? actionPlanRecords[0]?.markdown ?? null : null,
    playbook_markdown: hasPlaybook ? playbookRecords[0]?.markdown ?? null : null,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    is_public: Boolean(data.is_public),
    stage,
    created_at: data.created_at,
    updated_at: data.updated_at ?? data.created_at,
    verdict: data.verdict ?? null,
    score: typeof data.score === "number" ? data.score : null,
  };
}

export async function fetchVaultFeed(
  options: VaultFeedOptions = {}
): Promise<VaultFeedItem[]> {
  const { limit = 10 } = options;
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("research_projects")
    .select(
      `
        id,
        title,
        idea_description,
        tags,
        score,
        confidence,
        verdict,
        created_at,
        updated_at,
        last_refreshed_at
      `
    )
    .eq("is_public", true)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    await logVaultFailure("Supabase feed fetch failed", error.message);
    throw error;
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.title ?? "Untitled Project",
    idea_description: item.idea_description ?? "",
    tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
    confidence: typeof item.confidence === "string" ? item.confidence : null,
    score: typeof item.score === "number" ? item.score : null,
    verdict: item.verdict ?? null,
    created_at: item.created_at,
    updated_at: item.updated_at ?? item.created_at,
    last_refreshed_at:
      item.last_refreshed_at ?? item.updated_at ?? item.created_at,
  }));
}
