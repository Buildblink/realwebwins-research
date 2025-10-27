import Mustache from "mustache";
import { GeneratedArtifact } from "@/lib/artifacts/types";

export interface TemplateInjectionOptions {
  baseContext?: Record<string, unknown>;
  partials?: Record<string, string>;
  strict?: boolean;
}

export interface TemplateInjectionResult {
  rendered: string;
  context: Record<string, unknown>;
}

export function injectArtifactsIntoTemplate(
  template: string,
  artifacts: GeneratedArtifact[],
  options: TemplateInjectionOptions = {}
): TemplateInjectionResult {
  const context = buildTemplateContext(artifacts, options.baseContext);
  try {
    const rendered = Mustache.render(template, context, options.partials);
    return { rendered, context };
  } catch (error) {
    if (options.strict) {
      throw error instanceof Error
        ? error
        : new Error(`Failed to render template: ${String(error)}`);
    }

    const fallback = fallbackRender(template, context);
    return { rendered: fallback, context };
  }
}

export function buildTemplateContext(
  artifacts: GeneratedArtifact[],
  baseContext: Record<string, unknown> = {}
): Record<string, unknown> {
  const context: Record<string, unknown> = {
    ...baseContext,
    artifactCount: artifacts.length,
    artifacts: artifacts.map((artifact) => ({
      type: artifact.type,
      key: artifactKey(artifact.type),
      title: artifact.title ?? null,
      format: artifact.format,
      summary: artifact.summary ?? null,
      metadata: artifact.metadata ?? {},
      content: artifact.content,
    })),
  };

  for (const artifact of artifacts) {
    const key = artifactKey(artifact.type);
    context[key] = artifact.content;
    context[`${key}Meta`] = {
      title: artifact.title ?? null,
      summary: artifact.summary ?? null,
      format: artifact.format,
      metadata: artifact.metadata ?? {},
    };
  }

  return context;
}

function fallbackRender(
  template: string,
  context: Record<string, unknown>
): string {
  const lines: string[] = [];
  lines.push(template);
  lines.push("\n---\n");
  lines.push(JSON.stringify(context, null, 2));
  return lines.join("\n");
}

function artifactKey(type: string): string {
  return type
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((segment, index) => {
      if (index === 0) return segment;
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join("");
}
