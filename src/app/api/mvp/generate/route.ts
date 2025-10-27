import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { ReadableStream } from "node:stream/web";
import { getPainPointById } from "@/lib/painpoints/queryPainPoints";
import {
  createAgentSession,
  appendSessionTranscript,
  completeAgentSession,
  type SessionMessage,
} from "@/lib/agents/sessions";
import {
  createMVPOutput,
  updateMVPOutput,
  type MVPArtifactSummary,
} from "@/lib/mvp/outputs";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { runAgentsDynamic, type AgentDynamicResult } from "@/lib/agents/network";
import { generateArtifacts } from "@/lib/agents/artifacts";
import {
  createMVPArtifacts,
  type MVPArtifactRecord,
  type ArtifactValidationStatus,
} from "@/lib/mvp/artifacts";
import { validateArtifact } from "@/lib/artifacts/validator";
import type { GeneratedArtifact } from "@/lib/artifacts/types";

interface GeneratePayload {
  pain_id?: string;
  started_by?: string;
  stream?: boolean;
  deliverable_mode?: string;
  tier?: string;
  artifacts?: string[];
  notes?: string;
}

type DeliverableMode = "core" | "pro" | "premium";
type Tier = "free" | "pro" | "premium";

function buildTranscript(painSummary: string): SessionMessage[] {
  const now = new Date().toISOString();
  return [
    {
      id: randomUUID(),
      agent: "agent_researcher",
      role: "assistant",
      created_at: now,
      content: `Researcher: Collected core pain point evidence — "${painSummary}".`,
    },
    {
      id: randomUUID(),
      agent: "agent_builder",
      role: "assistant",
      created_at: new Date(Date.now() + 500).toISOString(),
      content:
        "Builder: Drafting MVP spec with landing page, onboarding email, and core workflow automation.",
    },
    {
      id: randomUUID(),
      agent: "agent_validator",
      role: "assistant",
      created_at: new Date(Date.now() + 1000).toISOString(),
      content:
        "Validator: Highlighting biggest risk (distribution) and recommending early interviews + preorders.",
    },
  ];
}

