import type { ResearchGeneratedData } from "@/types/research";

const sectionDivider = "\n\n---\n\n";

export function formatResearchMarkdown(
  ideaDescription: string,
  data: ResearchGeneratedData
): string {
  const competitionTable = data.competition
    .map((competitor) => {
      const price = competitor.price ?? "N/A";
      const differentiator = competitor.differentiator ?? "N/A";
      return `| ${competitor.name} | ${price} | ${differentiator} |`;
    })
    .join("\n");

  const stackList = data.build_complexity.stack
    ? data.build_complexity.stack.map((item) => `- ${item}`).join("\n")
    : "- TBD";

  const goToMarket = data.go_to_market
    ?.map((item) => `- ${item}`)
    .join("\n") ?? "- TBD";

  return [
    `# Research Verdict: ${humanizeLabel(data.verdict.label)}`,
    `**Score:** ${data.verdict.score}/10 (${data.verdict.confidence} confidence)`,
    data.verdict.summary ? `> ${data.verdict.summary}` : null,
    sectionDivider.trim(),
    "## Idea Brief",
    ideaDescription,
    sectionDivider.trim(),
    "## 1. Market Size",
    `- TAM: **${data.market_size.tam}**`,
    `- Growth: **${data.market_size.growth}**`,
    sectionDivider.trim(),
    "## 2. Competition Landscape",
    `| Name | Price | Differentiator |\n| --- | --- | --- |\n${competitionTable}`,
    sectionDivider.trim(),
    "## 3. Customer Pain Points",
    data.pain_points.map((point) => `- ${point}`).join("\n"),
    sectionDivider.trim(),
    "## 4. Search Trend Analysis",
    `- Keyword: **${data.trends.keyword}**`,
    `- Trend: **${data.trends.trend}**`,
    data.trends.notes ? `- Notes: ${data.trends.notes}` : null,
    sectionDivider.trim(),
    "## 5. Monetization Assessment",
    `- Model: **${data.monetization.model}**`,
    data.monetization.price_suggestion
      ? `- Pricing Suggestion: **${data.monetization.price_suggestion}**`
      : null,
    data.monetization.channels
      ? `- Channels:\n${data.monetization.channels
          .map((channel) => `  - ${channel}`)
          .join("\n")}`
      : null,
    sectionDivider.trim(),
    "## 6. Build Complexity",
    `- Difficulty: **${data.build_complexity.difficulty}/10**`,
    `- Estimated timeline: **${data.build_complexity.weeks} weeks**`,
    `- Suggested Stack:\n${stackList}`,
    sectionDivider.trim(),
    "## 7. Go / No-Go Verdict",
    `- Verdict: **${humanizeLabel(data.verdict.label)}**`,
    `- Rationale: ${data.verdict.summary ?? "See above insights."}`,
    sectionDivider.trim(),
    "## Go-To-Market Kickstart",
    goToMarket,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function humanizeLabel(label: string): string {
  return label
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
