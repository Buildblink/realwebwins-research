import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface WorkspaceRecommendation {
  id: string;
  pain_point_id: string;
  title: string;
  pain_point_text: string;
  category: string | null;
  niche: string | null;
  audience: string | null;
  relevance_score: number;
}

/**
 * GET /api/recommendations?workspaceId={id}&userId={id}
 * Returns similar workspaces based on pain point similarity
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") ?? "5", 10);

    if (!workspaceId) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_WORKSPACE_ID",
          message: "workspaceId parameter is required.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // 1. Get the current workspace's pain point details
    const { data: currentWorkspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select(`
        id,
        pain_point_id,
        title,
        user_id,
        pain_points (
          id,
          text,
          category,
          niche,
          audience
        )
      `)
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !currentWorkspace) {
      return NextResponse.json(
        {
          success: false,
          error: "WORKSPACE_NOT_FOUND",
          message: "Workspace not found.",
        },
        { status: 404 }
      );
    }

    // Extract pain point data (handle both array and object response)
    const painPointData = Array.isArray(currentWorkspace.pain_points)
      ? currentWorkspace.pain_points[0]
      : currentWorkspace.pain_points;

    const painPoint = painPointData as {
      id: string;
      text: string;
      category: string | null;
      niche: string | null;
      audience: string | null;
    };

    // 2. Find similar workspaces based on multiple criteria
    const recommendations: WorkspaceRecommendation[] = [];

    // Strategy 1: Same category and niche
    if (painPoint.category && painPoint.niche) {
      const { data: categoryMatches } = await supabase
        .from("workspaces")
        .select(`
          id,
          pain_point_id,
          title,
          pain_points!inner (
            id,
            text,
            category,
            niche,
            audience
          )
        `)
        .eq("pain_points.category", painPoint.category)
        .eq("pain_points.niche", painPoint.niche)
        .neq("id", workspaceId)
        .limit(limit);

      if (categoryMatches) {
        categoryMatches.forEach((ws) => {
          const pp = Array.isArray(ws.pain_points) ? ws.pain_points[0] : ws.pain_points;
          recommendations.push({
            id: ws.id,
            pain_point_id: ws.pain_point_id,
            title: ws.title,
            pain_point_text: pp.text,
            category: pp.category,
            niche: pp.niche,
            audience: pp.audience,
            relevance_score: 1.0, // Exact category + niche match
          });
        });
      }
    }

    // Strategy 2: Same category, different niche (lower relevance)
    if (painPoint.category && recommendations.length < limit) {
      const { data: categoryOnly } = await supabase
        .from("workspaces")
        .select(`
          id,
          pain_point_id,
          title,
          pain_points!inner (
            id,
            text,
            category,
            niche,
            audience
          )
        `)
        .eq("pain_points.category", painPoint.category)
        .neq("id", workspaceId)
        .limit(limit - recommendations.length);

      if (categoryOnly) {
        categoryOnly.forEach((ws) => {
          const pp = Array.isArray(ws.pain_points) ? ws.pain_points[0] : ws.pain_points;
          // Skip if already in recommendations
          if (recommendations.some(r => r.id === ws.id)) return;

          recommendations.push({
            id: ws.id,
            pain_point_id: ws.pain_point_id,
            title: ws.title,
            pain_point_text: pp.text,
            category: pp.category,
            niche: pp.niche,
            audience: pp.audience,
            relevance_score: 0.7,
          });
        });
      }
    }

    // Strategy 3: User's recent workspaces (personalization)
    if (userId && recommendations.length < limit) {
      const { data: userWorkspaces } = await supabase
        .from("workspaces")
        .select(`
          id,
          pain_point_id,
          title,
          pain_points (
            id,
            text,
            category,
            niche,
            audience
          )
        `)
        .eq("user_id", userId)
        .neq("id", workspaceId)
        .order("updated_at", { ascending: false })
        .limit(limit - recommendations.length);

      if (userWorkspaces) {
        userWorkspaces.forEach((ws) => {
          const pp = Array.isArray(ws.pain_points) ? ws.pain_points[0] : ws.pain_points;
          // Skip if already in recommendations
          if (recommendations.some(r => r.id === ws.id)) return;

          recommendations.push({
            id: ws.id,
            pain_point_id: ws.pain_point_id,
            title: ws.title,
            pain_point_text: pp.text,
            category: pp.category,
            niche: pp.niche,
            audience: pp.audience,
            relevance_score: 0.5,
          });
        });
      }
    }

    // Strategy 4: Popular workspaces with outputs (fallback)
    if (recommendations.length < limit) {
      const { data: popular } = await supabase
        .from("workspaces")
        .select(`
          id,
          pain_point_id,
          title,
          pain_points (
            id,
            text,
            category,
            niche,
            audience
          )
        `)
        .neq("id", workspaceId)
        .order("updated_at", { ascending: false })
        .limit(limit - recommendations.length);

      if (popular) {
        popular.forEach((ws) => {
          const pp = Array.isArray(ws.pain_points) ? ws.pain_points[0] : ws.pain_points;
          // Skip if already in recommendations
          if (recommendations.some(r => r.id === ws.id)) return;

          recommendations.push({
            id: ws.id,
            pain_point_id: ws.pain_point_id,
            title: ws.title,
            pain_point_text: pp.text,
            category: pp.category,
            niche: pp.niche,
            audience: pp.audience,
            relevance_score: 0.3,
          });
        });
      }
    }

    // Sort by relevance score and limit
    const sortedRecommendations = recommendations
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        workspace_id: workspaceId,
        recommendations: sortedRecommendations,
        count: sortedRecommendations.length,
      },
    });
  } catch (error) {
    console.error("[recommendations.api] Request failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to fetch recommendations.",
      },
      { status: 500 }
    );
  }
}
