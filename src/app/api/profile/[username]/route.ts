import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ username: string }>;
};

/**
 * GET /api/profile/[username]
 * Fetch public profile by username with published workspaces
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { username } = await context.params;

    if (!username) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_USERNAME",
          message: "Username parameter is required.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username.toLowerCase())
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          success: false,
          error: "PROFILE_NOT_FOUND",
          message: "Profile not found.",
        },
        { status: 404 }
      );
    }

    // Fetch user's published workspaces
    const { data: workspaces, error: workspacesError } = await supabase
      .from("public_workspaces")
      .select(
        `
        *,
        workspaces!inner (
          user_id,
          pain_point_id,
          pain_points (
            text,
            category,
            niche
          )
        )
      `
      )
      .eq("workspaces.user_id", profile.user_id)
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (workspacesError) {
      console.error(
        "[profile.username.api] Failed to fetch workspaces",
        workspacesError
      );
    }

    // Track profile view event
    try {
      await supabase.from("user_events").insert([
        {
          event: "profile_viewed",
          context: {
            username,
            profileId: profile.id,
          },
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (eventError) {
      console.warn("[profile.username.api] Failed to log event", eventError);
    }

    return NextResponse.json({
      success: true,
      data: {
        profile,
        workspaces: workspaces ?? [],
        stats: {
          total_published: workspaces?.length ?? 0,
          total_views: workspaces?.reduce((sum, w) => sum + (w.views ?? 0), 0) ?? 0,
          total_remixes:
            workspaces?.reduce((sum, w) => sum + (w.remix_count ?? 0), 0) ?? 0,
        },
      },
    });
  } catch (error) {
    console.error("[profile.username.api] Request failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to fetch profile.",
      },
      { status: 500 }
    );
  }
}
