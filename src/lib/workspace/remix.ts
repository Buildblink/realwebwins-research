import { getSupabaseAdminClient } from "../supabaseAdmin";

interface RemixResult {
  success: boolean;
  newWorkspaceId?: string;
  newPainPointId?: string;
  error?: string;
}

/**
 * Clone a published workspace to a user's account
 * @param sourceWorkspaceId - The workspace ID to clone
 * @param userId - The user who is remixing (can be null for anonymous)
 * @param referrerUserId - Optional: User who referred this remix
 * @returns Result with new workspace ID or error
 */
export async function cloneWorkspace(
  sourceWorkspaceId: string,
  userId: string | null = null,
  referrerUserId: string | null = null
): Promise<RemixResult> {
  const supabase = getSupabaseAdminClient();

  try {
    // 1. Get the source workspace and verify it's published
    const { data: sourceWorkspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id, pain_point_id, title, status, published_workspace_id")
      .eq("id", sourceWorkspaceId)
      .single();

    if (workspaceError || !sourceWorkspace) {
      return {
        success: false,
        error: "Source workspace not found",
      };
    }

    // Check if workspace is published
    if (!sourceWorkspace.published_workspace_id) {
      return {
        success: false,
        error: "Workspace is not published",
      };
    }

    // 2. Get the pain point
    const { data: sourcePainPoint, error: painPointError } = await supabase
      .from("pain_points")
      .select("*")
      .eq("id", sourceWorkspace.pain_point_id)
      .single();

    if (painPointError || !sourcePainPoint) {
      return {
        success: false,
        error: "Pain point not found",
      };
    }

    // 3. Create a new pain point (clone)
    const { data: newPainPoint, error: newPainPointError } = await supabase
      .from("pain_points")
      .insert([{
        text: sourcePainPoint.text,
        category: sourcePainPoint.category,
        niche: sourcePainPoint.niche,
        source: "remix",
        audience: sourcePainPoint.audience,
        frequency: 1,
        proof_link: sourcePainPoint.proof_link,
        related_playbook: sourcePainPoint.related_playbook,
      }])
      .select()
      .single();

    if (newPainPointError || !newPainPoint) {
      return {
        success: false,
        error: "Failed to create pain point clone",
      };
    }

    // 4. Create new workspace (linked to user)
    const { data: newWorkspace, error: newWorkspaceError } = await supabase
      .from("workspaces")
      .insert([{
        pain_point_id: newPainPoint.id,
        title: sourceWorkspace.title + " (Remixed)",
        status: "active",
        user_id: userId,
      }])
      .select()
      .single();

    if (newWorkspaceError || !newWorkspace) {
      return {
        success: false,
        error: "Failed to create new workspace",
      };
    }

    // 5. Get all outputs from source workspace
    const { data: sourceOutputs, error: outputsError } = await supabase
      .from("workspace_outputs")
      .select("*")
      .eq("workspace_id", sourceWorkspaceId);

    if (outputsError) {
      // Continue anyway - maybe no outputs yet
      console.warn("[remix] Failed to fetch source outputs:", outputsError);
    }

    // 6. Copy all outputs to new workspace (reset ratings)
    if (sourceOutputs && sourceOutputs.length > 0) {
      const newOutputs = sourceOutputs.map((output) => ({
        workspace_id: newWorkspace.id,
        section: output.section,
        content_md: output.content_md,
        content_json: output.content_json,
        model: output.model,
        tokens: output.tokens,
        cost_usd: output.cost_usd,
        rating: 0, // Reset ratings
      }));

      const { error: insertOutputsError } = await supabase
        .from("workspace_outputs")
        .insert(newOutputs);

      if (insertOutputsError) {
        console.warn("[remix] Failed to copy outputs:", insertOutputsError);
        // Continue anyway - workspace is created
      }
    }

    // 7. Record the remix
    const { error: remixError } = await supabase
      .from("workspace_remixes")
      .insert([{
        source_workspace_id: sourceWorkspaceId,
        new_workspace_id: newWorkspace.id,
        referrer_user_id: referrerUserId,
      }]);

    if (remixError) {
      console.warn("[remix] Failed to record remix:", remixError);
      // Continue anyway - remix happened successfully
    }

    // 8. Update remix count on public_workspace
    const { error: updateCountError } = await supabase.rpc(
      "increment_remix_count",
      { workspace_id: sourceWorkspace.published_workspace_id }
    );

    if (updateCountError) {
      // Fallback: manual increment
      const { data: currentData } = await supabase
        .from("public_workspaces")
        .select("remix_count")
        .eq("id", sourceWorkspace.published_workspace_id)
        .single();

      if (currentData) {
        await supabase
          .from("public_workspaces")
          .update({
            remix_count: (currentData.remix_count || 0) + 1,
          })
          .eq("id", sourceWorkspace.published_workspace_id);
      }
    }

    return {
      success: true,
      newWorkspaceId: newWorkspace.id,
      newPainPointId: newPainPoint.id,
    };
  } catch (error) {
    console.error("[remix] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get remix count for a workspace
 * @param workspaceId - The workspace ID
 * @returns Number of remixes
 */
export async function getRemixCount(workspaceId: string): Promise<number> {
  const supabase = getSupabaseAdminClient();

  const { count, error } = await supabase
    .from("workspace_remixes")
    .select("*", { count: "exact", head: true })
    .eq("source_workspace_id", workspaceId);

  if (error) {
    console.error("[remix] Failed to get remix count:", error);
    return 0;
  }

  return count || 0;
}
