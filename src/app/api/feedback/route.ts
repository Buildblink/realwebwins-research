import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface FeedbackPayload {
  name?: string | null;
  message?: string;
  rating?: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FeedbackPayload;
    const message = body.message?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    const ratingValue =
      typeof body.rating === "number" ? body.rating : Number(body.rating ?? NaN);
    const rating = Number.isFinite(ratingValue)
      ? Math.min(Math.max(Math.round(ratingValue), 1), 5)
      : null;

    if (!message) {
      return NextResponse.json(
        {
          error: "INVALID_INPUT",
          message: "Message is required to submit feedback.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("feedback")
      .insert({
        name: name || null,
        message,
        rating,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error
        ? caughtError.message
        : "Unable to submit feedback.";
    return NextResponse.json(
      { error: "FEEDBACK_FAILED", message },
      { status: 500 }
    );
  }
}

