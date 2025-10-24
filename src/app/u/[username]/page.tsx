"use client";

import { use } from "react";
import Link from "next/link";
import { usePublicProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
  Layers,
  Eye,
  Copy,
} from "lucide-react";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default function PublicProfilePage({ params }: PageProps) {
  const { username } = use(params);
  const { data, isLoading, error } = usePublicProfile(username);

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-6xl items-center justify-center px-6 py-12">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-sm text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-6xl items-center justify-center px-6 py-12">
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="flex items-center gap-3 py-8">
            <AlertCircle className="h-6 w-6 text-rose-600" />
            <div>
              <h3 className="font-semibold text-rose-900">Profile not found</h3>
              <p className="text-sm text-rose-700">{error}</p>
              <Link href="/pain-points">
                <Button variant="outline" size="sm" className="mt-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Pain Points
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { profile, workspaces, stats } = data;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-12">
      {/* Back navigation */}
      <Link
        href="/pain-points"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pain Points
      </Link>

      {/* Profile Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-6">
          {/* Avatar */}
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="h-24 w-24 rounded-full border-4 border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-200 bg-primary/10 text-3xl font-bold text-primary">
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Info */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              @{profile.username}
            </h1>
            {profile.bio && (
              <p className="mt-2 max-w-2xl text-slate-600">{profile.bio}</p>
            )}

            {/* Links */}
            {profile.links && profile.links.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.links.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {link.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">
              {stats.total_published}
            </p>
            <p className="text-xs text-slate-500">Published</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.total_views}</p>
            <p className="text-xs text-slate-500">Views</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">
              {stats.total_remixes}
            </p>
            <p className="text-xs text-slate-500">Remixes</p>
          </div>
        </div>
      </div>

      {/* Published Workspaces */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Published Workspaces</h2>

        {workspaces.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-sm text-slate-600">
                No published workspaces yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={`/workspace/${workspace.workspaces?.pain_point_id ?? workspace.workspace_id}`}
              >
                <Card className="group h-full transition-all hover:shadow-lg hover:border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {workspace.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {workspace.description && (
                      <p className="text-sm text-slate-600 line-clamp-3">
                        {workspace.description}
                      </p>
                    )}

                    {/* Pain Point Info */}
                    {workspace.workspaces?.pain_points && (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500 line-clamp-2">
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
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {workspace.views ?? 0} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Copy className="h-3 w-3" />
                        {workspace.remix_count ?? 0} remixes
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
