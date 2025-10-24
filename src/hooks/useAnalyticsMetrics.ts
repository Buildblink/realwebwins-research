"use client";

import { useEffect, useState } from "react";

type MetricKey = "remix" | "referral" | "affiliate" | "credits";
interface SeriesPoint { date: string; value: number; }
interface DashboardData {
  series: Record<MetricKey, SeriesPoint[]>;
  totals: Record<MetricKey, number>;
  recentLogs: Array<{ stage: string; success: boolean; last_run: string | null }>;
}

export function useAnalyticsMetrics(weeks = 8) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/analytics/dashboard?weeks=${weeks}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.message ?? "Failed");
        if (alive) setData(json.data);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [weeks]);

  return { data, isLoading, error };
}
