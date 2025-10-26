import OpenAI from "openai";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getAgentMemory } from "@/lib/agents/memory";

interface ReflectionRecordInput {
  reflection_type: string;
  summary: string;
  content: string;
  confidence: number;
  behavior_id?: string | null;
  metadata: Record<string, unknown>;
}

interface ReflectionOverride extends Partial<ReflectionRecordInput> {
  impact?: number;
}

interface ReflectionOptions {
  agentId: string;
  limit?: number;
  override?: ReflectionOverride;
}

async function generateReflectionPrompt({
  agentId,
  memorySnippets,
  behaviorSummaries,
}: {
  agentId: string;
  memorySnippets: string[];
  behaviorSummaries: string[];
}) {
  if (memorySnippets.length === 0) {
    return [
      `Agent ${agentId} reviewed recent logs but found no new memory entries.`,
      "Reflection: No new information to summarize.",
      "Impact: 0.0",
      "Confidence: 0.5",
    ].join("\n");
  }

  return [
    `You are analyzing the latest knowledge accumulated by agent ${agentId}.`,
    "Summarize the key learnings succinctly and identify which autonomous behaviors produced the most impact.",
    "Format your response as:",
    "- Reflection: <summary>",
    "- Impact Score: <0-1>",
    "- Confidence: <0-1>",
    "- Behavior: <behavior name or id if known>",
    "",
    "Active behaviors:",
    ...behaviorSummaries,
    "",
    "Recent memory entries:",
    ...memorySnippets.map((snippet, index) => `${index + 1}. ${snippet}`),
  ].join("\n");
}

const openaiClient =
  process.env.OPENAI_API_KEY !== undefined
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

async function refreshSupabaseSchema() {
  const supabase = getSupabaseAdminClient();
  try {
    await supabase.rpc("pg_reload_conf");
  } catch (error) {
    console.warn("[agents.reflection] Schema refresh failed", error);
  }
}

async function callReflectionModel(
  prompt: string
): Promise<Omit<ReflectionRecordInput, "reflection_type">> {
  if (!openaiClient) {
    return {
      summary: "OpenAI API key missing. Unable to generate reflection.",
      content:
        "OpenAI API key missing. Unable to generate reflection. Configure OPENAI_API_KEY to enable this feature.",
      confidence: 0.2,
      behavior_id: null,
      metadata: {
        impact: 0.0,
        source: "fallback",
      },
    };
  }

  const response = await openaiClient.chat.completions.create({
    model: process.env.OPENAI_AGENT_MODEL ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: "You produce concise agent reflections." },
      { role: "user", content: prompt },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "";
  const rawImpact = content.match(/Impact(?: Score)?:\s*([0-9.]+)/i)?.[1];
  const rawConfidence = content.match(/Confidence:\s*([0-9.]+)/i)?.[1];
  const impact = rawImpact ? parseFloat(rawImpact) : 0.0;
  const confidence = rawConfidence ? parseFloat(rawConfidence) : NaN;
  const behaviorMatch = content.match(/Behavior:\s*(.+)/i);
  const behaviorIdCandidate = behaviorMatch?.[1] ?? null;
  const behaviorId =
    behaviorIdCandidate?.match(
      /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
    )?.[0] ?? null;
  const summaryMatch = content.match(/Reflection:\s*(.+)/i);
  const summary =
    summaryMatch?.[1]?.trim() ?? content.split("\n").find(Boolean) ?? "";

  return {
    summary: summary || "No reflection generated.",
    content: content || summary || "No reflection generated.",
    confidence: Number.isFinite(confidence) ? confidence : 0.6,
    behavior_id: behaviorId,
    metadata: {
      impact: Number.isFinite(impact) ? impact : 0.2,
      raw: content,
    },
  };
}

export async function createAgentReflection(options: ReflectionOptions) {
  const { agentId, limit = 20, override } = options;
  const supabase = getSupabaseAdminClient();

  const recentMemory = await getAgentMemory({
    agent_id: agentId,
    limit,
  });

  const { data: behaviors } = await supabase
    .from("agent_behaviors")
    .select("id, name, action_type, enabled")
    .eq("agent_id", agentId);

  const memorySnippets = recentMemory.map((entry) => {
    const summary = entry.summary ?? "";
    const content = entry.content ?? "";
    return `Topic: ${entry.topic}\nSummary: ${summary || content}`;
  });

  const behaviorSummaries = (behaviors ?? []).map((behavior) => {
    const status = behavior.enabled === false ? "disabled" : "enabled";
    return `- ${behavior.id} (${behavior.name ?? behavior.action_type}) [${status}]`;
  });

  let reflectionPayload: ReflectionRecordInput;

  if (override && (override.summary || override.content)) {
    reflectionPayload = {
      reflection_type: override.reflection_type ?? "manual",
      summary: override.summary ?? "Manual reflection",
      content: override.content ?? override.summary ?? "Manual reflection",
      confidence: override.confidence ?? 0.5,
      behavior_id: override.behavior_id ?? null,
      metadata: {
        ...(override.metadata ?? {}),
        ...(typeof override.impact === "number" ? { impact: override.impact } : {}),
      },
    };
  } else {
    const prompt = await generateReflectionPrompt({
      agentId,
      memorySnippets,
      behaviorSummaries,
    });
    const aiResult = await callReflectionModel(prompt);
    reflectionPayload = {
      reflection_type: "auto",
      summary: aiResult.summary,
      content: aiResult.content,
      confidence: aiResult.confidence,
      behavior_id: aiResult.behavior_id ?? null,
      metadata: {
        ...(aiResult.metadata ?? {}),
        memory_count: recentMemory.length,
        behavior_count: behaviors?.length ?? 0,
      },
    };
  }

  const payload = {
    agent_id: agentId,
    behavior_id: reflectionPayload.behavior_id ?? null,
    reflection_type: reflectionPayload.reflection_type,
    summary: reflectionPayload.summary,
    content: reflectionPayload.content,
    confidence: Math.max(0, Math.min(1, reflectionPayload.confidence)),
    metadata: reflectionPayload.metadata ?? {},
  };

  await refreshSupabaseSchema();

  const { data, error } = await supabase
    .from("agent_reflections")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("[agents.reflection] Insert failed", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      payload,
    });
    throw new Error(`[reflection] Failed to store reflection: ${error.message}`);
  }

  return data;
}

export async function listAgentReflections(limit = 50) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("agent_reflections")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load reflections: ${error.message}`);
  }

  return data ?? [];
}
