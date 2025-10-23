import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { generateAIResponse } from "@/lib/aiProvider";

const WORKSPACE_SECTIONS = ["understand", "ideate", "build", "validate"] as const;

export type WorkspaceSection = (typeof WORKSPACE_SECTIONS)[number];

interface SectionConfig {
  label: string;
  modelEnvVar: string;
  systemGoal: string;
}

export interface WorkspaceSnapshot {
  painPoint: PainPointRow;
  workspace: WorkspaceRow;
  outputs: Record<WorkspaceSection, WorkspaceOutputRow | null>;
  sections: Array<{ id: WorkspaceSection; label: string; systemGoal: string }>;
}

interface PainPointRow {
  id: string;
  text: string;
  audience: string | null;
  category: string | null;
  niche: string | null;
  source: string | null;
  proof_link: string | null;
  related_playbook: string | null;
}

interface WorkspaceRow {
  id: string;
  pain_point_id: string;
  title: string;
  status: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkspaceOutputRow {
  id: string;
  workspace_id: string;
  section: WorkspaceSection;
  content_md: string | null;
  content_json: unknown;
  model: string | null;
  tokens: number | null;
  cost_usd: string | number | null;
  created_at: string;
  updated_at: string;
}

const SECTION_CONFIG: Record<WorkspaceSection, SectionConfig> = {
  understand: {
    label: "Understand",
    modelEnvVar: "MODEL_WORKSPACE_UNDERSTAND",
    systemGoal:
      "Summarize the pain point context, audience, severity, and supporting evidence in clear markdown sections.",
  },
  ideate: {
    label: "Ideate",
    modelEnvVar: "MODEL_WORKSPACE_IDEATE",
    systemGoal:
      "Generate three differentiated solution concepts with positioning, key features, and go-to-market hooks.",
  },
  build: {
    label: "Build",
    modelEnvVar: "MODEL_WORKSPACE_BUILD",
    systemGoal:
      "Lay out an MVP build plan, recommended tools/stack, launch checklist, and marketing assets in markdown.",
  },
  validate: {
    label: "Validate",
    modelEnvVar: "MODEL_WORKSPACE_VALIDATE",
    systemGoal:
      "Identify competitor/alternative benchmarks, uniqueness signal, and fast validation experiments.",
  },
};

/**
 * Fetch user memory summary for personalization
 */
async function getUserMemory(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();

  // Get user's workspace memory
  const { data: memory } = await supabase
    .from("workspace_memories")
    .select("summary, updated_at")
    .eq("workspace_id", userId) // Note: This should ideally be workspace_id but we're using userId as a proxy
    .order("updated_at", { ascending: false })
    .maybeSingle();

  if (memory?.summary) {
    return memory.summary;
  }

  // Fallback: analyze recent user activity
  const { data: events } = await supabase
    .from("user_events")
    .select("event, context")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!events || events.length === 0) {
    return null;
  }

  // Extract patterns from events
  const categories = new Set<string>();
  const niches = new Set<string>();
  const eventCounts: Record<string, number> = {};

  events.forEach((e) => {
    eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;

    if (e.context && typeof e.context === "object") {
      const ctx = e.context as Record<string, unknown>;
      if (ctx.category) categories.add(String(ctx.category));
      if (ctx.niche) niches.add(String(ctx.niche));
    }
  });

  const lines: string[] = [];

  if (categories.size > 0) {
    lines.push(`- Primary interests: ${Array.from(categories).join(", ")}`);
  }

  if (niches.size > 0) {
    lines.push(`- Focus niches: ${Array.from(niches).join(", ")}`);
  }

