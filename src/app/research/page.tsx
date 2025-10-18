'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ReportViewer } from '@/components/ReportViewer';
import { ReportActions } from '@/components/ReportActions';

type ResearchResponse = {
  id?: string;
  ideaDescription?: string;
  summary: string;
  nextSteps: string[];
  confidenceScore: number;
  generatedAt: string;
};

export default function ResearchPage() {
  const [ideaDescription, setIdeaDescription] = useState('');
  const [response, setResponse] = useState<ResearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ideaDescription.trim()) {
      setError('Please enter an idea description before submitting.');
      setResponse(null);
      setSuccessMessage(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResponse(null);
    setSuccessMessage(null);

    try {
      const result = await fetch('/api/research/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaDescription }),
      });

      if (!result.ok) {
        const message = await result.text();
        throw new Error(message || `Request failed with status ${result.status}`);
      }

      const data = (await result.json()) as ResearchResponse;
      setResponse(data);
      setIdeaDescription('');
      setSuccessMessage('Research saved! You can review it in your dashboard.');
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong while submitting the idea.';
      setError(message);
      setSuccessMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
        <header className="text-center">
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Research Lab
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900">
            Turn Ideas into Actionable Insights
          </h1>
          <p className="mt-3 text-base text-gray-600">
            Describe your idea and we&apos;ll generate a research plan with next steps,
            competitor notes, and confidence scores.
          </p>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-xl backdrop-blur transition-shadow hover:shadow-2xl">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Idea Description
              <textarea
                value={ideaDescription}
                onChange={(event) => setIdeaDescription(event.target.value)}
                rows={6}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 shadow-inner transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                placeholder="Explain the problem you're solving, the audience, and any assumptions..."
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                Need inspiration? Try describing a niche startup idea or a product feature.
              </p>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Generating...
                  </span>
                ) : (
                  'Generate Research'
                )}
              </button>
            </div>
          </form>
          {error && (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}
          {isSubmitting && (
            <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-600">
              <span className="font-medium">Processing your idea...</span>
              <span className="animate-pulse text-xs">Running research checks and compiling insights.</span>
            </div>
          )}
          {successMessage && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm">
              <span className="font-medium">{successMessage}</span>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                View in Dashboard
              </Link>
            </div>
          )}
        </section>

        {response && (
          <>
            <ReportViewer
              summary={response.summary}
              nextSteps={response.nextSteps}
              confidenceScore={response.confidenceScore}
              generatedAt={response.generatedAt}
            />
            <ReportActions
              className="mt-4"
              report={{
                id: response.id,
                ideaDescription: response.ideaDescription,
                summary: response.summary,
                nextSteps: response.nextSteps,
                confidence: response.confidenceScore,
                generatedAt: response.generatedAt,
              }}
            />
          </>
        )}
      </div>
    </main>
  );
}

