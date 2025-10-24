"use client";

import { useEffect, useState } from "react";
import { MetricsOverview } from "./MetricsOverview";
import { ActivityTimeline } from "./ActivityTimeline";
import { CategoryChart } from "./CategoryChart";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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

interface DashboardAnalyticsProps {
  userId?: string;
}

export function DashboardAnalytics({ userId }: DashboardAnalyticsProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const params = new URLSearchParams();
        if (userId) {
          params.append("userId", userId);
        }

        const response = await fetch(`/api/analytics/metrics?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch metrics (${response.status})`);
        }

        const result = await response.json();

        if (!result.success || !result.data) {
          throw new Error(result.message ?? "Failed to load metrics");
        }

        setMetrics(result.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("[DashboardAnalytics] Failed to fetch metrics", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, [userId]);

  if (isLoading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-slate-600">
              Loading analytics...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-rose-200 bg-rose-50">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          <div>
            <h3 className="font-semibold text-rose-900">
              Failed to load analytics
            </h3>
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics Overview</h2>
        <p className="mt-1 text-sm text-slate-600">
          Track your workspace activity and insights
        </p>
      </div>

      {/* Metrics Cards */}
      <MetricsOverview metrics={metrics} />

      {/* Activity & Categories Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <ActivityTimeline activities={metrics.recent_activity} />
        <CategoryChart categories={metrics.categories} />
      </div>

      {/* Section Breakdown */}
      {Object.keys(metrics.sections.by_type).length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Section Generation Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Object.entries(metrics.sections.by_type).map(([section, count]) => (
                <div
                  key={section}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center"
                >
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-600">
                    {section}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
