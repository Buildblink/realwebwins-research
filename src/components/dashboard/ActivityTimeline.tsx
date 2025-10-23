"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  event: string;
  count: number;
  last_occurred: string;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  workspace_opened: { label: "Workspace Opened", color: "bg-blue-100 text-blue-700" },
  workspace_created: { label: "Workspace Created", color: "bg-green-100 text-green-700" },
  section_generated: { label: "Section Generated", color: "bg-purple-100 text-purple-700" },
  export_clicked: { label: "Export Clicked", color: "bg-orange-100 text-orange-700" },
  copilot_asked: { label: "Copilot Asked", color: "bg-cyan-100 text-cyan-700" },
  pain_point_viewed: { label: "Pain Point Viewed", color: "bg-pink-100 text-pink-700" },
  feedback_submitted: { label: "Feedback", color: "bg-emerald-100 text-emerald-700" },
};

function getEventLabel(event: string): { label: string; color: string } {
  return (
    EVENT_LABELS[event] || {
      label: event
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      color: "bg-slate-100 text-slate-700",
    }
  );
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No activity recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity, idx) => {
            const { label, color } = getEventLabel(activity.event);
            const timeAgo = formatDistanceToNow(new Date(activity.last_occurred), {
              addSuffix: true,
            });

            return (
              <div
                key={`${activity.event}-${idx}`}
                className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <div>
                    <Badge variant="neutral" className={`${color} border-0 text-xs`}>
                      {label}
                    </Badge>
                    <p className="mt-1 text-xs text-slate-500">
                      {timeAgo}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700">
                    {activity.count}
                  </p>
                  <p className="text-xs text-slate-500">
                    {activity.count === 1 ? "time" : "times"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
