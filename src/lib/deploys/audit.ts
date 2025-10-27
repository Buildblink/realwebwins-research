import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export type DeployStatus =
  | "init"
  | "pending"
  | "pushed"
  | "building"
  | "live"
  | "failed";

export interface DeployRecord {
  id: string;
  mvp_id: string;
  user_id: string | null;
  provider: string;
  status: DeployStatus;
  repo_url: string | null;
  deploy_url: string | null;
  error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function createDeployAudit(entry: {
  mvpId: string;
  userId?: string | null;
  provider: string;
  status: DeployStatus;
  repoUrl?: string | null;
  deployUrl?: string | null;
  metadata?: Record<string, unknown>;
  error?: string | null;
}): Promise<DeployRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mvp_deploys")
    .insert([
      {
        mvp_id: entry.mvpId,
        user_id: entry.userId ?? null,
        provider: entry.provider,
        status: entry.status,
        repo_url: entry.repoUrl ?? null,
        deploy_url: entry.deployUrl ?? null,
        metadata: entry.metadata ?? {},
        error: entry.error ?? null,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`[mvp_deploys] Failed to create deploy audit: ${error.message}`);
  }

  return normalizeDeployRecord(data);
}

export async function updateDeployAudit(
  id: string,
  patch: Partial<{
    status: DeployStatus;
    repo_url: string | null;
    deploy_url: string | null;
    metadata: Record<string, unknown>;
    error: string | null;
  }>
): Promise<DeployRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mvp_deploys")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`[mvp_deploys] Failed to update deploy audit: ${error.message}`);
  }

  return normalizeDeployRecord(data);
}

export async function getDeployRecord(id: string): Promise<DeployRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mvp_deploys")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`[mvp_deploys] Failed to load deploy ${id}: ${error.message}`);
  }

  return data ? normalizeDeployRecord(data) : null;
}

export async function listDeploysForMvp(
  mvpId: string
): Promise<DeployRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mvp_deploys")
    .select("*")
    .eq("mvp_id", mvpId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`[mvp_deploys] Failed to list deploys: ${error.message}`);
  }

  return (data ?? []).map(normalizeDeployRecord);
}

function normalizeDeployRecord(row: Record<string, any>): DeployRecord {
  return {
    id: row.id,
    mvp_id: row.mvp_id,
    user_id: row.user_id ?? null,
    provider: row.provider,
    status: (row.status as DeployStatus) ?? "init",
    repo_url: row.repo_url ?? null,
    deploy_url: row.deploy_url ?? null,
    error: row.error ?? null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  };
}
