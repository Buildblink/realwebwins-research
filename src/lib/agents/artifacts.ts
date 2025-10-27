import { runLLM } from "@/lib/llm/runLLM";
import {
  ArtifactFileDescriptor,
  ArtifactFormat,
  GeneratedArtifact,
} from "@/lib/artifacts/types";

type DeliverableMode = "core" | "pro" | "premium";
type Tier = "free" | "pro" | "premium";

interface ArtifactAgentDefinition {
  type: string;
  title: string;
  format: ArtifactFormat;
  deliverableModes: DeliverableMode[];
  minimumTier: Tier;
  prompt: string;
  provider?: string;
  model?: string;
  temperature?: number;
}

export interface ArtifactGenerationContext {
  painSummary: string;
  corePlan: string;
  deliverableMode: DeliverableMode;
  tier: Tier;
  requestedArtifacts?: string[];
  additionalNotes?: string;
}

export async function generateArtifacts(
  context: ArtifactGenerationContext
): Promise<GeneratedArtifact[]> {
  const selected = selectArtifactAgents(context);
  const artifacts: GeneratedArtifact[] = [];

  for (const definition of selected) {
    try {
      const variables = {
        pain_point: context.painSummary,
        mvp_plan: context.corePlan,
        deliverable_mode: context.deliverableMode,
        tier: context.tier,
        requested_artifacts: (context.requestedArtifacts ?? []).join(", "),
        additional_notes: context.additionalNotes ?? "",
      };

      const result = await runLLM({
        agent: {
          name: definition.title,
          prompt: definition.prompt,
          llm_provider: definition.provider ?? defaultProvider(),
          llm_model: definition.model ?? defaultModel(),
          temperature: definition.temperature ?? defaultTemperature(),
        },
        variables,
      });

      const parsed = parseArtifact(definition, result.content);
      artifacts.push({
        type: definition.type,
        title: definition.title,
        format: definition.format,
        content: parsed.content,
        summary: parsed.summary,
        metadata: {
          provider: result.provider,
          model: result.model,
          durationMs: result.durationMs,
          tokens: result.tokens ?? null,
        },
      });
    } catch (error) {
      artifacts.push({
        type: definition.type,
        title: definition.title,
        format: "text",
        content: `Failed to generate artifact: ${
          error instanceof Error ? error.message : String(error)
        }`,
        summary: "Generation failed.",
        metadata: {
          error: true,
        },
      });
    }
  }

  return artifacts;
}

function selectArtifactAgents(
  context: ArtifactGenerationContext
): ArtifactAgentDefinition[] {
  const requested = new Set(
    (context.requestedArtifacts ?? []).map((type) => type.toLowerCase())
  );

  return ARTIFACT_AGENT_CATALOG.filter((definition) => {
    if (!definition.deliverableModes.includes(context.deliverableMode)) {
      return false;
    }

    if (!tierAllows(context.tier, definition.minimumTier)) {
      return false;
    }

    if (requested.size && !requested.has(definition.type)) {
      return false;
    }

    return true;
  });
}

function tierAllows(requestedTier: Tier, minimumTier: Tier): boolean {
  const rank: Record<Tier, number> = {
    free: 0,
    pro: 1,
    premium: 2,
  };
  return rank[requestedTier] >= rank[minimumTier];
}

function parseArtifact(
  definition: ArtifactAgentDefinition,
  raw: string
): { content: GeneratedArtifact["content"]; summary?: string } {
  if (definition.format === "json" || definition.format === "json-schema") {
    const parsed = parseJsonBlock(raw);
    return { content: parsed ?? { raw }, summary: summarize(raw) };
  }

  if (definition.format === "code-bundle") {
    const parsed = parseJsonBlock(raw);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.files)) {
      const files = (parsed.files as ArtifactFileDescriptor[]).map((file) => ({
        path: file.path,
        content: file.content,
        language: file.language ?? detectLanguage(file.path),
      }));
      return { content: files, summary: summarize(raw) };
    }

    return {
      content: [
        {
          path: "README.md",
          content: raw.trim(),
        },
      ],
      summary: "Code bundle returned as plain text.",
    };
  }

  return { content: raw.trim(), summary: summarize(raw) };
}

function summarize(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.slice(0, 160);
}

function parseJsonBlock(raw: string): any | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function detectLanguage(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".ts")) return "ts";
  if (path.endsWith(".js")) return "js";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".sql")) return "sql";
  if (path.endsWith(".md")) return "markdown";
  return undefined;
}

function defaultProvider() {
  return process.env.ARTIFACT_LLM_PROVIDER ?? "openai";
}

function defaultModel() {
  return process.env.ARTIFACT_LLM_MODEL ?? "gpt-4o-mini";
}

function defaultTemperature() {
  const raw = process.env.ARTIFACT_LLM_TEMPERATURE;
  if (!raw) return 0.45;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0.45;
}

const ARTIFACT_AGENT_CATALOG: ArtifactAgentDefinition[] = [
  {
    type: "product-brief",
    title: "Product Brief",
    format: "markdown",
    deliverableModes: ["core", "pro", "premium"],
    minimumTier: "free",
    prompt: [
      "You are the Builder agent for Realwebwins.",
      "Summarize the MVP concept for {{pain_point}} as a concise product brief.",
      "Include sections: Problem, Solution, Core Features, Differentiators, Monetization, Next Steps.",
      "Keep the tone actionable and founder-friendly.",
    ].join("\n"),
  },
  {
    type: "technical-architecture",
    title: "Technical Architecture",
    format: "json",
    deliverableModes: ["pro", "premium"],
    minimumTier: "pro",
    prompt: [
      "You are the Architect agent for Realwebwins.",
      "Design a technical architecture for the MVP built around {{pain_point}}.",
      "Respond with JSON using the shape:",
      "{",
      '  "layers": [ { "name": string, "services": [string] } ],',
      '  "integrations": [ { "name": string, "purpose": string } ],',
      '  "risks": [string]',
      "}",
      "Limit each list to at most 5 entries.",
    ].join("\n"),
  },
  {
    type: "starter-code",
    title: "Starter Code Bundle",
    format: "code-bundle",
    deliverableModes: ["premium"],
    minimumTier: "premium",
    prompt: [
      "You are the Coder agent for Realwebwins.",
      "Produce a starter project scaffold for the MVP that addresses {{pain_point}}.",
      "Output JSON with a `files` array. Each file should contain:",
      "{",
      '  "path": "src/app/page.tsx",',
      '  "language": "tsx",',
      '  "content": "/* code here */"',
      "}",
      "Include at least an entrypoint page, an API handler, and a README snippet.",
        "Keep code self-contained and runnable in a modern Next.js + TypeScript stack.",
    ].join("\n"),
  },
  {
    type: "launch-plan",
    title: "Launch & Validation Plan",
    format: "markdown",
    deliverableModes: ["core", "pro", "premium"],
    minimumTier: "free",
    prompt: [
      "You are the Strategist agent for Realwebwins.",
      "Draft a 4-week launch plan to validate the MVP for {{pain_point}}.",
      "Structure the response with weekly headings and 3 bullet points each.",
      "Highlight the validation signal expected each week.",
    ].join("\n"),
  },
];
