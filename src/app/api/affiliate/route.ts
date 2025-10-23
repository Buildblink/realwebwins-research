import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface AffiliatePayload {
  workspaceId?: string;
  playbookSlug?: string;
  toolName: string;
  url: string;
  ref?: string;
}

/**
 * POST /api/affiliate
 * Track an affiliate click
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AffiliatePayload;
    const { workspaceId, playbookSlug, toolName, url, ref } = body;

    if (!toolName || !url) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_PARAMS",
          message: "toolName and url are required",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Track the click
    const { error } = await supabase
      .from("affiliate_clicks")
      .insert([{
        workspace_id: workspaceId || null,
        playbook_slug: playbookSlug || null,
        tool_name: toolName,
        url,
        ref: ref || null,
        created_at: new Date().toISOString(),
      }]);

    if (error) {
      console.error("[affiliate.api] Failed to track click:", error);
      // Continue anyway - don't block the user
    }

    // Track event
    try {
      await fetch(`${request.url.replace(/\/api\/affiliate.*/, "")}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "affiliate_clicked",
          context: {
            workspaceId,
            playbookSlug,
            toolName,
            url,
            ref,
          },
        }),
      });
    } catch (eventError) {
      console.warn("[affiliate.api] Failed to track event:", eventError);
    }

    return NextResponse.json({
      success: true,
      message: "Click tracked",
    });
  } catch (error) {
    console.error("[affiliate.api] POST failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to track click",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/affiliate?workspaceId={id}&tool={name}&url={url}&ref={code}
 * Track click and redirect to affiliate URL
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const playbookSlug = searchParams.get("playbook");
    const toolName = searchParams.get("tool");
    const url = searchParams.get("url");
    const ref = searchParams.get("ref");

    if (!toolName || !url) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_PARAMS",
          message: "tool and url parameters are required",
        },
        { status: 400 }
      );
    }

    // Track the click (fire and forget)
    const supabase = getSupabaseAdminClient();
    void (async () => {
      try {
        await supabase
          .from("affiliate_clicks")
          .insert([{
            workspace_id: workspaceId || null,
            playbook_slug: playbookSlug || null,
            tool_name: toolName,
            url,
            ref: ref || null,
            created_at: new Date().toISOString(),
          }]);
      } catch (error) {
        console.error("[affiliate.api] Failed to track click:", error);
      }
    })();

    // Redirect to the actual URL
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("[affiliate.api] GET failed:", error);

    // On error, try to redirect anyway
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (url) {
      return NextResponse.redirect(url);
    }

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to process redirect",
      },
      { status: 500 }
    );
  }
}
