import type { WorkspaceSnapshot } from "@/lib/workspace/service";

export interface NormalizedDeliverableSection {
  id: string;
  label: string;
  content: string;
}

export interface NormalizedDeliverableBundle {
  title: string;
  description: string;
  category: string;
  audience: string;
  source: string;
  relatedPlaybook: string;
  generatedAt: string;
  sections: NormalizedDeliverableSection[];
  slug: string;
}

type DeliverablesApiPayload = {
  message?: string;
  painPointId?: string;
  snapshot?: WorkspaceSnapshot;
  pain_point?: WorkspaceSnapshot["painPoint"];
  workspace_outputs?: Array<{ section?: string; content?: string }>;
};

const DEFAULT_SECTION_LABELS: Record<string, string> = {
  understand: "Understand",
  ideate: "Ideate",
  build: "Build",
  validate: "Validate",
};

export function normalizeDeliverable(
  data: DeliverablesApiPayload | null | undefined,
  fallbackTitle?: string
): NormalizedDeliverableBundle {
  const snapshot = data?.snapshot;
  const painPoint =
    snapshot?.painPoint ??
    data?.pain_point ??
    ({
      text: fallbackTitle,
    } as WorkspaceSnapshot["painPoint"]);
  const workspace = snapshot?.workspace;
  const sectionsMeta: WorkspaceSnapshot["sections"] = Array.isArray(
    snapshot?.sections
  )
    ? snapshot!.sections
    : [];
  const outputs: WorkspaceSnapshot["outputs"] =
    snapshot?.outputs ?? ({} as WorkspaceSnapshot["outputs"]);

  const title =
    workspace?.title?.trim() ||
    painPoint?.text?.trim() ||
    fallbackTitle?.trim() ||
    "Untitled Workspace";

  const description =
    painPoint?.text?.trim() || "No pain point description provided.";

  const sections: NormalizedDeliverableSection[] = sectionsMeta.map((section) => {
    const id = section.id ?? "unknown";
    const output = outputs[id as keyof typeof outputs] as
      | { content_md?: string | null; content?: string | null }
      | undefined;
    const contentMd =
      (output?.content_md ?? output?.content ?? "").toString().trim();
    return {
      id,
      label: section.label ?? DEFAULT_SECTION_LABELS[id] ?? id.toUpperCase(),
      content: toPlainText(contentMd) || "No content available yet.",
    };
  });

  if (sections.length === 0 && Array.isArray(data?.workspace_outputs)) {
    for (const item of data?.workspace_outputs ?? []) {
      const id = (item.section ?? "unknown").toLowerCase();
      sections.push({
        id,
        label: DEFAULT_SECTION_LABELS[id] ?? id.toUpperCase(),
        content: toPlainText(item.content ?? "") || "No content available yet.",
      });
    }
  }

  const generatedAt = new Date().toISOString();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";

  return {
    title,
    description,
    category: painPoint?.category?.trim() || "Uncategorized",
    audience: painPoint?.audience?.trim() || "Unknown",
    source: painPoint?.source?.trim() || "N/A",
    relatedPlaybook: painPoint?.related_playbook?.trim() || "N/A",
    generatedAt,
    sections,
    slug,
  };
}

export async function renderWorkspacePdf(
  bundle: NormalizedDeliverableBundle
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
    putOnlyUsedFonts: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const marginTop = 80;
  const marginBottom = 60;
  const maxWidth = pageWidth - marginX * 2;

  let cursorY = marginTop;

  const ensureSpace = (height: number) => {
    if (cursorY + height > pageHeight - marginBottom) {
      doc.addPage();
      drawHeader();
      cursorY = marginTop;
    }
  };

  const writeParagraph = (text: string, leading = 16) => {
    if (!text) return;
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      ensureSpace(leading);
      doc.text(line, marginX, cursorY);
      cursorY += leading;
    });
  };

  const drawHeader = () => {
    doc.setFillColor(14, 14, 16);
    doc.rect(0, 0, pageWidth, 56, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(240, 240, 244);
    doc.text("Realwebwins - Workspace Export", marginX, 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(new Date(bundle.generatedAt).toLocaleString(), pageWidth - marginX - 10, 28, {
      align: "right",
    });
    doc.setTextColor(20, 20, 22);
  };

  drawHeader();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  writeParagraph(bundle.title, 24);
  cursorY += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  writeParagraph(`Category: ${bundle.category}`);
  writeParagraph(`Audience: ${bundle.audience}`);
  writeParagraph(`Source: ${bundle.source}`);
  writeParagraph(`Related Playbook: ${bundle.relatedPlaybook}`);

  cursorY += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  writeParagraph("Pain Point", 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  writeParagraph(bundle.description);

  for (const section of bundle.sections) {
    cursorY += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    writeParagraph(section.label.toUpperCase(), 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    writeParagraph(section.content);
  }

  const safeFileName = `${bundle.slug}-bundle.pdf`;
  doc.save(safeFileName);
}

function toPlainText(markdown: string): string {
  return markdown
    .replace(/```([\s\S]*?)```/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^>+\s?/gm, "")
    .replace(/#+\s?(.*)/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1 ($2)")
    .replace(/!\[(.*?)\]\((.*?)\)/g, "$1 ($2)")
    .replace(/-\s+/g, "- ")
    .replace(/\r?\n\s*\r?\n/g, "\n\n")
    .trim();
}



