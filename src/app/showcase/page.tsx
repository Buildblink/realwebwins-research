"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RemixButton } from "@/components/workspace/RemixButton";
import {
  Loader2,
  AlertCircle,
  Eye,
  Copy,
  TrendingUp,
  Clock,
  Filter,
} from "lucide-react";

interface PublicWorkspace {
  id: string;
  workspace_id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  views: number;
  remix_count: number;
  created_at: string;
  workspaces: {
    user_id: string;
    pain_point_id: string;
    pain_points: {
      text: string;
      category: string | null;
      niche: string | null;
      audience: string | null;
    };
  };
}

const CATEGORIES = [
  "All",
  "Marketing",
  "Monetization",
  "Product",
  "Growth",
  "Technical",
  "Trust",
  "Retention",
];

const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent", icon: Clock },
  { value: "popular", label: "Most Popular", icon: Eye },
  { value: "remixed", label: "Most Remixed", icon: Copy },
];

export default function ShowcasePage() {
  const [workspaces, setWorkspaces] = useState<PublicWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchWorkspaces() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          sort,
          page: page.toString(),
          pageSize: "12",
        });

        if (category !== "All") {
          params.append("category", category);
        }

        const response = await fetch(`/api/showcase?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch showcase (${response.status})`);
        }

        const result = await response.json();

        if (!result.success || !result.data) {
          throw new Error(result.message ?? "Showcase fetch failed");
        }

        setWorkspaces(result.data);
        setTotalPages(result.pagination.totalPages);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("[ShowcasePage] Failed to fetch workspaces", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkspaces();
  }, [category, sort, page]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-6 py-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-50">Workspace Showcase</h1>
        <p className="mt-2 text-zinc-400">
          Explore published workspaces from the community
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Filter className="h-4 w-4" />
            Category:
          </span>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setCategory(cat);
                setPage(1);
              }}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex gap-2">
          {SORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant={sort === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSort(option.value);
                  setPage(1);
                }}
              >
                <Icon className="mr-2 h-4 w-4" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-sm text-zinc-400">Loading showcase...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-danger/40 bg-danger/10">
          <CardContent className="flex items-center gap-3 py-8">
            <AlertCircle className="h-6 w-6 text-danger" />
            <div>
              <h3 className="font-semibold text-danger">Failed to load showcase</h3>
              <p className="text-sm text-danger/80">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workspaces Grid */}
      {!isLoading && !error && workspaces.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-zinc-400">No published workspaces found.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && workspaces.length > 0 && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <Card key={workspace.id} className="group h-full transition-all hover:shadow-lg hover:border-primary/50 flex flex-col">
                <Link href={`/workspace/${workspace.workspaces.pain_point_id}`} className="flex-1">
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {workspace.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {workspace.description && (
                      <p className="text-sm text-zinc-400 line-clamp-3">
                        {workspace.description}
                      </p>
                    )}

                    {/* Pain Point Info */}
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-400 line-clamp-2">
                        {workspace.workspaces.pain_points.text}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {workspace.workspaces.pain_points.category && (
                          <Badge variant="neutral" className="text-xs">
                            {workspace.workspaces.pain_points.category}
                          </Badge>
                        )}
                        {workspace.workspaces.pain_points.niche && (
                          <Badge variant="neutral" className="text-xs">
                            {workspace.workspaces.pain_points.niche}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {workspace.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Copy className="h-3 w-3" />
                        {workspace.remix_count} remixes
                      </span>
                    </div>
                  </CardContent>
                </Link>
                {/* Remix Button */}
                <CardContent className="pt-0">
                  <RemixButton
                    workspaceId={workspace.workspace_id}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-zinc-400">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
