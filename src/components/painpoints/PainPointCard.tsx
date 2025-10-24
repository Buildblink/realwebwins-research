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
  Marketing: "bg-blue-100 text-blue-700 border-blue-200",
  Monetization: "bg-green-100 text-green-700 border-green-200",
  Motivation: "bg-purple-100 text-purple-700 border-purple-200",
  Product: "bg-orange-100 text-orange-700 border-orange-200",
  Growth: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Pricing: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Technical: "bg-gray-100 text-gray-700 border-gray-200",
};

function getCategoryColor(category: string | null): string {
  if (!category) return "bg-gray-100 text-gray-700 border-gray-200";
  return CATEGORY_COLORS[category] || "bg-gray-100 text-gray-700 border-gray-200";
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
                  className="bg-green-100 text-green-800 border-green-300 border flex items-center gap-1"
                >
                  <BookOpen className="h-3 w-3" />
                  Playbook Available
                </Badge>
              )}
              {painPoint.audience === "consumer" && (
                <Badge
                  variant="neutral"
                  className="bg-emerald-100 text-emerald-800 border-emerald-200 border"
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
                <Badge variant="neutral" className="border-slate-200">
                  {painPoint.niche}
                </Badge>
              )}
            </div>
            {painPoint.frequency && painPoint.frequency > 1 && (
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                {painPoint.frequency}x reported
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-base font-medium text-slate-900 leading-relaxed group-hover:text-primary transition-colors">
            {painPoint.text}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              {painPoint.source && (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">
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
