import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type MetricKey = "remix" | "referral" | "affiliate" | "credits";

interface SeriesPoint {
  date: string;   // ISO period_start
  value: number;
}
interface DashboardData {
  series: Record<MetricKey, SeriesPoint[]>;
  totals: Record<MetricKey, number>;
  recentLogs: Array<{
    stage: string;
    success: boolean;
    last_run: string | null;
  }>;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const weeks = Math.min(Math.max(parseInt(url.searchParams.get("weeks") ?? "8", 10), 1), 26);

  const sb = getSupabaseAdminClient();

  try {
    // 1) Pull last N weeks of analytics_metrics
    const { data: rows, error } = await sb
      .from("analytics_metrics")
      .select("metric_type, period_start, value")
      .order("period_start", { ascending: true });

    if (error) throw error;

    // keep only last N weeks per metric
    const byMetric: Record<MetricKey, SeriesPoint[]> = {
      remix: [], referral: [], affiliate: [], credits: []
    };

    const byTypeMap = new Map<MetricKey, { date: string, value: number }[]>();
    for (const r of rows ?? []) {
      const mt = r.metric_type as MetricKey;
      if (!byTypeMap.has(mt)) byTypeMap.set(mt, []);
      byTypeMap.get(mt)!.push({ date: r.period_start, value: r.value ?? 0 });
    }
    (["remix","referral","affiliate","credits"] as MetricKey[]).forEach((k) => {
      const arr = (byTypeMap.get(k) ?? []).slice(-weeks);
      byMetric[k] = arr;
    });

    // 2) Totals = latest available point per metric
    const totals: Record<MetricKey, number> = {
      remix: 0, referral: 0, affiliate: 0, credits: 0
    };
    (["remix","referral","affiliate","credits"] as MetricKey[]).forEach((k) => {
      const arr = byMetric[k];
      totals[k] = arr.length ? arr[arr.length - 1].value : 0;
    });

    // 3) Recent AgentStatus logs (last 10 viral-growth runs)
    const { data: logs, error: logsErr } = await sb
      .from("AgentStatus")
      .select("stage, success, last_run")
      .eq("idea", "viral-growth")
      .order("last_run", { ascending: false })
      .limit(10);
    if (logsErr) throw logsErr;

    const payload: DashboardData = {
      series: byMetric,
      totals,
      recentLogs: (logs ?? []).map((l: any) => ({
        stage: l.stage,
        success: l.success,
        last_run: l.last_run ?? null
      }))
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (e: any) {
    console.error("[analytics.dashboard] error:", e?.message ?? e);
    return NextResponse.json(
      { success: false, error: "DASHBOARD_FETCH_FAILED", message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
