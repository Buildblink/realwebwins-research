import ReactMarkdown from "react-markdown";

interface PlaybookContentProps {
  content: string | null;
}

export function PlaybookContent({ content }: PlaybookContentProps) {
  if (!content) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
        No content available for this playbook yet.
      </div>
    );
  }

  return (
    <div className="prose prose-slate max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-3xl font-bold text-slate-900 mt-8 mb-4" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-2xl font-bold text-slate-900 mt-6 mb-3" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-xl font-semibold text-slate-900 mt-4 mb-2" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="text-base text-slate-700 leading-relaxed my-4" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="list-disc list-inside space-y-2 my-4 text-slate-700" {...props} />
          ),
          ol: ({ ...props}) => (
            <ol className="list-decimal list-inside space-y-2 my-4 text-slate-700" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="ml-4" {...props} />
          ),
          a: ({ ...props }) => (
            <a
              className="text-primary hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-primary/30 bg-primary/5 pl-4 py-2 my-4 italic text-slate-700"
              {...props}
            />
          ),
          code: ({ ...props }) => (
            <code
              className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
