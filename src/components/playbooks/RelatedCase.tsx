import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RelatedCaseProps {
  caseStudy: {
    id: string;
    title: string | null;
    idea_description: string | null;
    score: number | null;
  };
}

export function RelatedCase({ caseStudy }: RelatedCaseProps) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
      <div className="flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 mb-2">Real Success Story</h3>
          <p className="text-base font-medium text-slate-800 mb-2">
            {caseStudy.title || "Case Study"}
          </p>
          {caseStudy.idea_description && (
            <p className="text-sm text-slate-600 mb-3 line-clamp-2">
              {caseStudy.idea_description}
            </p>
          )}
          {caseStudy.score !== null && (
            <div className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 mb-3">
              Score: {caseStudy.score}/100
            </div>
          )}
          <div className="mt-3">
            <Link href={`/project/${caseStudy.id}`}>
              <Button variant="outline" size="sm">
                View Case Study
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
