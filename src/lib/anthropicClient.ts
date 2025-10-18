import type { ResearchGeneratedData } from "@/types/research";

/**
 * Mocked Claude API integration. Replace with a real Anthropic client once API access is available.
 */
export async function generateResearchInsights(
  ideaDescription: string
): Promise<ResearchGeneratedData> {
  const normalizedIdea = ideaDescription.trim();
  const lengthFactor = Math.min(normalizedIdea.length / 100, 1);

  const score = Number((7.2 + lengthFactor * 2).toFixed(1));
  const confidence = score > 8 ? "high" : score > 7 ? "medium" : "low";
  const label =
    score >= 8.5
      ? "strong_go"
      : score >= 7.5
      ? "go"
      : score >= 6.5
      ? "neutral"
      : "risky";

  return {
    verdict: {
      score,
      label,
      confidence,
      summary: `Overall potential looks ${label.replace(
        "_",
        " "
      )}; ensure clear differentiation before launch.`,
    },
    market_size: {
      tam: "$2.1B",
      growth: "+45% YoY",
    },
    competition: [
      {
        name: "Competitor A",
        price: "$29/mo",
        differentiator: "Strong content templates",
      },
      {
        name: "Competitor B",
        price: "$49/mo",
        differentiator: "Deeper integrations",
      },
    ],
    pain_points: [
      "Founders spend hours validating ideas manually",
      "Fragmented data sources create uncertainty",
      "Difficult to benchmark pricing and differentiation quickly",
    ],
    trends: {
      keyword: normalizedIdea
        ? normalizedIdea.split(" ").slice(0, 3).join(" ")
        : "ai startup validation",
      trend: "+40% YoY",
      notes: "Spike in indie hacker interest across Reddit and X",
    },
    monetization: {
      model: "SaaS subscription",
      price_suggestion: "$29 - $79/mo",
      channels: ["Indie Hacker communities", "Targeted LinkedIn outreach"],
    },
    build_complexity: {
      difficulty: 5,
      weeks: 4,
      stack: ["Next.js", "Supabase", "Claude API"],
    },
    go_to_market: [
      "Ship landing page pre-launch to collect waitlist emails",
      "Publish teardown threads comparing verdicts versus competitors",
      "Offer concierge research for first ten paying users",
    ],
  };
}
