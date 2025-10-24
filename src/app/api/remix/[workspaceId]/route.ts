import { NextResponse } from "next/server";
import { cloneWorkspace } from "@/lib/workspace/remix";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

interface RemixPayload {
  userId?: string;
  ref?: string; // Referrer user ID
}

/**
 * POST /api/remix/[workspaceId]
 * Clone a published workspace to user's account
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const { workspaceId } = params;

    if (!workspaceId) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_WORKSPACE_ID",
          message: "Workspace ID is required",
        },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as RemixPayload;
    const { userId = null, ref = null } = body;

    // Call the remix service
    const result = await cloneWorkspace(
      workspaceId,
      userId,
      ref
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "REMIX_FAILED",
          message: result.error || "Failed to remix workspace",
        },
        { status: 400 }
      );
    }

    // Track the remix event
    try {
      await fetch(`${request.url.replace(/\/api\/remix\/.*/, "")}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "workspace_remixed",
          context: {
            sourceWorkspaceId: workspaceId,
            newWorkspaceId: result.newWorkspaceId,
            userId,
            referrerUserId: ref,
          },
        }),
      });
    } catch (eventError) {
      console.warn("[remix.api] Failed to track event:", eventError);
    }

    return NextResponse.json({
      success: true,
      data: {
        newWorkspaceId: result.newWorkspaceId,
        newPainPointId: result.newPainPointId,
        message: "Workspace remixed successfully",
      },
    });
  } catch (error) {
    console.error("[remix.api] Request failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to remix workspace",
      },
      { status: 500 }
    );
  }
}
