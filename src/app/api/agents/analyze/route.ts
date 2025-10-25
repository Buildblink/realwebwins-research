import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { relayMessage } from "@/lib/agents";

const ANALYZED_TABLES = [
  {
    table: "pain_points",
    columns: "id, text, category, niche, source, frequency, last_seen",
    orderColumn: "last_seen",
    insightType: "trend_analysis",
    limit: 5,
  },
] as const;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "[agents.analyze] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function POST() {
  const conversationId = randomUUID();
  const results: any[] = [];

  for (const config of ANALYZED_TABLES) {
    const { data, error } = await supabase
      .from(config.table)
      .select(config.columns)
      .order(config.orderColumn ?? "created_at", { ascending: false })
      .limit(config.limit);

    if (error || !data) {
      results.push({
        table: config.table,
        success: false,
        error: "FETCH_FAILED",
      });
      continue;
    }

    for (const record of data as any[]) {
      const sourceId = record.id;
      if (!sourceId) continue;

      const text = record.text ?? "(no description)";
      const prompt = [
        "You are the Realwebwins research analyst agent.",
        "Analyze the following entry and produce concise insights:",
        "",
        `Category: ${record.category ?? ""}`,
        `Niche: ${record.niche ?? ""}`,
        `Source: ${record.source ?? ""}`,
        `Frequency: ${record.frequency ?? ""}`,
        "",
        "Pain point:",
        text,
      ].join("\n");

      // Log message
      await supabase.from("agent_messages").insert([
        {
          conversation_id: conversationId,
          sender_agent: "agent_orchestrator",
          receiver_agent: "agent_researcher",
          role: "system",
          content: prompt,
        },
      ]);

      try {
        const reply = await relayMessage({
          conversationId,
          senderAgent: "agent_orchestrator",
          receiverAgent: "agent_researcher",
          content: prompt,
        });

        // ✅ FIX: Include source_table + remove invalid meta
        const { error: insertError } = await supabase
          .from("agent_insights")
          .insert([
            {
              agent_id: "agent_researcher",
              source_table: config.table, // 👈 mandatory
              source_id: sourceId,
              insight_type: config.insightType,
              summary: reply ?? "No summary returned",
              confidence: 0.9,
            },
          ]);

        if (insertError) throw insertError;

        results.push({
          table: config.table,
          sourceId,
          success: true,
        });
      } catch (relayError) {
        console.error("[agents.analyze] relay failed:", relayError);
      }
    }
  }

  return NextResponse.json({
    success: true,
    conversationId,
    results,
  });
}
