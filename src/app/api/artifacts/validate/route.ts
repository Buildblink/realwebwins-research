import { NextResponse } from "next/server";
import { validateArtifact } from "@/lib/artifacts/validator";
import type { ArtifactValidationInput } from "@/lib/artifacts/types";

export async function POST(request: Request) {
  let payload: Partial<ArtifactValidationInput> & { content?: unknown };
  try {
    payload = (await request.json()) as ArtifactValidationInput;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_JSON",
        message: "Unable to parse request body.",
      },
      { status: 400 }
    );
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_PAYLOAD",
        message: "Request body must be a JSON object.",
      },
      { status: 400 }
    );
  }

  if (!payload.type || typeof payload.type !== "string") {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_TYPE",
        message: "Provide an artifact type string.",
      },
      { status: 400 }
    );
  }

  if (!payload.format || typeof payload.format !== "string") {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_FORMAT",
        message: "Provide an artifact format string.",
      },
      { status: 400 }
    );
  }

  const result = validateArtifact({
    type: payload.type,
    format: payload.format,
    content: payload.content ?? "",
  });

  return NextResponse.json({
    success: true,
    result,
  });
}
