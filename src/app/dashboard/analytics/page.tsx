"use client";

import { useState } from "react";
import { useAnalyticsMetrics } from "@/hooks/useAnalyticsMetrics";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

export default function AnalyticsPage() {
  const [weeks, setWeeks] = useState(8);
  const { data, isLoading, error } = useAnalyticsMetrics(weeks);

  return (
    <div className="min-h-screen bg-[#060608] pb-12 pt-14 text-zinc-50">
      <div className="mx-auto w-full max-w-7xl px-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#4f46e5]">Admin</p>
            <h1 className="mt-2 text-2xl font-semibold">Analytics Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400">Weeks</label>
            <select
              className="rounded-md bg-[#111113] border border-white/10 px-2 py-1 text-sm"
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
            >
              {[4,8,12,16].map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {isLoading || !data ? (
          <div className="text-sm text-zinc-400">Loading analytics…</div>
        ) : (
          <AnalyticsDashboard series={data.series} totals={data.totals} weeks={weeks} />
        )}
      </div>
    </div>
  );
}
