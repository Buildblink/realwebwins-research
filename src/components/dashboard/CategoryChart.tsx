"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";

interface CategoryData {
  name: string;
  count: number;
}

interface CategoryChartProps {
  categories: CategoryData[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Marketing: "bg-blue-500",
  Monetization: "bg-green-500",
  Motivation: "bg-purple-500",
  Product: "bg-orange-500",
  Growth: "bg-emerald-500",
  Pricing: "bg-yellow-500",
  Technical: "bg-gray-500",
  Trust: "bg-cyan-500",
  Personalization: "bg-pink-500",
  Retention: "bg-indigo-500",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "bg-slate-500";
}

export function CategoryChart({ categories }: CategoryChartProps) {
  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Category Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No categories data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...categories.map((c) => c.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Top Categories
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map((category) => {
            const percentage = (category.count / maxCount) * 100;
            const color = getCategoryColor(category.name);

            return (
              <div key={category.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant="neutral" className="text-xs">
                    {category.name}
                  </Badge>
                  <span className="text-sm font-semibold text-slate-700">
                    {category.count}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${color} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
