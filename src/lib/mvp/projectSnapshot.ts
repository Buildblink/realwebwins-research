import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export interface SnapshotFileEntry {
  content: string;
  mime: string;
  tier?: string;
  size?: number;
}

export interface ProjectSnapshot {
  id: string;
  mvp_id: string;
  files: Record<string, SnapshotFileEntry>;
  created_at: string;
}

export async function getProjectSnapshot(mvpId: string): Promise<ProjectSnapshot | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mvp_project_snapshots")
    .select("*")
    .eq("mvp_id", mvpId)
    .maybeSingle();

  if (error) {
    throw new Error(`[mvp_project_snapshots] Failed to fetch snapshot: ${error.message}`);
  }

  return data
    ? {
        id: data.id,
        mvp_id: data.mvp_id,
        files: (data.files ?? {}) as Record<string, SnapshotFileEntry>,
        created_at: data.created_at ?? new Date().toISOString(),
      }
    : null;
}

export async function upsertProjectSnapshot(
  mvpId: string,
  files: Record<string, SnapshotFileEntry>
): Promise<ProjectSnapshot> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mvp_project_snapshots")
    .upsert(
      {
        mvp_id: mvpId,
        files,
      },
      { onConflict: "mvp_id" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`[mvp_project_snapshots] Failed to upsert snapshot: ${error.message}`);
  }

  return {
    id: data.id,
    mvp_id: data.mvp_id,
    files: (data.files ?? {}) as Record<string, SnapshotFileEntry>,
    created_at: data.created_at ?? new Date().toISOString(),
  };
}
