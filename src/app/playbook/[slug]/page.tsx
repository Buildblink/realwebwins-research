import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPlaybookBySlug } from "@/lib/playbooks/queryPlaybooks";
import { PlaybookContent } from "@/components/playbooks/PlaybookContent";
import { ToolsList } from "@/components/playbooks/ToolsList";
import { AffiliateLinks } from "@/components/playbooks/AffiliateLinks";
import { RelatedPainPoint } from "@/components/playbooks/RelatedPainPoint";
import { RelatedCase } from "@/components/playbooks/RelatedCase";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
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

export default async function PlaybookDetailPage(props: PageProps) {
  const params = await props.params;
  const playbook = await getPlaybookBySlug(params.slug);

  if (!playbook) {
    notFound();
  }

  const categoryColor = getCategoryColor(playbook.category);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      {/* Back Navigation */}
      <Link
        href="/pain-points"
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pain Point Explorer
      </Link>

      {/* Header */}
      <div className="space-y-4">
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
        <div className="flex items-start gap-3">
          <BookOpen className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
          <div>
            <h1 className="text-4xl font-bold text-slate-900 leading-tight">
              {playbook.title}
            </h1>
            {playbook.description && (
              <p className="mt-3 text-lg text-slate-600">{playbook.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Related Pain Point */}
      {playbook.related_pain && (
        <RelatedPainPoint painPoint={playbook.related_pain} />
      )}

      {/* Main Content */}
      <Card>
        <CardContent className="py-8">
          <PlaybookContent content={playbook.content} />
        </CardContent>
      </Card>

      {/* Tools Section */}
      {playbook.tools && playbook.tools.length > 0 && (
        <ToolsList tools={playbook.tools} />
      )}

      {/* Related Case Study */}
      {playbook.related_case && (
        <RelatedCase caseStudy={playbook.related_case} />
      )}

      {/* Affiliate Links */}
      {playbook.affiliate_links && playbook.affiliate_links.length > 0 && (
        <AffiliateLinks links={playbook.affiliate_links} />
      )}

      {/* CTA Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardContent className="py-8 text-center space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">
            Need Help Validating Your Solution?
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto">
            Use Realwebwins research agent to validate your idea before building. Get
            insights on market size, competition, and go-to-market strategy in minutes.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/">
              <Button size="lg">Validate Your Idea</Button>
            </Link>
            <Link href="/pain-points">
              <Button size="lg" variant="outline">
                Explore More Pain Points
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
