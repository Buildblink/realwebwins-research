'use client';

import { jsPDF } from "jspdf";
import { getSupabaseClient } from "@/lib/supabaseClient";

const REPORT_BUCKET = "reports";
const PAGE_MARGIN = 20;
const LINE_HEIGHT = 6;

interface StoredReportPayload {
  ideaDescription?: string;
  createdAt?: string;
  insights?: {
    verdict?: {
      summary?: string;
      score?: number;
      confidence?: string;
    };
    go_to_market?: string[];
  };
}

function ensureSupabaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error(
      "Supabase URL is not configured. Set NEXT_PUBLIC_SUPABASE_URL in your environment."
    );
  }
  return baseUrl;
}

function wrapText(doc: jsPDF, text: string, maxWidth = 170): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

function sanitizeFilename(source: string | undefined, fallback = "research-report"): string {
  const safeSource = source?.trim() || fallback;
  return safeSource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function getPublicReportUrl(storagePath: string): string {
  const baseUrl = ensureSupabaseUrl();
  const normalizedPath = storagePath.replace(/^\/+/, "");
  return `${baseUrl}/storage/v1/object/public/${REPORT_BUCKET}/${normalizedPath}`;
}

function addSection(doc: jsPDF, heading: string, body: string, cursor: { y: number }) {
  if (!body) {
    return;
  }

  if (cursor.y + LINE_HEIGHT * 2 > doc.internal.pageSize.getHeight() - PAGE_MARGIN) {
    doc.addPage();
    cursor.y = PAGE_MARGIN;
  }

  doc.setFont("helvetica", "bold");
  doc.text(heading, PAGE_MARGIN, cursor.y);
  cursor.y += LINE_HEIGHT;
  doc.setFont("helvetica", "normal");

  const lines = wrapText(doc, body);
  doc.text(lines, PAGE_MARGIN, cursor.y);
  cursor.y += lines.length * LINE_HEIGHT + LINE_HEIGHT / 2;
}

export async function downloadReportAsPdf(storagePath: string): Promise<void> {
  if (!storagePath) {
    throw new Error("No storage path provided for report download.");
  }

  const supabase = getSupabaseClient();
  const tried = new Set<string>();
  const candidatePaths = [
    storagePath,
    storagePath.startsWith("reports/") ? storagePath.replace(/^reports\//, "") : `reports/${storagePath}`,
  ].filter((path) => {
    if (!path) {
      return false;
    }
    if (tried.has(path)) {
      return false;
    }
    tried.add(path);
    return true;
  });

  let blob: Blob | null = null;
  let lastError: string | null = null;
  let resolvedPath = storagePath;

  for (const path of candidatePaths) {
    const { data, error } = await supabase.storage.from(REPORT_BUCKET).download(path);
    if (data) {
      blob = data;
      resolvedPath = path;
      break;
    }
    lastError = error?.message ?? "Unable to download report from storage.";
  }

  if (!blob) {
    throw new Error(lastError ?? "Unable to download report from storage.");
  }

  const textContent = await blob.text();
  let parsed: StoredReportPayload | null = null;

  try {
    parsed = JSON.parse(textContent) as StoredReportPayload;
  } catch (parseError) {
    console.error("[reportDownloader] Failed to parse report JSON", parseError);
    throw new Error("Report JSON is malformed.");
  }

  const doc = new jsPDF();
  const cursor = { y: PAGE_MARGIN };

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("RealwebWins Research Summary", PAGE_MARGIN, cursor.y);
  cursor.y += LINE_HEIGHT * 1.5;

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  const title = parsed.ideaDescription ?? "Untitled Research Idea";
  const titleLines = wrapText(doc, title);
  doc.text(titleLines, PAGE_MARGIN, cursor.y);
  cursor.y += LINE_HEIGHT * (titleLines.length + 1);

  doc.setFontSize(11);
  const summaryText =
    parsed.insights?.verdict?.summary ??
    "Summary unavailable. Refer to the full research report for detailed insights.";
  addSection(doc, "Summary", summaryText, cursor);

  const goToMarket = parsed.insights?.go_to_market ?? [];
  const nextStepsText =
    goToMarket.length > 0
      ? `• ${goToMarket.join("\n• ")}`
      : "Consult the go-to-market section in the full report for recommended next steps.";
  addSection(doc, "Next Steps", nextStepsText, cursor);

  const confidenceScore = [
    parsed.insights?.verdict?.score != null
      ? `Score: ${parsed.insights.verdict.score.toFixed(1)}/10`
      : null,
    parsed.insights?.verdict?.confidence
      ? `Confidence: ${parsed.insights.verdict.confidence}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  addSection(doc, "Confidence Score", confidenceScore || "No confidence data available.", cursor);

  const timestamp = parsed.createdAt
    ? new Date(parsed.createdAt).toLocaleString()
    : "Timestamp unavailable.";
  addSection(doc, "Generated At", timestamp, cursor);

  const footerY = doc.internal.pageSize.getHeight() - PAGE_MARGIN / 2;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120);
  doc.text(
    "Generated via RealwebWins Research",
    PAGE_MARGIN,
    footerY
  );

  const filename = `${sanitizeFilename(parsed.ideaDescription || resolvedPath)}.pdf`;
  doc.save(filename);
}
