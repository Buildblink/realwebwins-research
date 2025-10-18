import { Lightbulb, Zap, ShieldCheck } from "lucide-react";
import { IdeaResearchForm } from "@/components/home/IdeaResearchForm";

const highlights = [
  {
    icon: Lightbulb,
    title: "Idea to insight",
    description:
      "Seven-step validation framework covering market, competition, pricing, and GTM in a single run.",
  },
  {
    icon: Zap,
    title: "Claude-powered",
    description:
      "Optimized prompt for Claude Sonnet 4.5 (mocked) delivering structured JSON and polished markdown.",
  },
  {
    icon: ShieldCheck,
    title: "Saved to your vault",
    description:
      "Every research run is persisted to Supabase and instantly available across dashboard and detail views.",
  },
];

export default function HomePage() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      <IdeaResearchForm />
      <aside className="space-y-6 rounded-2xl border border-foreground/10 bg-white/60 p-8 shadow-inner backdrop-blur">
        <h2 className="font-heading text-xl font-semibold text-slate-900">
          Why RealWebWins?
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Turn vague ideas into confident action plans. Research runs are scoped
          to solopreneur needs and optimized for speed, clarity, and retention.
        </p>
        <div className="space-y-5">
          {highlights.map((feature) => (
            <div key={feature.title} className="flex gap-3">
              <div className="mt-1 rounded-lg bg-primary/10 p-2 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {feature.title}
                </p>
                <p className="text-xs text-slate-500">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-gradient-to-br from-primary/10 via-secondary/10 to-secondary/5 p-5 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Build Roadmap</p>
          <ul className="mt-3 space-y-2">
            <li>- Phase 1: Research engine and vault (this build)</li>
            <li>- Phase 2: Marketing Playbook and Action Plan generators</li>
            <li>- Phase 3: Exports, Stripe subscriptions, trend tracking</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
