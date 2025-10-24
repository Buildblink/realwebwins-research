"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, Lock, CheckCircle2, X } from "lucide-react";

interface PublishModalProps {
  painPointId: string;
  workspaceTitle: string;
  painPointText: string;
  painPointCategory: string | null;
  isPublished: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PublishModal({
  painPointId,
  workspaceTitle,
  painPointText,
  painPointCategory,
  isPublished,
  onClose,
  onSuccess,
}: PublishModalProps) {
  const [title, setTitle] = useState(workspaceTitle);
  const [description, setDescription] = useState(painPointText);
  const [category, setCategory] = useState(painPointCategory ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePublish = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/workspace/${painPointId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: category.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message ?? "Failed to publish workspace");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message ?? "Publish request failed");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnpublish = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/workspace/${painPointId}/publish`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message ?? "Failed to unpublish workspace");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isPublished ? (
                <>
                  <Lock className="h-5 w-5" />
                  Manage Published Workspace
                </>
              ) : (
                <>
                  <Globe className="h-5 w-5" />
                  Publish Workspace
                </>
              )}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {success ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
              <p className="mt-4 text-lg font-semibold text-slate-900">
                {isPublished ? "Workspace unpublished!" : "Workspace published!"}
              </p>
            </div>
          ) : (
            <>
              {!isPublished && (
                <>
                  {/* Title */}
                  <div className="space-y-2">
                    <label htmlFor="title" className="text-sm font-medium">
                      Title *
                    </label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give your workspace a title"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      Description
                    </label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what this workspace is about..."
                      rows={4}
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label htmlFor="category" className="text-sm font-medium">
                      Category
                    </label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g., Marketing, Product, Growth"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Preview */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                      Preview
                    </p>
                    <h3 className="font-semibold text-slate-900">{title || "Untitled"}</h3>
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                      {description || "No description"}
                    </p>
                    {category && (
                      <Badge variant="neutral" className="mt-2">
                        {category}
                      </Badge>
                    )}
                  </div>
                </>
              )}

              {isPublished && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <p className="text-sm text-yellow-800">
                      This workspace is currently published. Unpublishing will remove it
                      from the showcase but preserve all stats.
                    </p>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                {isPublished ? (
                  <Button
                    variant="outline"
                    onClick={handleUnpublish}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Unpublishing...
                      </>
                    ) : (
                      "Unpublish"
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handlePublish}
                    disabled={isSubmitting || !title.trim()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Globe className="mr-2 h-4 w-4" />
                        Publish
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