function deriveMVPTitle(summary: string) {
  if (!summary) return "AI-Generated MVP Concept";
  const max = 48;
  const trimmed = summary.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as GeneratePayload;
  const wantsStream =
    payload.stream === true ||
    request.headers.get("accept")?.includes("text/event-stream") === true;

  if (!payload.pain_id) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_PAIN_ID",
        message: "Provide a pain_id to generate an MVP.",
      },
      { status: 400 }
    );
  }

  try {
    const painPoint = await getPainPointById(payload.pain_id);
    if (!painPoint) {
      return NextResponse.json(
        { success: false, error: "PAIN_NOT_FOUND", message: "Unknown pain point." },
        { status: 404 }
      );
    }

    const summary = painPoint.summary ?? painPoint.text;
    const deliverableMode = normalizeDeliverableMode(payload.deliverable_mode);
    const tier = normalizeTier(payload.tier);

    if (wantsStream) {
      return streamMvpGeneration({
        payload,
        painPoint,
        summary,
        deliverableMode,
        tier,
      });
    }

    const dynamicOutputs = await runAgentsDynamic(summary, {
      variables: {
        deliverable_mode: deliverableMode,
        tier,
      },
    });
    const generation = await finalizeGeneration({
      dynamicOutputs,
      payload,
      painPoint,
      summary,
      deliverableMode,
      tier,
    });

    return NextResponse.json({
      success: true,
      session_id: generation.session.id,
      mvp_id: generation.output.id,
      transcript: generation.transcript,
      output: generation.output,
      agents: generation.agentsUsed,
      artifacts: generation.artifacts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[mvp.generate]", message);
    return NextResponse.json(
      { success: false, error: "MVP_GENERATION_FAILED", message },
      { status: 500 }
    );
  }
}

async function finalizeGeneration({
  dynamicOutputs,
  payload,
  painPoint,
  summary,
  deliverableMode,
  tier,
}: {
  dynamicOutputs: AgentDynamicResult[];
  payload: GeneratePayload;
  painPoint: Awaited<ReturnType<typeof getPainPointById>>;
  summary: string;
  deliverableMode: DeliverableMode;
  tier: Tier;
}) {
  const successfulOutputs = dynamicOutputs.filter(
    (entry) => entry.success && entry.output
  );

  const transcript: SessionMessage[] =
    successfulOutputs.length > 0
      ? successfulOutputs.map((entry, index) => ({
          id: randomUUID(),
          agent: entry.agent.name ?? entry.agent.llm_provider ?? `agent_${index + 1}`,
          role: "assistant",
          created_at: new Date(Date.now() + index * 500).toISOString(),
          content: entry.output,
        }))
      : [
          {
            id: randomUUID(),
            agent: "agent_researcher",
            role: "assistant",
            created_at: new Date().toISOString(),
            content: `Researcher: Collected core pain point evidence - "${summary}".`,
          },
        ];

  const session = await createAgentSession({
    painId: painPoint.id,
    startedBy: payload.started_by ?? null,
    metadata: {
      pain_summary: summary,
      category: painPoint.category,
      deliverable_mode: deliverableMode,
      tier,
    },
  });

  for (const message of transcript) {
    await appendSessionTranscript(session.id, message);
  }

  const firstOutput = transcript[0]?.content ?? "";
  const builderPlan = pickAgentOutput(successfulOutputs, "builder") ?? firstOutput;
  const stack = builderPlan;
  const validation = pickAgentOutput(successfulOutputs, "validator");
  const requestedArtifacts = normalizeArtifactRequests(payload.artifacts);

  const generatedArtifacts = await safeGenerateArtifacts({
    painSummary: summary,
    corePlan: builderPlan ?? summary,
    deliverableMode,
    tier,
    requestedArtifacts,
    additionalNotes: payload.notes,
  });

  const projectFiles = extractProjectFiles(generatedArtifacts);
  const initialSummaries = generatedArtifacts.map((artifact) => ({
    type: artifact.type,
    title: artifact.title,
    format: artifact.format,
    status: "pending",
    generated_at: new Date().toISOString(),
    metadata: artifact.metadata ?? {},
  }));

  let output = await createMVPOutput({
    sessionId: session.id,
    title: deriveMVPTitle(summary),
    summary:
      firstOutput ||
      `MVP focused on solving "${summary}".`,
    stack: stack ?? "Next.js + Supabase + Resend + Tailwind",
    pricing: "Launch with $49/mo subscription and annual option at $490.",
    risk:
      validation ??
      "Primary risk: insufficient distribution. Mitigate via 10 customer interviews.",
    validationScore: 0.72,
    downloadUrls: {},
    deliverableMode,
    artifacts: initialSummaries,
    projectFiles,
  });

  let artifactsSummary: MVPArtifactSummary[] = initialSummaries;
  let artifactRecords: MVPArtifactRecord[] = [];

  if (generatedArtifacts.length > 0) {
    const persisted = await persistArtifactsForOutput(output.id, generatedArtifacts);
    artifactRecords = persisted.records;
    artifactsSummary = persisted.summaries;
    output = await updateMVPOutput(output.id, {
      artifacts: artifactsSummary,
      projectFiles,
    });
  }

  const agentsUsed = dynamicOutputs.map((entry) => ({
    agent_id: entry.agent.id,
    agent_name: entry.agent.name,
    provider: entry.agent.llm_provider,
    model: entry.agent.llm_model,
    duration_ms: entry.durationMs,
    tokens: entry.tokens ?? null,
    success: entry.success,
    error: entry.error ?? null,
  }));

  await completeAgentSession(session.id, {
    metadata: {
      ...(session.metadata ?? {}),
      transcript_length: transcript.length,
      mvp_output_id: output.id,
      agents_used: agentsUsed,
      artifacts: artifactsSummary,
    },
  });

  const supabase = getSupabaseAdminClient();
  void supabase.from("AgentStatus").insert([
    {
      idea: "pain_mvp",
      stage: "generate",
      success: true,
      meta: {
        session_id: session.id,
        mvp_id: output.id,
        transcript_count: transcript.length,
        artifacts: artifactsSummary.map((artifact) => ({
          type: artifact.type,
          status: artifact.status,
        })),
      },
      last_run: new Date().toISOString(),
    },
  ]);

  return {
    session,
    output,
    transcript,
    dynamicOutputs,
    agentsUsed,
    artifacts: artifactsSummary,
    artifactRecords,
  };
}

async function streamMvpGeneration({
  payload,
  painPoint,
  summary,
  deliverableMode,
  tier,
}: {
  payload: GeneratePayload;
  painPoint: Awaited<ReturnType<typeof getPainPointById>>;
  summary: string;
  deliverableMode: DeliverableMode;
  tier: Tier;
}) {
  const encoder = new TextEncoder();
  const dynamicOutputs: AgentDynamicResult[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode("event: start\ndata: MVP generation started\n\n"));
      try {
        await runAgentsDynamic(summary, {
          variables: {
            deliverable_mode: deliverableMode,
            tier,
          },
          onProgress: async (entry) => {
            dynamicOutputs.push(entry);
            controller.enqueue(
              encoder.encode(
                `event: message\ndata: ${JSON.stringify({
                  agent: entry.agent.name,
                  output: entry.output,
                  success: entry.success,
                  durationMs: entry.durationMs,
                  tokens: entry.tokens ?? null,
                  error: entry.error ?? null,
                })}\n\n`
              )
            );
          },
        });

        const generation = await finalizeGeneration({
          dynamicOutputs,
          payload,
          painPoint,
          summary,
          deliverableMode,
          tier,
        });

        controller.enqueue(
          encoder.encode(
            `event: complete\ndata: ${JSON.stringify({
              session_id: generation.session.id,
              mvp_id: generation.output.id,
              transcript: generation.transcript,
              agents: generation.agentsUsed,
            })}\n\n`
          )
        );
        controller.enqueue(encoder.encode("event: end\ndata: done\n\n"));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function normalizeDeliverableMode(mode?: string | null): DeliverableMode {
  const value = (mode ?? "").toLowerCase();
  if (value === "pro" || value === "premium") {
    return value;
  }
  return "core";
}

function normalizeTier(tier?: string | null): Tier {
  const value = (tier ?? "").toLowerCase();
  if (value === "pro" || value === "premium") {
    return value;
  }
  return "free";
}

function normalizeArtifactRequests(requests?: string[] | null): string[] {
  if (!Array.isArray(requests)) {
    return [];
  }
  const seen = new Set<string>();
  for (const request of requests) {
    if (typeof request !== "string") continue;
    const value = request.trim().toLowerCase();
    if (!value) continue;
    seen.add(value);
  }
  return Array.from(seen);
}

async function safeGenerateArtifacts(context: {
  painSummary: string;
  corePlan: string;
  deliverableMode: DeliverableMode;
  tier: Tier;
  requestedArtifacts: string[];
  additionalNotes?: string;
}): Promise<GeneratedArtifact[]> {
  try {
    return await generateArtifacts({
      painSummary: context.painSummary,
      corePlan: context.corePlan,
      deliverableMode: context.deliverableMode,
      tier: context.tier,
      requestedArtifacts: context.requestedArtifacts,
      additionalNotes: context.additionalNotes,
    });
  } catch (error) {
    console.error(
      "[mvp.generate] Failed to generate artifacts",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

function extractProjectFiles(artifacts: GeneratedArtifact[]) {
  const files: Record<string, { content: string; format: string }> = {};

  for (const artifact of artifacts) {
    if (Array.isArray(artifact.content)) {
      for (const file of artifact.content) {
        const path = file.path ?? "";
        if (!path) continue;
        files[path] = {
          content: file.content,
          format: file.language ?? inferFormatFromPath(path),
        };
      }
    } else if (typeof artifact.content === "string") {
      if (artifact.format === "typescript" || artifact.format === "tsx") {
        const extension = artifact.format === "tsx" ? "tsx" : "ts";
        const key = `artifacts/${artifact.type}.${extension}`;
        files[key] = { content: artifact.content, format: artifact.format };
      }
    }
  }

  return files;
}

async function persistArtifactsForOutput(
  mvpId: string,
  artifacts: GeneratedArtifact[]
): Promise<{
  records: MVPArtifactRecord[];
  summaries: MVPArtifactSummary[];
}> {
  const prepared = artifacts.map((artifact) => {
    const validation = validateArtifact({
      type: artifact.type,
      format: artifact.format,
      content: artifact.content,
    });

    const status = mapValidationStatus(validation.status);

    return {
      input: {
        mvpId,
        artifactType: artifact.type,
        title: artifact.title,
        format: artifact.format,
        content: artifact.content,
        validationStatus: status,
        validationErrors: validation.errors,
        metadata: {
          ...(artifact.metadata ?? {}),
          validation: {
            status: validation.status,
            errors: validation.errors,
            warnings: validation.warnings,
            metadata: validation.metadata ?? {},
          },
        },
      },
      summary: {
        type: artifact.type,
        title: artifact.title,
        format: artifact.format,
        status,
        metadata: {
          ...(artifact.metadata ?? {}),
          validation: validation.metadata ?? {},
        },
      } as MVPArtifactSummary,
    };
  });

  const records = await createMVPArtifacts(prepared.map((item) => item.input));
  const summaries = records.map((record, index) => ({
    id: record.id,
    type: record.artifact_type,
    title: record.title ?? undefined,
    format: record.format ?? undefined,
    status: record.validation_status,
    generated_at: record.created_at,
    metadata: prepared[index]?.summary.metadata ?? {},
  }));

  return { records, summaries };
}

function mapValidationStatus(status: "valid" | "invalid" | "warning"): ArtifactValidationStatus {
  if (status === "invalid") return "invalid";
  if (status === "warning") return "warning";
  return "valid";
}

function pickAgentOutput(outputs: AgentDynamicResult[], keyword: string) {
  const target = keyword.toLowerCase();
  const match = outputs.find((entry) => {
    const role = entry.agent.role?.toLowerCase() ?? "";
    const mode = entry.agent.mode?.toLowerCase() ?? "";
    const name = entry.agent.name?.toLowerCase() ?? "";
    return role.includes(target) || mode.includes(target) || name.includes(target);
  });
  return match?.output ?? null;
}

function inferFormatFromPath(path: string): string {
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".sql")) return "sql";
  if (path.endsWith(".md")) return "markdown";
  return "text";
}
