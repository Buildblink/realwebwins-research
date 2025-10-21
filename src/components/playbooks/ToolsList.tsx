import { ExternalLink, Wrench } from "lucide-react";
import type { PlaybookTool } from "@/types/playbook";

interface ToolsListProps {
  tools: PlaybookTool[];
}

export function ToolsList({ tools }: ToolsListProps) {
  if (tools.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-slate-900">Recommended Tools</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {tools.map((tool, index) => (
          <div
            key={index}
            className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-primary/50 hover:bg-primary/5"
          >
            <div className="flex-1">
              <div className="font-medium text-slate-900">{tool.name}</div>
              {tool.description && (
                <p className="text-xs text-slate-600 mt-1">{tool.description}</p>
              )}
            </div>
            {tool.link && (
              <a
                href={tool.link}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-primary hover:text-primary/80 transition"
                aria-label={`Visit ${tool.name}`}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
