import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface SnapshotRow {
  id: string;
  mvp_id: string;
  files: Record<string, unknown>;
  created_at: string | null;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { success: false, error: "INVALID_ID", message: "Missing MVP id." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mvp_project_snapshots")
    .select("id,mvp_id,files,created_at")
    .eq("mvp_id", id)
    .maybeSingle<SnapshotRow>();

  if (error) {
    console.error("[api.mvp.project]", error);
    return NextResponse.json(
      { success: false, error: "SNAPSHOT_LOOKUP_FAILED", message: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { success: false, error: "NO_SNAPSHOT", message: "No snapshot stored for this MVP." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    files: data.files ?? {},
    created_at: data.created_at,
  });
}
