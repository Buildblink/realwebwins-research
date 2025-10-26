import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export interface MVPOutputInput {
  sessionId: string;
  title: string;
  summary: string;
  stack?: string;
  pricing?: string;
  risk?: string;
  validationScore?: number;
  downloadUrls?: Record<string, string>;
}

export interface MVPOutputRecord {
  id: string;
  session_id: string;
  title: string | null;
  summary: string | null;
  stack: string | null;
  pricing: string | null;
  risk: string | null;
  validation_score: number | null;
  download_urls: Record<string, string>;
  created_at: string;
}

export async function createMVPOutput(input: MVPOutputInput): Promise<MVPOutputRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mvp_outputs")
    .insert([
      {
        session_id: input.sessionId,
        title: input.title,
        summary: input.summary,
        stack: input.stack ?? null,
        pricing: input.pricing ?? null,
        risk: input.risk ?? null,
        validation_score: input.validationScore ?? null,
        download_urls: input.downloadUrls ?? {},
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`[mvp_outputs] Failed to create MVP output: ${error.message}`);
  }

  return normalizeOutput(data);
}

export async function getMVPOutput(id: string): Promise<MVPOutputRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mvp_outputs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`[mvp_outputs] Failed to load MVP output: ${error.message}`);
  }

  return data ? normalizeOutput(data) : null;
}

export async function getMVPOutputBySession(
  sessionId: string
): Promise<MVPOutputRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mvp_outputs")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (error) {
    throw new Error(
      `[mvp_outputs] Failed to load MVP by session ${sessionId}: ${error.message}`
    );
  }

  return data ? normalizeOutput(data) : null;
}

function normalizeOutput(row: Record<string, any>): MVPOutputRecord {
  return {
    id: row.id,
    session_id: row.session_id,
    title: row.title ?? null,
    summary: row.summary ?? null,
    stack: row.stack ?? null,
    pricing: row.pricing ?? null,
    risk: row.risk ?? null,
    validation_score:
      typeof row.validation_score === "number" ? row.validation_score : null,
    download_urls: (row.download_urls ?? {}) as Record<string, string>,
    created_at: row.created_at ?? new Date().toISOString(),
  };
}
