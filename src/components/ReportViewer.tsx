'use client';

import type { HTMLAttributes } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';

type ReportViewerProps = {
  summary: string;
  nextSteps: string[];
  confidenceScore: number;
  generatedAt: string;
};

const markdownComponents: Components = {
  h2: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      {...props}
      className="text-xl font-semibold text-gray-900"
    />
  ),
  p: (props: HTMLAttributes<HTMLParagraphElement>) => (
    <p
      {...props}
      className="text-base leading-relaxed text-gray-700"
    />
  ),
  ul: (props: HTMLAttributes<HTMLUListElement>) => (
    <ul
      {...props}
      className="list-disc space-y-2 pl-5 text-base text-gray-700"
    />
  ),
  li: (props: HTMLAttributes<HTMLLIElement>) => (
    <li {...props} className="leading-relaxed" />
  ),
};

export function ReportViewer({
  summary,
  nextSteps,
  confidenceScore,
  generatedAt,
}: ReportViewerProps) {
  const formattedDate = new Date(generatedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const markdownSections = [
    '## Summary',
    summary,
    '',
    '## Next Steps',
    nextSteps.map((step) => `- ${step}`).join('\n'),
    '',
    '## Confidence Score',
    `${Math.round(confidenceScore * 100)}%`,
    '',
    '## Generated At',
    formattedDate,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
      <div className="flex flex-col gap-6">
        <ReactMarkdown components={markdownComponents}>
          {markdownSections}
        </ReactMarkdown>
      </div>
    </section>
  );
}
