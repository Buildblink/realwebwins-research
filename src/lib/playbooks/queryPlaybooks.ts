import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type {
  Playbook,
  PlaybookWithRelated,
  PlaybookFilters,
  PlaybookResponse,
  PlaybookTool,
  AffiliateLink,
} from "@/types/playbook";

const DEFAULT_PAGE_SIZE = 20;

async function logPlaybookFailure(message: string, errorLog?: string) {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("AgentStatus").insert([
      {
        idea: "playbooks",
        stage: "playbooks_fetch",
        success: false,
        error_log: errorLog ?? message,
        last_run: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.warn("[queryPlaybooks] failed to log AgentStatus entry", error);
    }
  } catch (logError) {
    console.warn("[queryPlaybooks] unexpected error while logging failure", logError);
  }
}

function parseJsonbField<T>(field: unknown, fallback: T): T {
  if (Array.isArray(field)) {
    return field as T;
  }
  if (typeof field === "string") {
    try {
      return JSON.parse(field) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function mapPlaybook(data: unknown): Playbook {
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    slug: String(row.slug ?? ""),
    description: row.description ? String(row.description) : null,
    content: row.content ? String(row.content) : null,
    category: row.category ? String(row.category) : null,
    niche: row.niche ? String(row.niche) : null,
    related_pain_id: row.related_pain_id ? String(row.related_pain_id) : null,
    related_case_id: row.related_case_id ? String(row.related_case_id) : null,
    tools: parseJsonbField<PlaybookTool[]>(row.tools, []),
    affiliate_links: parseJsonbField<AffiliateLink[]>(row.affiliate_links, []),
    created_at: String(row.created_at),
  };
}

export async function queryPlaybooks(filters: PlaybookFilters = {}): Promise<PlaybookResponse> {
  const {
    category = null,
    niche = null,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = filters;

  const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE;
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("playbooks")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  // Apply pagination
  query = query.range((page - 1) * effectivePageSize, page * effectivePageSize - 1);

  // Apply filters
  if (category && category.toLowerCase() !== "all") {
    query = query.eq("category", category);
  }

  if (niche && niche.toLowerCase() !== "all") {
    query = query.eq("niche", niche);
  }

  const { data, error, count } = await query;

  if (error) {
    await logPlaybookFailure("Supabase playbooks fetch failed", error.message);
    throw error;
  }

  const playbooks: Playbook[] = (data ?? []).map(mapPlaybook);

  const total = count ?? playbooks.length;
  const totalPages = Math.ceil(total / effectivePageSize);

  return {
    data: playbooks,
    total,
    page,
    pageSize: effectivePageSize,
    totalPages,
  };
}

export async function getPlaybookBySlug(slug: string): Promise<PlaybookWithRelated | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("playbooks")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    await logPlaybookFailure("Supabase playbook detail fetch failed", error.message);
    throw error;
  }

  if (!data) {
    return null;
  }

  const playbook = mapPlaybook(data);

  // Fetch related pain point if exists
  let relatedPain = null;
  if (playbook.related_pain_id) {
    const { data: painData } = await supabase
      .from("pain_points")
      .select("id, text, category, niche")
      .eq("id", playbook.related_pain_id)
      .maybeSingle();

    if (painData) {
      relatedPain = {
        id: painData.id,
        text: painData.text,
        category: painData.category,
        niche: painData.niche,
      };
    }
  }

  // Fetch related case if exists
  let relatedCase = null;
  if (playbook.related_case_id) {
    const { data: caseData } = await supabase
      .from("research_projects")
      .select("id, title, idea_description, score")
      .eq("id", playbook.related_case_id)
      .maybeSingle();

    if (caseData) {
      relatedCase = {
        id: caseData.id,
        title: caseData.title,
        idea_description: caseData.idea_description,
        score: typeof caseData.score === "number" ? caseData.score : null,
      };
    }
  }

  return {
    ...playbook,
    related_pain: relatedPain,
    related_case: relatedCase,
  };
}

export async function getPlaybookCategories(): Promise<string[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("playbooks")
    .select("category")
    .not("category", "is", null);

  if (error) {
    await logPlaybookFailure("Supabase categories fetch failed", error.message);
    return [];
  }

  const categories = new Set<string>();
  for (const row of data ?? []) {
    if (row.category && typeof row.category === "string") {
      categories.add(row.category);
    }
  }

  return Array.from(categories).sort();
}

export async function getPlaybookNiches(): Promise<string[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("playbooks")
    .select("niche")
    .not("niche", "is", null);

  if (error) {
    await logPlaybookFailure("Supabase niches fetch failed", error.message);
    return [];
  }

  const niches = new Set<string>();
  for (const row of data ?? []) {
    if (row.niche && typeof row.niche === "string") {
      niches.add(row.niche);
    }
  }

  return Array.from(niches).sort();
}
