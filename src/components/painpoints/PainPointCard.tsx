"use client";

import Link from "next/link";
import { ExternalLink, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { PainPoint } from "@/types/painpoint";

interface PainPointCardProps {
  painPoint: PainPoint;
}

const CATEGORY_COLORS: Record<string, string> = {
  Marketing: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  Monetization: "bg-green-500/20 text-green-400 border-green-500/40",
  Motivation: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  Product: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  Growth: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  Pricing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  Technical: "bg-gray-500/20 text-gray-400 border-gray-500/40",
};

function getCategoryColor(category: string | null): string {
  if (!category) return "bg-gray-500/20 text-gray-400 border-gray-500/40";
  return CATEGORY_COLORS[category] || "bg-gray-500/20 text-gray-400 border-gray-500/40";
}

export function PainPointCard({ painPoint }: PainPointCardProps) {
  const categoryColor = getCategoryColor(painPoint.category);
  const slug = painPoint.id;

  return (
    <Link href={`/workspace/${painPoint.id}`}>
      <Card className="group h-full transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {painPoint.related_playbook && (
                <Badge
                  variant="neutral"
                  className="bg-green-500/20 text-green-400 border-green-500/40 border flex items-center gap-1"
                >
                  <BookOpen className="h-3 w-3" />
                  Playbook Available
                </Badge>
              )}
              {painPoint.audience === "consumer" && (
                <Badge
                  variant="neutral"
                  className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 border"
                >
                  Consumer Problem
                </Badge>
              )}
              {painPoint.category && (
                <Badge
                  variant="neutral"
                  className={`${categoryColor} border`}
                >
                  {painPoint.category}
                </Badge>
              )}
              {painPoint.niche && (
                <Badge variant="neutral" className="border-zinc-500/40 bg-zinc-500/20 text-zinc-400">
                  {painPoint.niche}
                </Badge>
              )}
            </div>
            {painPoint.frequency && painPoint.frequency > 1 && (
              <span className="text-xs font-medium text-zinc-400 whitespace-nowrap">
                {painPoint.frequency}x reported
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-base font-medium text-zinc-200 leading-relaxed group-hover:text-primary transition-colors">
            {painPoint.text}
          </p>
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              {painPoint.source && (
                <span className="rounded-full bg-[#111113] px-2 py-1 text-xs font-medium">
                  {painPoint.source}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {painPoint.proof_link && (
                <span className="flex items-center gap-1 text-primary hover:underline">
                  Proof <ExternalLink className="h-3 w-3" />
                </span>
              )}
              {painPoint.related_playbook && (
                <span className="text-secondary font-semibold">
                  → Playbook
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
