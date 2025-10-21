import { generateAIResponse } from "@/lib/aiProvider";
import type { ResearchGeneratedData } from "@/types/research";

interface GenerateActionPlanOptions {
  idea: string;
  research: ResearchGeneratedData;
}

function resolveProvider(): string {
  return (process.env.AI_PROVIDER ?? "local").toLowerCase();
}

function stripCodeFences(payload: string): string {
  const trimmed = payload.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```markdown/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();
  }
  return trimmed;
}

function generateFallbackPlan(options: GenerateActionPlanOptions): string {
  const { idea, research } = options;
  const verdictLabel = research.verdict?.label
    ? research.verdict.label.replace(/_/g, " ")
    : "opportunity";
  const marketSummary = research.market_size
    ? `${research.market_size.tam} market with ${research.market_size.growth} growth`
    : "underserved market";
  const topCompetitor =
    Array.isArray(research.competition) && research.competition.length > 0
      ? research.competition[0]
      : null;
  const topPainPoint = Array.isArray(research.pain_points)
    ? research.pain_points[0]
    : "Validate primary pain point with target users";
  const goToMarket = Array.isArray(research.go_to_market)
    ? research.go_to_market.slice(0, 2)
    : [];
  const channels = research.monetization?.channels ?? ["Targeted outreach"];

  const dayPlans = [
    {
      title: "Day 1 – Kickoff & Alignment",
      tasks: [
        `Summarize the core idea: **${idea.slice(0, 120)}** and the verdict (${verdictLabel}).`,
        `Define success criteria and KPIs for the next 7 days based on ${marketSummary}.`,
        "Block time with stakeholders or schedule a solo planning session to commit to the cadence.",
      ],
    },
    {
      title: "Day 2 – Customer Discovery",
      tasks: [
        `Draft a short interview script around: "${topPainPoint}".`,
        `Schedule 5 conversations with potential users via ${channels[0]}.`,
        "Prepare a lightweight intake form to capture recurring objections and insights.",
      ],
    },
    {
      title: "Day 3 – Problem Validation",
      tasks: [
        "Run the first batch of discovery calls or async surveys and log qualitative notes.",
        "Synthesize patterns into a lean problem statement doc.",
        "Share findings with an accountability partner or community for quick feedback.",
      ],
    },
    {
      title: "Day 4 – Solution Sketch",
      tasks: [
        topCompetitor
          ? `Map ${topCompetitor.name}'s strengths vs. your differentiators (${topCompetitor.differentiator ?? "N/A"}).`
          : "List the top 3 alternatives users reference and score them on fit.",
        "Draft a one-page product concept or landing page outline leveraging validated pain points.",
        "Collect async feedback from at least 3 prospects on the proposed value proposition.",
      ],
    },
    {
      title: "Day 5 – Build Signals",
      tasks: [
        "Create a simple waitlist or pre-order page (no-code or within existing site).",
        "Publish a teaser post highlighting quantified benefits and invite early access.",
        "Track sign-ups, replies, or intent metrics in a spreadsheet dashboard.",
      ],
    },
    {
      title: "Day 6 – Go-To-Market Push",
      tasks: [
        goToMarket[0]
          ? `Execute GTM experiment: ${goToMarket[0]}.`
          : "Launch a focused outreach campaign to your highest-response channel.",
        goToMarket[1]
          ? `Layer second channel: ${goToMarket[1]}.`
          : `Run paid or organic test via ${channels[0]} for additional reach.`,
        "Collect responses and categorize them by persona, urgency, and next steps.",
      ],
    },
    {
      title: "Day 7 – Decision & Next Steps",
      tasks: [
        "Review key metrics (interviews, conversions, waitlist size) against the KPIs from Day 1.",
        `Decide whether to double down, pivot, or pause based on evidence supporting the ${verdictLabel} verdict.`,
        "Document learnings, update backlog, and outline a 30-day roadmap if continuing.",
      ],
    },
  ];

  return [
    "# 7-Day Action Plan",
    "",
    `**Focus:** ${idea}`,
    `**Verdict:** ${verdictLabel.toUpperCase()}`,
    "",
    ...dayPlans.flatMap((day) => [
      `## ${day.title}`,
      ...day.tasks.map((task) => `- ${task}`),
      "",
    ]),
    "> Generated with RealWebWins Research data. Adjust tasks as needed for your workflow.",
  ].join("\n");
}

export async function generateActionPlanMarkdown(
  options: GenerateActionPlanOptions
): Promise<string> {
  const provider = resolveProvider();
  if (provider === "local") {
    return generateFallbackPlan(options);
  }

  const prompt = `You are RealWebWins execution strategist. Draft a 7-day launch action plan in Markdown.
- Use the research JSON and idea below.
- For each day, provide three bullet tasks under a "## Day X - Title" heading.
- Emphasize validation, GTM, and decision checkpoints.
- Respond ONLY with Markdown.`;

  try {
    const raw = await generateAIResponse(
      `${prompt}\n\nIdea: ${options.idea}\n\nResearch JSON:\n${JSON.stringify(
        options.research
      )}`,
      { model: process.env.AI_ACTION_PLAN_MODEL }
    );
    const output = stripCodeFences(raw);
    if (output.trim().length === 0) {
      throw new Error("Empty action plan response received");
    }
    return output;
  } catch (error) {
    console.warn(
      "[generateActionPlanMarkdown] AI provider failed, using fallback plan.",
      error
    );
    return generateFallbackPlan(options);
  }
}
