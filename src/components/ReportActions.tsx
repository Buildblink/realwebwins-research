'use client';

import { useState } from 'react';

type ReportActionsProps = {
  report: {
    id?: string;
    ideaDescription?: string;
    summary: string;
    nextSteps: string[] | string;
    confidence: number;
    generatedAt: string;
  };
  className?: string;
};

const formatMarkdown = (report: ReportActionsProps['report']) => {
  const nextStepsArray = Array.isArray(report.nextSteps)
    ? report.nextSteps
    : safeParseSteps(report.nextSteps);

  const lines = [
    `# Research Report${report.ideaDescription ? `: ${report.ideaDescription}` : ''}`,
    '',
    '## Summary',
    report.summary,
    '',
    '## Next Steps',
    ...nextStepsArray.map((step) => `- ${step}`),
    '',
    '## Confidence Score',
    `${Math.round(report.confidence * 100)}%`,
    '',
    '## Generated At',
    new Date(report.generatedAt).toLocaleString(),
  ];

  return lines.join('\n');
};

const safeParseSteps = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [String(value)];
  } catch {
    return value.split('\n').filter(Boolean);
  }
};

export function ReportActions({ report, className }: ReportActionsProps) {
  const [isCopying, setIsCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const handleDownload = () => {
    const markdown = formatMarkdown(report);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date(report.generatedAt).toISOString().replace(/[:.]/g, '-');
    const fileName =
      (report.ideaDescription?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
        'research-report') + `-${timestamp}.md`;

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (isCopying) return;

    setIsCopying(true);
    const shareLink =
      typeof window !== 'undefined'
        ? report.id
          ? `${window.location.origin}/dashboard?report=${report.id}`
          : window.location.href
        : '';

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopySuccess('Link copied!');
    } catch {
      setCopySuccess('Unable to copy link');
    } finally {
      setTimeout(() => {
        setIsCopying(false);
        setCopySuccess(null);
      }, 2000);
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${className ?? ''}`}
    >
      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
      >
        Download Report
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
      >
        {copySuccess ?? (isCopying ? 'Copying...' : 'Share Link')}
      </button>
    </div>
  );
}
