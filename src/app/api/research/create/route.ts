import { NextResponse } from "next/server";
import { researchAgent } from "@/lib/researchAgent";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface ResearchCreatePayload {
  ideaDescription?: string;
  userId?: string | null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ResearchCreatePayload;
    const ideaDescription = body?.ideaDescription?.trim();
    const userId = body?.userId ?? null;

    if (!ideaDescription || ideaDescription.length < 10) {
      return NextResponse.json(
        {
          error: "INVALID_INPUT",
          message: "Idea description must be at least 10 characters long.",
        },
        { status: 400 }
      );
    }

    const { insights, reportMarkdown, completedAt } = await researchAgent({
      idea: ideaDescription,
    });

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("research_projects")
      .insert([
        {
          user_id: userId,
          title: ideaDescription.slice(0, 80),
          idea_description: ideaDescription,
          score: insights.verdict.score,
          verdict: insights.verdict.label,
          confidence: insights.verdict.confidence,
          research_report: reportMarkdown,
          research_json: insights,
        },
      ])
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const storagePayload = {
      projectId: data.id,
      userId,
      ideaDescription,
      insights,
      reportMarkdown,
      createdAt: completedAt,
    };

    const storagePath = `reports/${data.id}.json`;
    const { error: storageError } = await supabase.storage
      .from("reports")
      .upload(storagePath, Buffer.from(JSON.stringify(storagePayload, null, 2)), {
        contentType: "application/json",
        upsert: true,
      });

    if (storageError) {
      console.error("[research.create] failed to upload report", storageError);
    }

    return NextResponse.json({
      projectId: data.id,
      status: "completed",
      score: insights.verdict.score,
      verdict: insights.verdict.label,
      reportMarkdown,
    });
  } catch (error) {
    console.error("[research.create] error", error);
    const message =
      error instanceof Error ? error.message : "Unable to generate research";
    return NextResponse.json(
      { error: "GENERATION_FAILED", message },
      { status: 500 }
    );
  }
}

