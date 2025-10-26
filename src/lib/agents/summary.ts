import { Resend } from "resend";
import { format, startOfISOWeek } from "date-fns";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  calculateAgentLeaderboard,
  LeaderboardEntry,
  LeaderboardInsight,
  fetchLeaderboard,
} from "@/lib/agents/leaderboard";

interface WeeklySummaryRecord {
  id?: string;
  week_start: string;
  report: Record<string, unknown>;
  markdown: string;
  created_at?: string;
}

function getWeekStart(date = new Date()): string {
  const start = startOfISOWeek(date);
  return format(start, "yyyy-MM-dd");
}

export async function buildWeeklySummary(precomputed?: {
  entries: LeaderboardEntry[];
  insights: LeaderboardInsight[];
}) {
  const weekStart = getWeekStart();
  const { entries, insights } =
    precomputed ?? (await calculateAgentLeaderboard());

  const topAgents = entries.slice(0, 5).map((entry, index) => ({
    rank: index + 1,
    agent_id: entry.agentId,
    rank_score: entry.rankScore,
    impact_avg: entry.impactAvg,
    consistency_rank: entry.consistencyRank,
    collaboration_rank: entry.collaborationRank,
  }));

  const markdownLines = [
    `# Weekly Agent Summary (${weekStart})`,
    "",
    "## Top Agents",
    ...topAgents.map(
      (agent) =>
        `- #${agent.rank} **${agent.agent_id}** — score ${agent.rank_score.toFixed(
          2
        )}, impact ${agent.impact_avg.toFixed(2)}`
    ),
    "",
    "## Highlights",
    ...(insights.length > 0
      ? insights.map((insight) => `- ${insight.summary}`)
      : ["- No new insights recorded this cycle."]),
  ];

  const markdown = markdownLines.join("\n");

  return {
    weekStart,
    report: {
      generated_at: new Date().toISOString(),
      top_agents: topAgents,
      insights,
    },
    markdown,
  };
}

export async function storeWeeklySummary({
  weekStart,
  report,
  markdown,
}: {
  weekStart: string;
  report: Record<string, unknown>;
  markdown: string;
}) {
  const supabase = getSupabaseAdminClient();
  const { error, data } = await supabase
    .from("weekly_summaries")
    .upsert(
      [
        {
          week_start: weekStart,
          report,
          markdown,
        },
      ],
      { onConflict: "week_start" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`[weekly-summary] Failed to store summary: ${error.message}`);
  }

  return data as WeeklySummaryRecord;
}

export async function listWeeklySummaries(limit = 12) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("weekly_summaries")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`[weekly-summary] Failed to list summaries: ${error.message}`);
  }

  return (data ?? []) as WeeklySummaryRecord[];
}

export async function fetchPublicLeaderboardSnapshot(limit = 10) {
  const { rows, insights } = await fetchLeaderboard(limit);
  return { rows, insights };
}

export async function sendWeeklySummaryEmail({
  markdown,
  subject,
}: {
  markdown: string;
  subject: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = process.env.WEEKLY_SUMMARY_RECIPIENTS;
  const fromEmail = process.env.WEEKLY_SUMMARY_FROM ?? "reports@realwebwins.app";

  if (!apiKey || !recipients) {
    console.warn(
      "[weekly-summary] RESEND_API_KEY or WEEKLY_SUMMARY_RECIPIENTS missing, skipping email send."
    );
    return null;
  }

  const resend = new Resend(apiKey);
  const toList = recipients.split(",").map((email) => email.trim()).filter(Boolean);

  if (toList.length === 0) {
    console.warn("[weekly-summary] No recipients configured, skipping email send.");
    return null;
  }

  const response = await resend.emails.send({
    from: fromEmail,
    to: toList,
    subject,
    text: markdown,
  });

  return response;
}
