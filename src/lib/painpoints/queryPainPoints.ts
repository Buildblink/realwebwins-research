import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type {
  PainPoint,
  PainPointFilters,
  PainPointResponse,
  PainPointSeed,
} from "@/types/painpoint";

const DEFAULT_PAGE_SIZE = 20;

async function logPainPointFailure(message: string, errorLog?: string) {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("AgentStatus").insert([
      {
        idea: "pain_points",
        stage: "pain_points_fetch",
        success: false,
        error_log: errorLog ?? message,
        last_run: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.warn("[queryPainPoints] failed to log AgentStatus entry", error);
    }
  } catch (logError) {
    console.warn("[queryPainPoints] unexpected error while logging failure", logError);
  }
}

export async function queryPainPoints(filters: PainPointFilters = {}): Promise<PainPointResponse> {
  const {
    search = null,
    category = null,
    niche = null,
    source = null,
    audience = null,
    hasPlaybook = null,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    sort = "recent",
  } = filters;

  const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE;
  const supabase = getSupabaseAdminClient();

  let query = supabase.from("pain_points").select("*", { count: "exact" });

  if (sort === "popularity") {
    query = query.order("popularity_score", { ascending: false, nullsFirst: false });
  } else {
    query = query
      .order("last_seen", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  }

  // Apply pagination
  query = query.range((page - 1) * effectivePageSize, page * effectivePageSize - 1);

  // Apply filters
  if (category && category.toLowerCase() !== "all") {
    query = query.eq("category", category);
  }

  if (niche && niche.toLowerCase() !== "all") {
    query = query.eq("niche", niche);
  }

  if (source && source.toLowerCase() !== "all") {
    query = query.eq("source", source);
  }

  if (audience && audience.toLowerCase() !== "all") {
    query = query.eq("audience", audience);
  }

  if (hasPlaybook === true) {
    query = query.not("related_playbook", "is", null);
  }

  // Apply full-text search
  if (search && search.trim().length > 0) {
    const searchTerm = search.trim();
    const ilike = `%${searchTerm}%`;
    query = query.or(
      `text.ilike.${ilike},summary.ilike.${ilike},category.ilike.${ilike},niche.ilike.${ilike}`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    await logPainPointFailure("Supabase pain_points fetch failed", error.message);
    throw error;
  }

  const painPoints: PainPoint[] = (data ?? []).map((item) => ({
    id: item.id,
    text: item.text ?? "",
    summary: item.summary ?? item.text ?? "",
    category: item.category ?? null,
    niche: item.niche ?? null,
    source: item.source ?? null,
    audience: item.audience ?? null,
    frequency: typeof item.frequency === "number" ? item.frequency : null,
    popularity_score:
      typeof item.popularity_score === "number" ? item.popularity_score : null,
    proof_link: item.proof_link ?? null,
    proof_links: Array.isArray(item.proof_links) ? item.proof_links : null,
    related_case_id: item.related_case_id ?? null,
    related_playbook: item.related_playbook ?? null,
    last_seen: item.last_seen ?? null,
    created_at: item.created_at,
  }));

  const total = count ?? painPoints.length;
  const totalPages = Math.ceil(total / effectivePageSize);

  return {
    data: painPoints,
    total,
    page,
    pageSize: effectivePageSize,
    totalPages,
  };
}

export async function getPainPointById(id: string): Promise<PainPoint | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("pain_points")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    await logPainPointFailure("Supabase pain_point detail fetch failed", error.message);
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    text: data.text ?? "",
    summary: data.summary ?? data.text ?? "",
    category: data.category ?? null,
    niche: data.niche ?? null,
    source: data.source ?? null,
    audience: data.audience ?? null,
    frequency: typeof data.frequency === "number" ? data.frequency : null,
    popularity_score:
      typeof data.popularity_score === "number" ? data.popularity_score : null,
    proof_link: data.proof_link ?? null,
    proof_links: Array.isArray(data.proof_links) ? data.proof_links : null,
    related_case_id: data.related_case_id ?? null,
    related_playbook: data.related_playbook ?? null,
    last_seen: data.last_seen ?? null,
    created_at: data.created_at,
  };
}

export async function getPainPointCategories(): Promise<string[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("pain_points")
    .select("category")
    .not("category", "is", null);

  if (error) {
    await logPainPointFailure("Supabase categories fetch failed", error.message);
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

export async function getPainPointNiches(): Promise<string[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("pain_points")
    .select("niche")
    .not("niche", "is", null);

  if (error) {
    await logPainPointFailure("Supabase niches fetch failed", error.message);
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

export async function getPainPointSources(): Promise<string[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("pain_points")
    .select("source")
    .not("source", "is", null);

  if (error) {
    await logPainPointFailure("Supabase sources fetch failed", error.message);
    return [];
  }

  const sources = new Set<string>();
  for (const row of data ?? []) {
    if (row.source && typeof row.source === "string") {
      sources.add(row.source);
    }
  }

  return Array.from(sources).sort();
}

export async function getPainPointAudiences(): Promise<string[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("pain_points")
    .select("audience")
    .not("audience", "is", null);

  if (error) {
    await logPainPointFailure("Supabase audiences fetch failed", error.message);
    return [];
  }

  const audiences = new Set<string>();
  for (const row of data ?? []) {
    if (row.audience && typeof row.audience === "string") {
      audiences.add(row.audience);
    }
  }

  return Array.from(audiences).sort();
}

export async function createPainPoint(seed: PainPointSeed) {
  const supabase = getSupabaseAdminClient();
  const payload = {
    text: seed.text,
    summary: seed.summary ?? seed.text,
    category: seed.category ?? null,
    niche: seed.niche ?? null,
    source: seed.source ?? null,
    audience: seed.audience ?? null,
    frequency: typeof seed.frequency === "number" ? seed.frequency : 1,
    popularity_score:
      typeof seed.popularity_score === "number" ? seed.popularity_score : null,
    proof_link: seed.proof_link ?? null,
    proof_links: Array.isArray(seed.proof_links) ? seed.proof_links : null,
    related_playbook: seed.related_playbook ?? null,
  };

  const { data, error } = await supabase
    .from("pain_points")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("[painpoints.create] Failed to insert pain point", error);
    throw error;
  }

  return data;
}
