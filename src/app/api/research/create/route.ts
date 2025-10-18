import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { ideaDescription } = await req.json();

    if (!ideaDescription || ideaDescription.length < 5) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Idea description too short" },
        { status: 400 }
      );
    }

    // Mock research output; replace with Claude integration when ready.
    const fakeReport = `## 🎯 VERDICT: STRONG GO
**Score:** 8.2/10

**Summary:** Promising idea validated with good market demand.`;

    const { data, error } = await supabase
      .from("research_projects")
      .insert([
        {
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

    return NextResponse.json({
      projectId: data.id,
      status: "completed",
      report: fakeReport,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "GENERATION_FAILED", message: err.message },
      { status: 500 }
    );
  }
}
