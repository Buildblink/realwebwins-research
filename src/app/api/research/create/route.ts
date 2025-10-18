import { NextResponse } from "next/server";
import { generateResearchInsights } from "@/lib/anthropicClient";
import { formatResearchMarkdown } from "@/lib/researchFormatter";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { ResearchGeneratedData } from "@/types/research";

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

    const insights = await generateResearchInsights(ideaDescription);
    const reportMarkdown = formatResearchMarkdown(ideaDescription, insights);

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
          research_json: insights as ResearchGeneratedData,
          research_report: reportMarkdown,
        },
      ])
      .select("*")
      .single();

    if (error) {
      throw error;
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

