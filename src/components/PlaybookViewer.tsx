import ReactMarkdown from "react-markdown";

interface PlaybookViewerProps {
  markdown: string;
}

export default function PlaybookViewer({ markdown }: PlaybookViewerProps) {
  if (!markdown || markdown.trim().length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-white/80 p-6 shadow-inner">
      <h3 className="font-heading text-xl font-semibold text-slate-900">
        Marketing Playbook
      </h3>
      <div className="prose prose-slate mt-4 max-w-none text-sm leading-relaxed">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
