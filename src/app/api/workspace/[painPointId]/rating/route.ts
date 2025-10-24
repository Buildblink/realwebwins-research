import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ painPointId: string }>;
};

interface RatingPayload {
  outputId: string;
  rating: -1 | 0 | 1; // -1 = thumbs down, 0 = neutral/clear, 1 = thumbs up
}

/**
 * POST /api/workspace/[painPointId]/rating
 * Save user rating for a workspace output
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const { painPointId } = params;
    const body = (await request.json()) as RatingPayload;
    const { outputId, rating } = body;

    // Validate rating
    if (![1, -1, 0].includes(rating)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_RATING",
          message: "Rating must be -1, 0, or 1",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Update the workspace_output with the rating
    const { data, error } = await supabase
      .from("workspace_outputs")
      .update({ rating, updated_at: new Date().toISOString() })
      .eq("id", outputId)
      .select()
      .single();

    if (error) {
      console.error("[rating.api] Failed to update rating", error);
      return NextResponse.json(
        {
          success: false,
          error: "RATING_UPDATE_FAILED",
          message: "Failed to save rating.",
        },
        { status: 500 }
      );
    }

    // Track the feedback event
    try {
      await supabase.from("user_events").insert([
        {
          event: "section_rated",
          context: {
            painPointId,
            outputId,
            rating,
            section: data.section,
          },
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (eventError) {
      console.warn("[rating.api] Failed to log event", eventError);
    }

    return NextResponse.json({
      success: true,
      data: {
        outputId: data.id,
        rating: data.rating,
      },
    });
  } catch (error) {
    console.error("[rating.api] Request failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to process rating.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workspace/[painPointId]/rating?outputId={id}
 * Get current rating for a workspace output
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { searchParams } = new URL(request.url);
    const outputId = searchParams.get("outputId");

    if (!outputId) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_OUTPUT_ID",
          message: "outputId parameter is required.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("workspace_outputs")
      .select("id, rating")
      .eq("id", outputId)
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "RATING_FETCH_FAILED",
          message: "Failed to fetch rating.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        outputId: data.id,
        rating: data.rating ?? 0,
      },
    });
  } catch (error) {
    console.error("[rating.api] GET request failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to fetch rating.",
      },
      { status: 500 }
    );
  }
}
