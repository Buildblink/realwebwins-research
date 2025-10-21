"use client";

import { Card, CardContent } from "@/components/ui/card";

interface VaultAnalyticsProps {
  total: number;
  withPlan: number;
  withPlaybook: number;
  avgConfidence: number;
  conversionRate: number;
}

const ANALYTICS_CONFIG = [
  { key: "total", label: "Total Projects" },
  { key: "withPlan", label: "Action Plan Coverage" },
  { key: "withPlaybook", label: "Playbook Coverage" },
  { key: "avgConfidence", label: "Avg Confidence Score" },
  { key: "conversionRate", label: "Playbook Conversion %" },
] as const;

export default function VaultAnalytics(props: VaultAnalyticsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {ANALYTICS_CONFIG.map((metric) => {
        const value = props[metric.key];
        const formatted =
          typeof value === "number" && metric.key !== "total"
            ? `${value}${metric.key === "avgConfidence" ? "" : "%"}`
            : value;

        return (
          <Card key={metric.key} className="border border-primary/10 bg-white/80">
            <CardContent className="space-y-2 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {metric.label}
              </p>
              <p className="text-2xl font-semibold text-slate-900">{formatted}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
