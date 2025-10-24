import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

/**
 * GET /api/showcase?category={category}&sort={sort}&page={page}&pageSize={pageSize}
 * Fetch published workspaces with filters
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") ?? "recent"; // recent, popular, remixed
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

    const supabase = getSupabaseAdminClient();

    let query = supabase
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
            niche,
            audience
          )
        )
      `,
        { count: "exact" }
      )
      .eq("published", true);

    // Filter by category
    if (category && category !== "all") {
      query = query.eq("workspaces.pain_points.category", category);
    }

    // Sort
    switch (sort) {
      case "popular":
        query = query.order("views", { ascending: false });
        break;
      case "remixed":
        query = query.order("remix_count", { ascending: false });
        break;
      case "recent":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("[showcase.api] Failed to fetch workspaces", error);
      return NextResponse.json(
        {
          success: false,
          error: "FETCH_FAILED",
          message: "Failed to fetch published workspaces.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("[showcase.api] Request failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to fetch showcase.",
      },
      { status: 500 }
    );
  }
}
