"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Layers, Activity, Users } from "lucide-react";

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
  user_activity: {
    total_events: number;
    unique_users: number;
    events_last_7_days: number;
  };
}

interface MetricsOverviewProps {
  metrics: MetricsData;
}

export function MetricsOverview({ metrics }: MetricsOverviewProps) {
  const workspaceGrowth = metrics.workspaces.created_last_7_days > 0
    ? `+${metrics.workspaces.created_last_7_days} this week`
    : "No new workspaces";

  const sectionGrowth = metrics.sections.generated_last_7_days > 0
    ? `+${metrics.sections.generated_last_7_days} this week`
    : "No new sections";

  const activityGrowth = metrics.user_activity.events_last_7_days > 0
    ? `${metrics.user_activity.events_last_7_days} events this week`
    : "No activity";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Workspaces */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Workspaces
          </CardTitle>
          <Layers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.workspaces.total}</div>
          <p className="text-xs text-muted-foreground">
            {workspaceGrowth}
          </p>
        </CardContent>
      </Card>

      {/* Sections Generated */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Sections Generated
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.sections.total_generated}</div>
          <p className="text-xs text-muted-foreground">
            {sectionGrowth}
          </p>
        </CardContent>
      </Card>

      {/* Total Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Activity
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.user_activity.total_events}</div>
          <p className="text-xs text-muted-foreground">
            {activityGrowth}
          </p>
        </CardContent>
      </Card>

      {/* Unique Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Active Users
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.user_activity.unique_users}</div>
          <p className="text-xs text-muted-foreground">
            Unique tracked users
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
