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
  deliverableMode?: string;
  artifacts?: MVPArtifactSummary[];
  projectFiles?: Record<string, unknown>;
  repoUrl?: string | null;
  deployUrl?: string | null;
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
  deliverable_mode: string | null;
  artifacts: MVPArtifactSummary[];
  project_files: Record<string, unknown>;
  repo_url: string | null;
  deploy_url: string | null;
  created_at: string;
}

export interface MVPArtifactSummary {
  id?: string;
  type: string;
  title?: string;
  format?: string;
  status?: string;
  path?: string;
  generated_at?: string;
  metadata?: Record<string, unknown>;
}

export interface MVPOutputUpdateInput {
  title?: string;
  summary?: string;
  stack?: string | null;
  pricing?: string | null;
  risk?: string | null;
  validationScore?: number | null;
  downloadUrls?: Record<string, string>;
  deliverableMode?: string | null;
  artifacts?: MVPArtifactSummary[];
  projectFiles?: Record<string, unknown>;
  repoUrl?: string | null;
  deployUrl?: string | null;
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
        deliverable_mode: input.deliverableMode ?? "core",
        artifacts: (input.artifacts ?? []) as unknown,
        project_files: input.projectFiles ?? {},
        repo_url: input.repoUrl ?? null,
        deploy_url: input.deployUrl ?? null,
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

export async function updateMVPOutput(
  id: string,
  patch: MVPOutputUpdateInput
): Promise<MVPOutputRecord> {
  const supabase = getSupabaseAdminClient();
  const prepared = preparePatch(patch);
  const { data, error } = await supabase
    .from("mvp_outputs")
    .update(prepared)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`[mvp_outputs] Failed to update MVP output ${id}: ${error.message}`);
  }

  return normalizeOutput(data);
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
    deliverable_mode: row.deliverable_mode ?? null,
    artifacts: Array.isArray(row.artifacts)
      ? (row.artifacts as MVPArtifactSummary[])
      : [],
    project_files: (row.project_files ?? {}) as Record<string, unknown>,
    repo_url: row.repo_url ?? null,
    deploy_url: row.deploy_url ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

function preparePatch(patch: MVPOutputUpdateInput) {
  const update: Record<string, unknown> = {};

  if (patch.title !== undefined) update.title = patch.title;
  if (patch.summary !== undefined) update.summary = patch.summary;
  if (patch.stack !== undefined) update.stack = patch.stack;
  if (patch.pricing !== undefined) update.pricing = patch.pricing;
  if (patch.risk !== undefined) update.risk = patch.risk;
  if (patch.validationScore !== undefined) {
    update.validation_score = patch.validationScore;
  }
  if (patch.downloadUrls !== undefined) {
    update.download_urls = patch.downloadUrls;
  }
  if (patch.deliverableMode !== undefined) {
    update.deliverable_mode = patch.deliverableMode;
  }
  if (patch.artifacts !== undefined) {
    update.artifacts = patch.artifacts;
  }
  if (patch.projectFiles !== undefined) {
    update.project_files = patch.projectFiles;
  }
  if (patch.repoUrl !== undefined) {
    update.repo_url = patch.repoUrl;
  }
  if (patch.deployUrl !== undefined) {
    update.deploy_url = patch.deployUrl;
  }

  return update;
}
