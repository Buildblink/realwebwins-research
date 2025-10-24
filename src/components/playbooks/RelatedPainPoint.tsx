import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RelatedPainPointProps {
  painPoint: {
    id: string;
    text: string;
    category: string | null;
    niche: string | null;
  };
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

export function RelatedPainPoint({ painPoint }: RelatedPainPointProps) {
  const categoryColor = getCategoryColor(painPoint.category);

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 mb-2">Problem This Solves</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {painPoint.category && (
              <Badge variant="neutral" className={`${categoryColor} border text-xs`}>
                {painPoint.category}
              </Badge>
            )}
            {painPoint.niche && (
              <Badge variant="neutral" className="border-slate-200 text-xs">
                {painPoint.niche}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-700 font-medium mb-3">
            &ldquo;{painPoint.text}&rdquo;
          </p>
          <Link href={`/pain-points/${painPoint.id}`}>
            <Button variant="outline" size="sm">
              View Full Pain Point
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
