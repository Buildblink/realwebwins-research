import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import slugify from "slugify";

type RouteContext = {
  params: Promise<{ painPointId: string }>;
};

interface PublishPayload {
  title: string;
  description?: string;
  category?: string;
}

/**
 * POST /api/workspace/[painPointId]/publish
 * Publish or update a workspace
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const { painPointId } = params;
    const body = (await request.json()) as PublishPayload;
    const { title, description, category } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_TITLE",
          message: "Title is required.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Get workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id, user_id, published_workspace_id")
      .eq("pain_point_id", painPointId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        {
          success: false,
          error: "WORKSPACE_NOT_FOUND",
          message: "Workspace not found.",
        },
        { status: 404 }
      );
    }

    // Generate unique slug
    const baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    // Check if slug is unique (excluding current workspace's public version)
    while (true) {
      const { data: existing } = await supabase
        .from("public_workspaces")
        .select("id")
        .eq("slug", slug)
        .neq("id", workspace.published_workspace_id || "")
        .maybeSingle();

      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const payload = {
      workspace_id: workspace.id,
      published: true,
      title: title.trim(),
      slug,
      description: description?.trim() || null,
      category: category || null,
      updated_at: new Date().toISOString(),
    };

    let result;

    if (workspace.published_workspace_id) {
      // Update existing public workspace
      result = await supabase
        .from("public_workspaces")
        .update(payload)
        .eq("id", workspace.published_workspace_id)
        .select()
        .single();
    } else {
      // Create new public workspace
      result = await supabase
        .from("public_workspaces")
        .insert([payload])
        .select()
        .single();

      if (!result.error && result.data) {
        // Link workspace to public_workspace
        await supabase
          .from("workspaces")
          .update({ published_workspace_id: result.data.id })
          .eq("id", workspace.id);
      }
    }

    if (result.error) {
      console.error("[publish.api] Failed to publish workspace", result.error);
      return NextResponse.json(
        {
          success: false,
          error: "PUBLISH_FAILED",
          message: "Failed to publish workspace.",
        },
        { status: 500 }
      );
    }

    // Track publication event
    try {
      await supabase.from("user_events").insert([
        {
          user_id: workspace.user_id,
          event: "workspace_published",
          context: {
            painPointId,
            workspaceId: workspace.id,
            slug,
          },
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (eventError) {
      console.warn("[publish.api] Failed to log event", eventError);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result.data,
        public_url: `/u/${workspace.user_id}`,
      },
    });
  } catch (error) {
    console.error("[publish.api] Request failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to publish workspace.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspace/[painPointId]/publish
 * Unpublish a workspace
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const { painPointId } = params;

    const supabase = getSupabaseAdminClient();

    // Get workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id, user_id, published_workspace_id")
      .eq("pain_point_id", painPointId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        {
          success: false,
          error: "WORKSPACE_NOT_FOUND",
          message: "Workspace not found.",
        },
        { status: 404 }
      );
    }

    if (!workspace.published_workspace_id) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_PUBLISHED",
          message: "Workspace is not published.",
        },
        { status: 400 }
      );
    }

    // Mark as unpublished (don't delete to preserve stats)
    const { error: updateError } = await supabase
      .from("public_workspaces")
      .update({ published: false })
      .eq("id", workspace.published_workspace_id);

    if (updateError) {
      console.error("[publish.api] Failed to unpublish workspace", updateError);
      return NextResponse.json(
        {
          success: false,
          error: "UNPUBLISH_FAILED",
          message: "Failed to unpublish workspace.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Workspace unpublished successfully.",
    });
  } catch (error) {
    console.error("[publish.api] DELETE request failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to unpublish workspace.",
      },
      { status: 500 }
    );
  }
}
