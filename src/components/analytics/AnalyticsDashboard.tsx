"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import { motion } from "framer-motion";

type MetricKey = "remix" | "referral" | "affiliate" | "credits";
interface SeriesPoint { date: string; value: number; }
interface Props {
  series: Record<MetricKey, SeriesPoint[]>;
  totals: Record<MetricKey, number>;
  weeks: number;
}

export default function AnalyticsDashboard({ series, totals, weeks }: Props) {
  const kpis: Array<{ key: MetricKey; label: string }> = [
    { key: "remix", label: "Remixes (latest week)" },
    { key: "referral", label: "Referrals (latest week)" },
    { key: "affiliate", label: "Affiliate clicks (latest week)" },
    { key: "credits", label: "Total credits distributed" },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ key, label }) => (
          <motion.div key={key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-[#111113] border-white/10">
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-wider text-zinc-400">{label}</div>
                <div className="mt-2 text-3xl font-semibold text-zinc-50">{totals[key] ?? 0}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MetricChart title="Remixes per week" data={series.remix} variant="line" />
        <MetricChart title="Referral clicks per week" data={series.referral} variant="bar" />
        <MetricChart title="Affiliate clicks per week" data={series.affiliate} variant="bar" />
        <MetricChart title="Total credits (snapshot over time)" data={series.credits} variant="line" />
      </div>

      {/* Footnote */}
      <p className="text-xs text-zinc-500">
        Showing last {weeks} week(s). Credits line shows snapshots of total distributed credits; other charts show weekly counts.
      </p>
    </div>
  );
}

function MetricChart({ title, data, variant }: { title: string; data: SeriesPoint[]; variant: "line" | "bar" }) {
  // Format x-label as YYYY-MM-DD (period_start)
  const formatted = (data ?? []).map(d => ({ ...d, x: d.date.slice(0, 10) }));
  return (
    <Card className="bg-[#111113] border-white/10">
      <CardContent className="p-5">
        <div className="mb-3 text-sm font-medium text-zinc-200">{title}</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {variant === "line" ? (
              <LineChart data={formatted}>
                <XAxis dataKey="x" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" dot={false} />
              </LineChart>
            ) : (
              <BarChart data={formatted}>
                <XAxis dataKey="x" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
