"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/LoadingState";
import ReportViewer from "@/components/ReportViewer";

interface ResearchResponse {
  projectId: string;
  status: string;
  score: number;
  verdict: string;
  reportMarkdown: string;
}

export function IdeaResearchForm() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ResearchResponse | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!idea.trim()) {
      setError("Please describe your idea before generating research.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const response = await fetch("/api/research/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaDescription: idea }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message ?? "Unable to generate research.");
      }

      const payload = (await response.json()) as ResearchResponse;
      setReport(payload);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        className="rounded-2xl border border-foreground/10 bg-white/90 p-8 shadow-lg"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-heading text-2xl text-slate-900">
              Validate an idea in under three minutes
            </h2>
            <p className="text-sm text-slate-600">
              Claude runs the RealWebWins seven-step validation playbook and
              saves the results to your vault.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label
              htmlFor="idea"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Business idea
            </label>
            <Textarea
              id="idea"
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              placeholder="Example: AI copilot that rewrites SaaS onboarding emails into high-converting in-app tooltips."
              minLength={10}
              className="mt-2"
              required
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Claude analyzes market size, competition, monetization, and gives
              you a go or no-go verdict with a confidence score.
            </p>
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Generating..." : "Generate Research"}
            </Button>
          </div>
        </form>
      </motion.div>

      {loading && <LoadingState />}

      {error && (
        <motion.div
          className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">Generation failed</p>
            <p className="text-xs text-danger/80">
              {error} - try again or tweak the idea description.
            </p>
          </div>
        </motion.div>
      )}

      {report && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-foreground/10 bg-foreground/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/60">
                Verdict
              </p>
              <p className="font-heading text-2xl font-semibold text-foreground">
                {(report.verdict ?? "pending").replace("_", " ").toUpperCase()} -{" "}
                <span className="text-primary">
                  {Number.isFinite(report.score)
                    ? `${report.score.toFixed(1)}/10`
                    : "--/10"}
                </span>
              </p>
            </div>
            <Button asChild variant="secondary">
              <a href={`/project/${report.projectId ?? ""}`}>Open in vault</a>
            </Button>
          </div>
          <ReportViewer markdown={report.reportMarkdown} />
        </section>
      )}
    </div>
  );
}
