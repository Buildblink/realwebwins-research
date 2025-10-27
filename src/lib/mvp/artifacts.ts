import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export type ArtifactValidationStatus = "pending" | "valid" | "invalid" | "warning";

export interface MVPArtifactInput {
  mvpId: string;
  artifactType: string;
  title?: string;
  format?: string;
  content: unknown;
  validationStatus?: ArtifactValidationStatus;
  validationErrors?: string[];
  metadata?: Record<string, unknown>;
}

export interface MVPArtifactRecord {
  id: string;
  mvp_id: string;
  artifact_type: string;
  title: string | null;
  format: string | null;
  content: unknown;
  validation_status: ArtifactValidationStatus;
  validation_errors: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function createMVPArtifacts(
  artifacts: MVPArtifactInput[]
): Promise<MVPArtifactRecord[]> {
  if (!artifacts.length) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const payload = artifacts.map((artifact) => ({
    mvp_id: artifact.mvpId,
    artifact_type: artifact.artifactType,
    title: artifact.title ?? null,
    format: artifact.format ?? null,
    content: serializeContent(artifact.content),
    validation_status: artifact.validationStatus ?? "pending",
    validation_errors: (artifact.validationErrors ?? []) as unknown,
    metadata: artifact.metadata ?? {},
  }));

  const { data, error } = await supabase
    .from("mvp_artifacts")
    .insert(payload)
    .select();

  if (error) {
    throw new Error(`[mvp_artifacts] Failed to persist artifacts: ${error.message}`);
  }

  return (data ?? []).map(normalizeArtifactRow);
}

export async function listMVPArtifacts(mvpId: string): Promise<MVPArtifactRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mvp_artifacts")
    .select("*")
    .eq("mvp_id", mvpId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      `[mvp_artifacts] Failed to load artifacts for MVP ${mvpId}: ${error.message}`
    );
  }

  return (data ?? []).map(normalizeArtifactRow);
}

export async function deleteArtifactsForMVP(mvpId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("mvp_artifacts").delete().eq("mvp_id", mvpId);
  if (error) {
    throw new Error(
      `[mvp_artifacts] Failed to delete artifacts for MVP ${mvpId}: ${error.message}`
    );
  }
}

export async function updateArtifactStatus(
  artifactId: string,
  status: ArtifactValidationStatus,
  validationErrors: string[] = []
): Promise<MVPArtifactRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mvp_artifacts")
    .update({
      validation_status: status,
      validation_errors: validationErrors as unknown,
    })
    .eq("id", artifactId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `[mvp_artifacts] Failed to update artifact ${artifactId}: ${error.message}`
    );
  }

  return normalizeArtifactRow(data);
}

function serializeContent(content: unknown) {
  if (content === null || content === undefined) {
    return {};
  }

  if (typeof content === "string") {
    return { body: content };
  }

  if (Buffer.isBuffer(content)) {
    return { body: content.toString("utf8") };
  }

  if (content instanceof ArrayBuffer) {
    const buffer = Buffer.from(content);
    return { body: buffer.toString("utf8") };
  }

  if (Array.isArray(content)) {
    return content;
  }

  if (typeof content === "object") {
    return content;
  }

  return { body: String(content) };
}

function normalizeArtifactRow(row: Record<string, any>): MVPArtifactRecord {
  return {
    id: row.id,
    mvp_id: row.mvp_id,
    artifact_type: row.artifact_type,
    title: row.title ?? null,
    format: row.format ?? null,
    content: row.content ?? {},
    validation_status: (row.validation_status ?? "pending") as ArtifactValidationStatus,
    validation_errors: Array.isArray(row.validation_errors)
      ? (row.validation_errors as string[])
      : [],
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    created_at: row.created_at ?? new Date().toISOString(),
  };
}
