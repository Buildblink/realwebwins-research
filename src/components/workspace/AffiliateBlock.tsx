"use client";

import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AffiliateTool } from "@/lib/workspace/affiliate";

interface AffiliateBlockProps {
  tools: AffiliateTool[];
  workspaceId?: string;
  playbookSlug?: string;
  className?: string;
}

export function AffiliateBlock({
  tools,
  workspaceId,
  playbookSlug,
  className = "",
}: AffiliateBlockProps) {
  if (!tools || tools.length === 0) return null;

  const handleToolClick = (tool: AffiliateTool) => {
    // Track click
    const trackingUrl = `/api/affiliate?${new URLSearchParams({
      ...(workspaceId && { workspaceId }),
      ...(playbookSlug && { playbook: playbookSlug }),
      tool: tool.toolName,
      url: tool.url,
    }).toString()}`;

    // Open in new tab
    window.open(trackingUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-900">
          🔧 Recommended Tools
        </h3>
        <Badge variant="neutral" className="text-xs">
          {tools.length} tool{tools.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {tools.map((tool, index) => (
          <Card
            key={`${tool.url}-${index}`}
            className="group hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleToolClick(tool)}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-slate-900 group-hover:text-primary transition-colors">
                  {tool.toolName}
                </h4>
                <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors flex-shrink-0" />
              </div>

              {tool.description && (
                <p className="text-sm text-slate-600 line-clamp-2">
                  {tool.description}
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {tool.badge && (
                  <Badge variant="neutral" className="text-xs">
                    {tool.badge}
                  </Badge>
                )}
                {tool.price && (
                  <Badge variant="neutral" className="text-xs bg-green-50 text-green-700 border-green-200">
                    {tool.price}
                  </Badge>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToolClick(tool);
                }}
              >
                Try {tool.toolName} →
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-slate-500 italic">
        These are recommended tools that may help with this pain point. Links may be affiliated.
      </p>
    </div>
  );
}
