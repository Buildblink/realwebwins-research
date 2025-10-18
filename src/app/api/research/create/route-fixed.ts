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

<<<<<<< HEAD
    const insights = await generateResearchInsights(ideaDescription);
    const reportMarkdown = formatResearchMarkdown(ideaDescription, insights);

    const supabase = getSupabaseAdminClient();
=======
    // Mock research output; replace with Claude integration when ready.
    const fakeReport = `## 🎯 VERDICT: STRONG GO
**Score:** 8.2/10

**Summary:** Promising idea validated with good market demand.`;

>>>>>>> 7d59a1aebc0629027f180ce2296c2576756d01a5
    const { data, error } = await supabase
      .from("research_projects")
      .insert([
        {
<<<<<<< HEAD
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
=======
          title: ideaDescription.slice(0, 60),
          idea_description: ideaDescription,
          score: 8.2,
          verdict: "strong_go",
          confidence: "high",
          research_report: fakeReport,
        },
      ])
      .select()
      .single();

    if (error) throw error;
>>>>>>> 7d59a1aebc0629027f180ce2296c2576756d01a5

    return NextResponse.json({
      projectId: data.id,
      status: "completed",
<<<<<<< HEAD
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
=======
      report: fakeReport,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "GENERATION_FAILED", message: err.message },
>>>>>>> 7d59a1aebc0629027f180ce2296c2576756d01a5
      { status: 500 }
    );
  }
}
