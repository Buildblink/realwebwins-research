import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export interface MVPExportInput {
  mvpId: string;
  exportType: string;
  tier?: string;
  downloadUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export interface MVPExportRecord {
  id: string;
  mvp_id: string;
  export_type: string;
  tier: string | null;
  download_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function logMVPExport(input: MVPExportInput): Promise<MVPExportRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mvp_exports")
    .insert([
      {
        mvp_id: input.mvpId,
        export_type: input.exportType,
        tier: input.tier ?? "free",
        download_url: input.downloadUrl ?? null,
        metadata: input.metadata ?? {},
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`[mvp_exports] Failed to log export: ${error.message}`);
  }

  return normalizeExport(data);
}

export async function listMVPExports(mvpId: string): Promise<MVPExportRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mvp_exports")
    .select("*")
    .eq("mvp_id", mvpId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `[mvp_exports] Failed to load exports for MVP ${mvpId}: ${error.message}`
    );
  }

  return (data ?? []).map(normalizeExport);
}

function normalizeExport(row: Record<string, any>): MVPExportRecord {
  return {
    id: row.id,
    mvp_id: row.mvp_id,
    export_type: row.export_type,
    tier: row.tier ?? null,
    download_url: row.download_url ?? null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    created_at: row.created_at ?? new Date().toISOString(),
  };
}
