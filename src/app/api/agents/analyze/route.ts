import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { relayMessage } from "@/lib/agents";

type AnalyzeConfig = {
  table: string;
  columns: string;
  orderColumn?: string;
  insightType: string;
  limit: number;
};

type PainPointRecord = {
  id: string;
  text?: string | null;
  category?: string | null;
  niche?: string | null;
  source?: string | null;
  frequency?: number | null;
};

type AnalyzeResult = {
  table: string;
  sourceId: string;
  summary: string | null;
  success: boolean;
  error?: string;
};

const ANALYZED_TABLES: ReadonlyArray<AnalyzeConfig> = [
  {
    table: "pain_points",
    columns: "id, text, category, niche, source, frequency",
    orderColumn: "created_at",
    insightType: "trend_analysis",
    limit: 5,
  },
];

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
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST() {
  const conversationId = randomUUID();
  const results: AnalyzeResult[] = [];

  for (const config of ANALYZED_TABLES) {
    const { data, error } = await supabase
      .from<PainPointRecord>(config.table)
      .select(config.columns)
      .order(config.orderColumn ?? "created_at", { ascending: false })
      .limit(config.limit);

    if (error) {
      console.error(`[agents.analyze] Fetch failed for ${config.table}:`, error);
      results.push({
        table: config.table,
        sourceId: "unknown",
        summary: null,
        success: false,
        error: "FETCH_FAILED",
      });
      continue;
    }

    const records = data ?? [];
    if (records.length === 0) {
      results.push({
        table: config.table,
        sourceId: "none",
        summary: null,
        success: true,
      });
      continue;
    }

    for (const record of records) {
      const sourceId = record.id;
      if (!sourceId) {
        results.push({
          table: config.table,
          sourceId: "missing",
          summary: null,
          success: false,
          error: "MISSING_SOURCE_ID",
        });
        continue;
      }

      const prompt = [
        "You are the Realwebwins research analyst agent.",
        "Analyze the following entry and produce a concise summary of trends, risks, and recommended action items.",
        "Use bullet points starting with '-' for each recommendation.",
        "",
        `Category: ${record.category ?? ""}`,
        `Niche: ${record.niche ?? ""}`,
        `Source: ${record.source ?? ""}`,
        `Frequency signal: ${record.frequency ?? "n/a"}`,
        "",
        "Pain point:",
        record.text ?? "(no description provided)",
      ].join("\n");

      const { error: messageError } = await supabase
        .from("agent_messages")
        .insert([
          {
            conversation_id: conversationId,
            sender_agent: "agent_orchestrator",
            receiver_agent: "agent_researcher",
            role: "system",
            content: prompt,
            meta: {
              source_table: config.table,
              source_id: sourceId,
            },
          },
        ]);

      if (messageError) {
        console.error("[agents.analyze] Failed to log agent message:", messageError);
      }

      try {
        const reply = await relayMessage({
          conversationId,
          senderAgent: "agent_orchestrator",
          receiverAgent: "agent_researcher",
          content: prompt,
        });

        const { error: insightError } = await supabase.from("agent_insights").insert([
          {
            agent_id: "agent_researcher",
            source_table: config.table,
            source_id: sourceId,
            insight_type: config.insightType,
            summary: reply ?? "(no reply)",
            confidence: 0.9,
            meta: { prompt },
          },
        ]);

        if (insightError) {
          throw new Error(insightError.message);
        }

        results.push({
          table: config.table,
          sourceId,
          summary: reply ?? null,
          success: true,
        });
      } catch (analysisError) {
        const message =
          analysisError instanceof Error ? analysisError.message : String(analysisError);

        console.error(
          `[agents.analyze] Analysis failed for ${config.table} (${sourceId}):`,
          analysisError
        );

        const { error: failureLogError } = await supabase
          .from("agent_insights")
          .insert([
            {
              agent_id: "agent_researcher",
              source_table: config.table,
              source_id: sourceId,
              insight_type: "analysis_failed",
              summary: "Autonomous analysis failed. Review meta.error for details.",
              confidence: 0.1,
              meta: { prompt, error: message },
            },
          ]);

        if (failureLogError) {
          console.error(
            "[agents.analyze] Failed to log analysis failure:",
            failureLogError
          );
        }

        results.push({
          table: config.table,
          sourceId,
          summary: null,
          success: false,
          error: message,
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    conversationId,
    results,
  });
}
