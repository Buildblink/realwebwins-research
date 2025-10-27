import { AnalyticsClient } from "@/app/admin/analytics/AnalyticsClient";

export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage() {
  const adminEnabled = process.env.ADMIN_MODE === "true";
  return <AnalyticsClient adminEnabled={adminEnabled} />;
}
