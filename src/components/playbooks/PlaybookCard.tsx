import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Playbook } from "@/types/playbook";

interface PlaybookCardProps {
  playbook: Playbook;
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

export function PlaybookCard({ playbook }: PlaybookCardProps) {
  const categoryColor = getCategoryColor(playbook.category);

  return (
    <Card className="group h-full transition-all duration-200 hover:shadow-lg hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap gap-2">
          {playbook.category && (
            <Badge variant="outline" className={`${categoryColor} border`}>
              {playbook.category}
            </Badge>
          )}
          {playbook.niche && (
            <Badge variant="outline" className="border-slate-200">
              {playbook.niche}
            </Badge>
          )}
        </div>
        <CardTitle className="mt-3 text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
          {playbook.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {playbook.description && (
          <p className="text-sm text-slate-600 line-clamp-3">
            {playbook.description}
          </p>
        )}
        <Link href={`/playbook/${playbook.slug}`}>
          <Button variant="default" size="sm" className="w-full">
            View Playbook →
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
