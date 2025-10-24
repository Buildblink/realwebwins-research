import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface ProfilePayload {
  username: string;
  bio?: string;
  avatar_url?: string;
  links?: Array<{ label: string; url: string }>;
}

/**
 * GET /api/profile?userId={id}
 * Fetch user's profile
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_USER_ID",
          message: "userId parameter is required.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[profile.api] Failed to fetch profile", error);
      return NextResponse.json(
        {
          success: false,
          error: "PROFILE_FETCH_FAILED",
          message: "Failed to fetch profile.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data ?? null,
    });
  } catch (error) {
    console.error("[profile.api] GET request failed", error);
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

/**
 * POST /api/profile
 * Create or update user profile
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ProfilePayload & { userId: string };
    const { userId, username, bio, avatar_url, links } = body;

    if (!userId || !username) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_REQUIRED_FIELDS",
          message: "userId and username are required.",
        },
        { status: 400 }
      );
    }

    // Validate username format (alphanumeric, dashes, underscores, 3-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_USERNAME",
          message:
            "Username must be 3-30 characters and contain only letters, numbers, dashes, and underscores.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Check if profile already exists
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("user_id", userId)
      .maybeSingle();

    const payload = {
      user_id: userId,
      username: username.toLowerCase(),
      bio: bio ?? null,
      avatar_url: avatar_url ?? null,
      links: links ?? [],
      updated_at: new Date().toISOString(),
    };

    let result;

    if (existing) {
      // Check if username is taken by another user
      if (existing.username !== username.toLowerCase()) {
        const { data: usernameTaken } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username.toLowerCase())
          .neq("user_id", userId)
          .maybeSingle();

        if (usernameTaken) {
          return NextResponse.json(
            {
              success: false,
              error: "USERNAME_TAKEN",
              message: "This username is already taken.",
            },
            { status: 409 }
          );
        }
      }

      // Update existing profile
      result = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      // Check if username is taken
      const { data: usernameTaken } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .maybeSingle();

      if (usernameTaken) {
        return NextResponse.json(
          {
            success: false,
            error: "USERNAME_TAKEN",
            message: "This username is already taken.",
          },
          { status: 409 }
        );
      }

      // Create new profile
      result = await supabase.from("profiles").insert([payload]).select().single();
    }

    if (result.error) {
      console.error("[profile.api] Failed to save profile", result.error);
      return NextResponse.json(
        {
          success: false,
          error: "PROFILE_SAVE_FAILED",
          message: "Failed to save profile.",
        },
        { status: 500 }
      );
    }

    // Track profile creation/update event
    try {
      await supabase.from("user_events").insert([
        {
          user_id: userId,
          event: existing ? "profile_updated" : "profile_created",
          context: { username },
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (eventError) {
      console.warn("[profile.api] Failed to log event", eventError);
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("[profile.api] POST request failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to save profile.",
      },
      { status: 500 }
    );
  }
}
