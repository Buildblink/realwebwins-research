import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { relayMessage } from "@/lib/agents";

/**
 * POST /api/cron/agents-daily
 * Triggers autonomous sync messages across agent links.
 * Protected via WEEKLY_SUMMARY_SECRET to reuse existing cron secret.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.WEEKLY_SUMMARY_SECRET ?? ""}`;

  if (!process.env.WEEKLY_SUMMARY_SECRET || authHeader !== expectedAuth) {
    console.warn("[agents.daily] Unauthorized cron attempt");
    return NextResponse.json(
      {
        success: false,
        error: "UNAUTHORIZED",
        message: "Invalid or missing authorization.",
      },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdminClient();

  const { data: links, error } = await supabase
    .from("agent_links")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[agents.daily] Failed to fetch links:", error);
    return NextResponse.json(
      {
        success: false,
        error: "DB_ERROR",
        message: "Unable to load agent links.",
      },
      { status: 500 }
    );
  }

  let triggered = 0;
  let failures = 0;

  for (const link of links ?? []) {
    if (!link?.source_agent || !link?.target_agent) {
      continue;
    }

    try {
      await relayMessage({
        conversationId: link.id ?? undefined,
        senderAgent: link.source_agent,
        receiverAgent: link.target_agent,
        content: `Daily sync triggered between ${link.source_agent} and ${link.target_agent}`,
      });
      triggered += 1;
    } catch (relayError) {
      failures += 1;
      console.error(
        `[agents.daily] Relay failed for ${link.source_agent} -> ${link.target_agent}:`,
        relayError
      );
    }
  }

  return NextResponse.json({
    success: failures === 0,
    count: triggered,
    failures,
  });
}
