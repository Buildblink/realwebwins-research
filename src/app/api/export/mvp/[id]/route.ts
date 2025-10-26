import JSZip from "jszip";
import { NextResponse } from "next/server";
import { getMVPOutput } from "@/lib/mvp/outputs";
import { getAgentSession } from "@/lib/agents/sessions";

function buildMarkdown(output: { title: string | null; summary: string | null; stack: string | null; pricing: string | null; risk: string | null; validation_score: number | null }) {
  return [
    `# ${output.title ?? "MVP Blueprint"}`,
    "",
    "## Summary",
    output.summary ?? "No summary available.",
    "",
    "## Recommended Stack",
    output.stack ?? "Not specified",
    "",
    "## Pricing Strategy",
    output.pricing ?? "Not specified",
    "",
    "## Key Risks",
    output.risk ?? "Not specified",
    "",
    `Validation Score: ${(output.validation_score ?? 0) * 100}%`,
    "",
  ].join("\n");
}

function buildValidationPdfPlaceholder(outputTitle: string | null) {
  return [
    "Realwebwins MVP Validation Report",
    "--------------------------------",
    `Title: ${outputTitle ?? "Untitled MVP"}`,
    "",
    "This placeholder PDF indicates where the formatted validation report will be generated.",
    "For Phase 33, raw text is provided to unblock downstream testing.",
  ].join("\n");
}

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  try {
    const output = await getMVPOutput(id);
    if (!output) {
      return NextResponse.json(
        { success: false, error: "MVP_NOT_FOUND", message: "MVP output not found." },
        { status: 404 }
      );
    }

    const session = await getAgentSession(output.session_id);
    const zip = new JSZip();

    zip.file("MVP.md", buildMarkdown(output));
    zip.file("validation.pdf", buildValidationPdfPlaceholder(output.title));
    zip.file(
      "conversation.json",
      JSON.stringify(
        {
          session_id: session.id,
          status: session.status,
          transcript: session.transcript,
        },
        null,
        2
      )
    );

    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="mvp-${output.id}.zip"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[export.mvp]", message);
    return NextResponse.json(
      { success: false, error: "EXPORT_FAILED", message },
      { status: 500 }
    );
  }
}
