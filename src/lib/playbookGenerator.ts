import { generateAIResponse } from "@/lib/aiProvider";
import type { ResearchGeneratedData } from "@/types/research";

interface MarketingPlaybookInput {
  idea: string;
  research: ResearchGeneratedData;
  actionPlan: string;
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

function formatCompetition(research: ResearchGeneratedData): string[] {
  if (!Array.isArray(research.competition) || research.competition.length === 0) {
    return ["Highlight how our approach removes manual validation overhead."];
  }

  return research.competition.slice(0, 3).map((competitor) => {
    const differentiator = competitor.differentiator
      ? ` (edge: ${competitor.differentiator})`
      : "";
    const price = competitor.price ? ` @ ${competitor.price}` : "";
    return `${competitor.name}${price}${differentiator}`;
  });
}

function formatTwitterLine(day: number, idea: string, competitionNotes: string[]): string {
  switch (day) {
    case 1:
      return `Launch thread: "Validating ${idea} in public" with a hook about your first insight.`;
    case 2:
      return `Tweet a customer pain point versus solution using a quote from interviews (tag relevant communities).`;
    case 3:
      return `Share a teardown comparing you against ${competitionNotes[0] ?? "status quo"} with a call-to-action.`;
    case 4:
      return `Post a short video summarizing how quickly builders can validate ideas using your toolkit.`;
    case 5:
      return `Promote testimonial snippets or research stats as carousel images; invite DMs for access.`;
    case 6:
      return `Run a poll asking founders which validation blocker hurts most; soft plug the signup link.`;
    case 7:
    default:
      return `Wrap-up thread: "7 days to validate ${idea}" including metrics, learnings, and next steps plus CTA.`;
  }
}

function formatVideoHook(index: number, idea: string): string {
  const hooks = [
    `"Founders waste hours validating ideas manually. Here is how ${idea} fixes that in 60 seconds."`,
    `"Three signals I track before building anything. #buildinpublic"`,
    `"What I learned comparing validation tools (and why I built ${idea})."`,
  ];
  return hooks[index] ?? hooks[hooks.length - 1];
}

function generateFallbackPlaybook(input: MarketingPlaybookInput): string {
  const { idea, research, actionPlan } = input;
  const verdictSummary =
    research.verdict?.summary ??
    `Validation shows promising traction for ${idea}.`;
  const marketNotes = research.market_size
    ? `${research.market_size.tam} TAM with ${research.market_size.growth} growth`
    : "Growing niche with underserved users";
  const competitionNotes = formatCompetition(research);
  const channels =
    research.monetization?.channels ?? ["Indie Hackers", "Newsletter swaps"];

  const days = Array.from({ length: 7 }).map((_, index) => {
    const dayNumber = index + 1;
    return {
      title: `Day ${dayNumber}`,
      twitter: formatTwitterLine(dayNumber, idea, competitionNotes),
      keyAsset:
        dayNumber === 1
          ? "Draft launch landing page copy using the strongest pain point."
          : dayNumber === 4
          ? "Record a 45-second demo reel for short-form video."
          : dayNumber === 7
          ? "Compile a week-in-review email for early adopters."
          : "Ship a daily micro asset derived from action plan tasks.",
      outreach:
        dayNumber % 2 === 0
          ? `Direct outreach to ${channels[0]} prospects with personalized snippets.`
          : `Engage ${channels[1] ?? "community groups"} threads and answer questions with insight clips.`,
    };
  });

  const landingAngles = [
    `"Validate in hours, not weeks" – focus on speed and evidence from research.`,
    `"Co-build with your first users" – promise a guided validation journey with community accountability.`,
  ];

  const launchChecklist = [
    "Embed signup CTA at the top of all threads and landing pages.",
    "Schedule daily social posts 12 hours ahead to free time for conversations.",
    "Track responses in one sheet: source, intent, next step.",
    "Send personal thank-you notes to early adopters and ask for referrals.",
  ];

  const videoHooks = [0, 1, 2].map((i) => formatVideoHook(i, idea));

  const lines: string[] = [
    "# 7-Day Marketing Playbook",
    "",
    `**Idea:** ${idea}`,
    `**Market Snapshot:** ${marketNotes}`,
    `**Verdict Recap:** ${verdictSummary}`,
    "",
    "## Competition Snapshot",
    ...competitionNotes.map((note) => `- ${note}`),
    "",
    "## Reference Action Plan",
    "```markdown",
    actionPlan.trim(),
    "```",
    "",
    "## Daily Marketing Moves",
  ];

  for (const day of days) {
    lines.push(`### ${day.title}`);
    lines.push(`- **Twitter:** ${day.twitter}`);
    lines.push(`- **Key Asset:** ${day.keyAsset}`);
    lines.push(`- **Outreach:** ${day.outreach}`);
    lines.push("");
  }

  lines.push("## Landing Page Angles");
  landingAngles.forEach((angle) => lines.push(`- ${angle}`));
  lines.push("");

  lines.push("## Short-Form Video Hooks");
  videoHooks.forEach((hook) => lines.push(`- ${hook}`));
  lines.push("");

  lines.push("## Launch Checklist");
  launchChecklist.forEach((item) => lines.push(`- ${item}`));
  lines.push("");

  lines.push(
    "> Generated with RealWebWins research + action plan context. Adapt copy for your brand voice."
  );

  return lines.join("\n");
}

export async function generateMarketingPlaybookMarkdown(
  input: MarketingPlaybookInput
): Promise<string> {
  const provider = resolveProvider();
  if (provider === "local") {
    return generateFallbackPlaybook(input);
  }

  const prompt = `You are RealWebWins marketing strategist. Generate a 7-day GTM playbook in Markdown.
- Use the research JSON, idea, and supporting action plan below.
- Include sections: competition snapshot, daily marketing moves (with bullet points),
  landing page angles, short-form video hooks, and launch checklist.
- Keep references actionable and specific.
- Respond ONLY with Markdown.`;

  try {
    const raw = await generateAIResponse(
      `${prompt}\n\nIdea: ${input.idea}\n\nResearch JSON:\n${JSON.stringify(
        input.research
      )}\n\nAction Plan:\n${input.actionPlan}`,
      { model: process.env.AI_PLAYBOOK_MODEL }
    );
    const output = stripCodeFences(raw);
    if (output.trim().length === 0) {
      throw new Error("Empty playbook response received");
    }
    return output;
  } catch (error) {
    console.warn(
      "[generateMarketingPlaybookMarkdown] AI provider failed, using fallback playbook.",
      error
    );
    return generateFallbackPlaybook(input);
  }
}
