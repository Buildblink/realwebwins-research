import { generateAIResponse } from "@/lib/aiProvider";
import type { ResearchGeneratedData } from "@/types/research";

type Provider = "anthropic" | "openrouter" | "ollama" | "local";

function resolveProvider(): Provider {
  const value = process.env.AI_PROVIDER?.toLowerCase();
  if (value === "anthropic" || value === "openrouter" || value === "ollama") {
    return value;
  }
  return "local";
}

function sanitizeJsonPayload(payload: string): string {
  const trimmed = payload.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```json/i, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();
  }
  return trimmed;
}

function isResearchGeneratedData(value: unknown): value is ResearchGeneratedData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  if (!data.verdict || typeof data.verdict !== "object") return false;
  const verdict = data.verdict as Record<string, unknown>;
  return typeof verdict.score === "number" && typeof verdict.label === "string";
}

function generateMockInsights(ideaDescription: string): ResearchGeneratedData {
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

export async function generateResearchInsights(
  ideaDescription: string
): Promise<ResearchGeneratedData> {
  const provider = resolveProvider();
  if (provider === "local") {
    return generateMockInsights(ideaDescription);
  }

  const prompt = `You are RealWebWins research analyst. Generate a structured JSON report answering for the founder idea below.
Return ONLY valid JSON matching this TypeScript type:
{
  "verdict": { "score": number, "label": string, "confidence": "low"|"medium"|"high", "summary": string },
  "market_size": { "tam": string, "growth": string },
  "competition": Array<{ "name": string, "price"?: string, "differentiator"?: string }>,
  "pain_points": string[],
  "trends": { "keyword": string, "trend": string, "notes"?: string },
  "monetization": { "model": string, "price_suggestion"?: string, "channels"?: string[] },
  "build_complexity": { "difficulty": number, "weeks": number, "stack": string[] },
  "go_to_market": string[]
}
Idea: ${ideaDescription}`;

  try {
    const aiResponse = await generateAIResponse(prompt, {
      model: process.env.AI_RESEARCH_MODEL,
    });
    const sanitized = sanitizeJsonPayload(aiResponse);
    const parsed = JSON.parse(sanitized) as unknown;

    if (isResearchGeneratedData(parsed)) {
      return parsed;
    }

    console.warn(
      "[generateResearchInsights] AI response missing required fields, falling back to mock.",
      parsed
    );
    return generateMockInsights(ideaDescription);
  } catch (error) {
    console.warn(
      "[generateResearchInsights] AI provider failed, falling back to mock.",
      error
    );
    return generateMockInsights(ideaDescription);
  }
}