  const topEvents = Object.entries(eventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topEvents.length > 0) {
    lines.push(`- Most active: ${topEvents.map(([e]) => e).join(", ")}`);
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

async function buildPrompt(
  section: WorkspaceSection,
  painPoint: PainPointRow,
  userId?: string | null
): Promise<string> {
  const config = SECTION_CONFIG[section];
  const lines: string[] = [
    `You are an expert product strategist helping a builder solve the following pain point.`,
    ``,
  ];

  // Add user personalization if available
  if (userId) {
    try {
      const userContext = await getUserMemory(userId);
      if (userContext) {
        lines.push(
          `# User Context`,
          `You're helping a builder with the following preferences and history:`,
          userContext,
          ``
        );
      }
    } catch (error) {
      console.warn("[buildPrompt] Failed to fetch user memory:", error);
    }
  }

  lines.push(
    `# Pain Point`,
    `- **ID:** ${painPoint.id}`,
    `- **Audience:** ${painPoint.audience ?? "Unknown"}`,
    `- **Category:** ${painPoint.category ?? "Unknown"}`,
    `- **Niche:** ${painPoint.niche ?? "Unknown"}`,
    `- **Source:** ${painPoint.source ?? "Unknown"}`,
    `- **Proof Link:** ${painPoint.proof_link ?? "None provided"}`,
    ``,
    `## Description`,
    painPoint.text,
    ``,
    `# Task`,
    config.systemGoal,
    ``,
    `## Output Requirements`,
    `- Return markdown formatted content suitable for direct rendering in the workspace.`,
    `- Focus on clear, actionable insights tailored to the audience.`,
    `- Keep tone confident, concise, and data-informed.`
  );

  // Provide guidance if a related playbook exists.
  if (painPoint.related_playbook) {
    lines.push(
      ``,
      `## Linked Playbook Reference`,
      `This pain point is linked to playbook "${painPoint.related_playbook}". Incorporate any relevant insights without duplicating full content.`
    );
  }

  return lines.join("\n");
}

function resolveModel(section: WorkspaceSection): string {
  const config = SECTION_CONFIG[section];
  const envModel = process.env[config.modelEnvVar];
  if (envModel && envModel.trim().length > 0) {
    return envModel.trim();
  }
  if (process.env.MODEL_WORKSPACE_DEFAULT && process.env.MODEL_WORKSPACE_DEFAULT.trim().length > 0) {
    return process.env.MODEL_WORKSPACE_DEFAULT.trim();
  }
  return "gpt-4.1-mini";
}

export async function getWorkspaceSnapshot(painPointId: string): Promise<WorkspaceSnapshot> {
  const supabase = getSupabaseAdminClient();

  const painPointQuery = await supabase
    .from("pain_points")
    .select(
      "id, text, audience, category, niche, source, proof_link, related_playbook"
    )
    .eq("id", painPointId)
    .maybeSingle();

  if (painPointQuery.error) {
    throw new Error(painPointQuery.error.message);
  }

  const painPoint = painPointQuery.data;

  if (!painPoint) {
    throw new Error("Pain point not found.");
  }

  const workspace = await ensureWorkspace(painPoint);

  const outputsResponse = await supabase
    .from("workspace_outputs")
    .select(
      "id, workspace_id, section, content_md, content_json, model, tokens, cost_usd, created_at, updated_at"
    )
    .eq("workspace_id", workspace.id);

  if (outputsResponse.error) {
    throw new Error(outputsResponse.error.message);
  }

  const latestOutputs = outputsResponse.data.reduce<Record<WorkspaceSection, WorkspaceOutputRow | null>>(
    (acc, row) => {
      const section = row.section as WorkspaceSection;
      const current = acc[section];
      if (!current) {
        acc[section] = row as WorkspaceOutputRow;
        return acc;
      }
      if (new Date(row.updated_at).getTime() > new Date(current.updated_at).getTime()) {
        acc[section] = row as WorkspaceOutputRow;
      }
      return acc;
    },
    {
      understand: null,
      ideate: null,
      build: null,
      validate: null,
    }
  );

  return {
    painPoint,
    workspace,
    outputs: latestOutputs,
    sections: WORKSPACE_SECTIONS.map((section) => ({
      id: section,
      label: SECTION_CONFIG[section].label,
      systemGoal: SECTION_CONFIG[section].systemGoal,
    })),
  };
}

export async function generateWorkspaceSection(
  painPointId: string,
  section: WorkspaceSection
): Promise<WorkspaceOutputRow> {
  const supabase = getSupabaseAdminClient();
  const snapshot = await getWorkspaceSnapshot(painPointId);
  const { workspace, painPoint } = snapshot;

  const model = resolveModel(section);
  const prompt = await buildPrompt(section, painPoint, workspace.user_id);
  const contentMd = await generateAIResponse(prompt, { model });

  const existingResponse = await supabase
    .from("workspace_outputs")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("section", section)
    .maybeSingle();

  if (existingResponse.error) {
    throw new Error(existingResponse.error.message);
  }

  const payload = {
    workspace_id: workspace.id,
    section,
    content_md: contentMd.trim(),
    content_json: null,
    model,
    tokens: 0,
    cost_usd: 0,
    updated_at: new Date().toISOString(),
  };

  const query = existingResponse.data
    ? supabase
        .from("workspace_outputs")
        .update(payload)
        .eq("id", existingResponse.data.id)
    : supabase.from("workspace_outputs").insert([payload]);

  const result = await query
    .select(
      "id, workspace_id, section, content_md, content_json, model, tokens, cost_usd, created_at, updated_at"
    )
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as WorkspaceOutputRow;
}

export async function buildWorkspaceDeliverables(painPointId: string): Promise<{
  markdown: string;
}> {
  const snapshot = await getWorkspaceSnapshot(painPointId);

  const buildOutput = snapshot.outputs.build;
  if (!buildOutput || !buildOutput.content_md) {
    throw new Error("Generate the Build section before exporting deliverables.");
  }

  const lines: string[] = [
    `# ${snapshot.workspace.title}`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `## Pain Point Summary`,
    `- Audience: ${snapshot.painPoint.audience ?? "Unknown"}`,
    `- Category: ${snapshot.painPoint.category ?? "Unknown"}`,
    `- Niche: ${snapshot.painPoint.niche ?? "Unknown"}`,
    `- Source: ${snapshot.painPoint.source ?? "Unknown"}`,
    `- Proof: ${snapshot.painPoint.proof_link ?? "None"}`,
    ``,
    `### Original Description`,
    snapshot.painPoint.text,
    ``,
  ];

  for (const section of WORKSPACE_SECTIONS) {
    const output = snapshot.outputs[section];
    lines.push(`## ${SECTION_CONFIG[section].label}`);
    if (output?.content_md) {
      lines.push(output.content_md.trim(), "");
    } else {
      lines.push("_No cached output for this section yet._", "");
    }
  }

  return { markdown: lines.join("\n") };
}

export async function answerWorkspaceQuestion(
  painPointId: string,
  question: string
): Promise<{ answer: string; model: string }> {
  if (!question || question.trim().length === 0) {
    throw new Error("Question cannot be empty.");
  }

  const snapshot = await getWorkspaceSnapshot(painPointId);

  const model =
    process.env.MODEL_WORKSPACE_COPILOT?.trim() ??
    process.env.MODEL_WORKSPACE_DEFAULT?.trim() ??
    resolveModel("understand");

  const contextLines: string[] = [
    `You are Workspace Copilot. Answer succinctly with concrete, helpful advice for the builder.`,
    ``,
    `# Pain Point Context`,
    snapshot.painPoint.text,
    ``,
    `## Metadata`,
    `- Audience: ${snapshot.painPoint.audience ?? "Unknown"}`,
    `- Category: ${snapshot.painPoint.category ?? "Unknown"}`,
    `- Niche: ${snapshot.painPoint.niche ?? "Unknown"}`,
    `- Source: ${snapshot.painPoint.source ?? "Unknown"}`,
  ];

  for (const section of WORKSPACE_SECTIONS) {
    const output = snapshot.outputs[section];
    if (output?.content_md) {
      contextLines.push(
        ``,
        `## ${SECTION_CONFIG[section].label} Notes`,
        truncateMarkdown(output.content_md, 900)
      );
    }
  }

  contextLines.push(
    ``,
    `# Builder Question`,
    question.trim(),
    ``,
    `Respond with markdown, keeping actionable recommendations up front.`
  );

  const answer = await generateAIResponse(contextLines.join("\n"), { model });

  return { answer: answer.trim(), model };
}

async function ensureWorkspace(painPoint: PainPointRow): Promise<WorkspaceRow> {
  const supabase = getSupabaseAdminClient();

  const existing = await supabase
    .from("workspaces")
    .select("id, pain_point_id, title, status, user_id, created_at, updated_at")
    .eq("pain_point_id", painPoint.id)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data) {
    return existing.data as WorkspaceRow;
  }

  const title = `Workspace • ${painPoint.text.substring(0, 80)}${
    painPoint.text.length > 80 ? "…" : ""
  }`;

  const insertResponse = await supabase
    .from("workspaces")
    .insert([
      {
        pain_point_id: painPoint.id,
        title,
        status: "active",
      },
    ])
    .select("id, pain_point_id, title, status, user_id, created_at, updated_at")
    .single();

  if (insertResponse.error) {
    throw new Error(insertResponse.error.message);
  }

  return insertResponse.data as WorkspaceRow;
}

export function assertWorkspaceSection(value: string | null): WorkspaceSection {
  if (!value) {
    throw new Error("Section query parameter is required.");
  }
  const lower = value.toLowerCase() as WorkspaceSection;
  if (!WORKSPACE_SECTIONS.includes(lower)) {
    throw new Error(`Unsupported section "${value}". Expected one of ${WORKSPACE_SECTIONS.join(", ")}.`);
  }
  return lower;
}

function truncateMarkdown(markdown: string, maxLength: number): string {
  if (markdown.length <= maxLength) {
    return markdown;
  }
  return `${markdown.substring(0, maxLength - 1).trim()}…`;
}
