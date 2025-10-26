import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { PainPoint } from "@/types/painpoint";

export interface SearchPainPointsOptions {
  query?: string;
  category?: string;
  limit?: number;
}

export async function searchPainPoints(options: SearchPainPointsOptions): Promise<PainPoint[]> {
  const supabase = getSupabaseAdminClient();
  const limit = options.limit ?? 12;

  let query = supabase
    .from("pain_points")
    .select("*")
    .order("popularity_score", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (options.category && options.category.toLowerCase() !== "all") {
    query = query.eq("category", options.category);
  }

  if (options.query && options.query.trim().length > 0) {
    const fuzzy = `%${options.query.trim()}%`;
    query = query.or(
      `text.ilike.${fuzzy},summary.ilike.${fuzzy},category.ilike.${fuzzy},niche.ilike.${fuzzy}`
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`[searchPainPoints] Failed to search: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    text: row.text ?? "",
    summary: row.summary ?? row.text ?? "",
    category: row.category ?? null,
    niche: row.niche ?? null,
    source: row.source ?? null,
    audience: row.audience ?? null,
    frequency: typeof row.frequency === "number" ? row.frequency : null,
    popularity_score:
      typeof row.popularity_score === "number" ? row.popularity_score : null,
    proof_link: row.proof_link ?? null,
    proof_links: Array.isArray(row.proof_links) ? row.proof_links : null,
    related_case_id: row.related_case_id ?? null,
    related_playbook: row.related_playbook ?? null,
    last_seen: row.last_seen ?? null,
    created_at: row.created_at,
  }));
}
