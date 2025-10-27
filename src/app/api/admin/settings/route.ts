import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

function adminEnabled() {
  return process.env.ADMIN_MODE === "true";
}

function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: "ADMIN_DISABLED", message: "Admin mode is disabled." },
    { status: 403 }
  );
}

function parseValue(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export async function GET(request: Request) {
  if (!adminEnabled()) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const supabase = getSupabaseAdminClient();
  const query = supabase.from("system_settings").select("*").order("updated_at", { ascending: false });
  const { data, error } = key ? await query.eq("key", key).maybeSingle() : await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: "SETTINGS_FETCH_FAILED", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: data ?? (key ? null : []) });
}

async function upsertSetting(body: Record<string, unknown>) {
  const key = typeof body.key === "string" ? body.key.trim() : null;
  if (!key) {
    return NextResponse.json(
      { success: false, error: "INVALID_KEY", message: "Setting key is required." },
      { status: 400 }
    );
  }

  const value = parseValue(body.value);
  if (value === null) {
    return NextResponse.json(
      { success: false, error: "INVALID_VALUE", message: "Setting value is required." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("system_settings")
    .upsert(
      {
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: "SETTINGS_SAVE_FAILED", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  if (!adminEnabled()) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return upsertSetting(body);
}

export async function PATCH(request: Request) {
  if (!adminEnabled()) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return upsertSetting(body);
}

export async function DELETE(request: Request) {
  if (!adminEnabled()) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key) {
    return NextResponse.json(
      { success: false, error: "MISSING_KEY", message: "key query parameter required." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("system_settings").delete().eq("key", key);

  if (error) {
    return NextResponse.json(
      { success: false, error: "SETTINGS_DELETE_FAILED", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, deleted: key });
}
