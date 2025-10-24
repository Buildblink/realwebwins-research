import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createHash } from "crypto";

interface ReferralPayload {
  ref: string; // Referrer user ID or code
  target: string; // Target path being visited
}

/**
 * POST /api/referral
 * Track a referral click and increment user credits
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ReferralPayload;
    const { ref, target } = body;

    if (!ref || !target) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_PARAMS",
          message: "ref and target are required",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Get IP and User Agent for tracking (anonymized)
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "unknown";
    const ipHash = createHash("sha256").update(ip).digest("hex");
    const userAgent = request.headers.get("user-agent") || "unknown";

    // 1. Log the referral click
    const { error: clickError } = await supabase
      .from("referral_clicks")
      .insert([{
        referrer_user_id: ref,
        target_path: target,
        ip_hash: ipHash,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
      }]);

    if (clickError) {
      console.error("[referral.api] Failed to log click:", clickError);
      // Continue anyway - credit increment is more important
    }

    // 2. Increment user credits (upsert)
    const { error: creditError } = await supabase.rpc(
      "increment_user_credits",
      { user_id_param: ref, amount: 1 }
    );

    if (creditError) {
      // Fallback: manual upsert
      const { data: existingCredit } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", ref)
        .maybeSingle();

      if (existingCredit) {
        // Update existing
        await supabase
          .from("user_credits")
          .update({
            balance: existingCredit.balance + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", ref);
      } else {
        // Insert new
        await supabase
          .from("user_credits")
          .insert([{
            user_id: ref,
            balance: 1,
            updated_at: new Date().toISOString(),
          }]);
      }
    }

    // 3. Track the event
    try {
      await fetch(`${request.url.replace(/\/api\/referral.*/, "")}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "referral_clicked",
          user_id: ref,
          context: {
            referrerUserId: ref,
            targetPath: target,
          },
        }),
      });
    } catch (eventError) {
      console.warn("[referral.api] Failed to track event:", eventError);
    }

    return NextResponse.json({
      success: true,
      message: "Referral tracked",
    });
  } catch (error) {
    console.error("[referral.api] Request failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to track referral",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/referral?userId={id}
 * Get user's credit balance
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_USER_ID",
          message: "userId parameter is required",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("user_credits")
      .select("balance, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[referral.api] Failed to fetch credits:", error);
      return NextResponse.json(
        {
          success: false,
          error: "FETCH_FAILED",
          message: "Failed to fetch credits",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        userId,
        balance: data?.balance ?? 0,
        updatedAt: data?.updated_at,
      },
    });
  } catch (error) {
    console.error("[referral.api] GET request failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to fetch credits",
      },
      { status: 500 }
    );
  }
}
