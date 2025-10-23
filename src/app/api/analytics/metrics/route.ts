import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface MetricsData {
  workspaces: {
    total: number;
    created_last_7_days: number;
    created_last_30_days: number;
  };
  sections: {
    total_generated: number;
    generated_last_7_days: number;
    by_type: Record<string, number>;
  };
  categories: {
    name: string;
    count: number;
  }[];
  recent_activity: {
    event: string;
    count: number;
    last_occurred: string;
  }[];
  user_activity: {
    total_events: number;
    unique_users: number;
    events_last_7_days: number;
  };
}

/**
 * GET /api/analytics/metrics?userId={id}
 * Returns aggregated analytics metrics for dashboard
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const supabase = getSupabaseAdminClient();
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Workspace metrics
    let workspacesQuery = supabase
      .from("workspaces")
      .select("id, created_at", { count: "exact" });

    if (userId) {
      workspacesQuery = workspacesQuery.eq("user_id", userId);
    }

    const { data: workspaces, count: totalWorkspaces } = await workspacesQuery;

    const workspacesLast7Days = workspaces?.filter(
      (w) => new Date(w.created_at) >= last7Days
    ).length ?? 0;

    const workspacesLast30Days = workspaces?.filter(
      (w) => new Date(w.created_at) >= last30Days
    ).length ?? 0;

    // 2. Section generation metrics
    const { data: sections } = await supabase
      .from("workspace_outputs")
      .select("section, created_at");

    const totalSections = sections?.length ?? 0;
    const sectionsLast7Days = sections?.filter(
      (s) => new Date(s.created_at) >= last7Days
    ).length ?? 0;

    const sectionsByType = sections?.reduce((acc, s) => {
      acc[s.section] = (acc[s.section] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) ?? {};

    // 3. Category breakdown
    const { data: painPoints } = await supabase
      .from("pain_points")
      .select("category");

    const categoryMap = new Map<string, number>();
    painPoints?.forEach((pp) => {
      if (pp.category) {
        categoryMap.set(pp.category, (categoryMap.get(pp.category) || 0) + 1);
      }
    });

    const categories = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 4. Recent activity from events
    let eventsQuery = supabase
      .from("user_events")
      .select("event, created_at, user_id", { count: "exact" })
      .order("created_at", { ascending: false });

    if (userId) {
      eventsQuery = eventsQuery.eq("user_id", userId);
    }

    const { data: events, count: totalEvents } = await eventsQuery;

    const eventsLast7Days = events?.filter(
      (e) => new Date(e.created_at) >= last7Days
    ).length ?? 0;

    const eventMap = new Map<string, { count: number; last: string }>();
    events?.forEach((e) => {
      const existing = eventMap.get(e.event);
      if (!existing || new Date(e.created_at) > new Date(existing.last)) {
        eventMap.set(e.event, {
          count: (existing?.count || 0) + 1,
          last: e.created_at,
        });
      }
    });

    const recentActivity = Array.from(eventMap.entries())
      .map(([event, data]) => ({
        event,
        count: data.count,
        last_occurred: data.last,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5. User activity metrics
    const uniqueUsers = new Set(events?.map((e) => e.user_id).filter(Boolean)).size;

    const metrics: MetricsData = {
      workspaces: {
        total: totalWorkspaces ?? 0,
        created_last_7_days: workspacesLast7Days,
        created_last_30_days: workspacesLast30Days,
      },
      sections: {
        total_generated: totalSections,
        generated_last_7_days: sectionsLast7Days,
        by_type: sectionsByType,
      },
      categories,
      recent_activity: recentActivity,
      user_activity: {
        total_events: totalEvents ?? 0,
        unique_users: uniqueUsers,
        events_last_7_days: eventsLast7Days,
      },
    };

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error("[analytics.metrics.api] Request failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to fetch analytics metrics.",
      },
      { status: 500 }
    );
  }
}
