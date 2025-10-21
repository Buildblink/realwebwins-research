"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VaultPublishingControlsProps {
  projectId: string;
  initialIsPublic: boolean;
  initialTags: string[];
}

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => tag.replace(/\s+/g, "-").toLowerCase());
}

export function VaultPublishingControls({
  projectId,
  initialIsPublic,
  initialTags,
}: VaultPublishingControlsProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [tagsInput, setTagsInput] = useState(initialTags.join(", "));
  const [tags, setTags] = useState(initialTags);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const hasChanges = useMemo(() => {
    const parsed = parseTags(tagsInput);
    if (parsed.length !== tags.length) return true;
    return parsed.some((tag, index) => tag !== tags[index]);
  }, [tagsInput, tags]);

  const updateProject = useCallback(
    async (update: { is_public?: boolean; tags?: string[] }) => {
      const response = await fetch(`/api/vault/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(update),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Update failed.");
      }

      return json.data as { is_public?: boolean; tags?: string[] };
    },
    [projectId]
  );

  const handleToggle = useCallback(async () => {
    const nextValue = !isPublic;
    setIsSaving(true);
    setFeedback(null);
    try {
      await updateProject({ is_public: nextValue });
      setIsPublic(nextValue);
      setFeedback(nextValue ? "Project is now public." : "Project set to private.");
    } catch (error) {
      console.error("[VaultPublishingControls] failed to toggle visibility", error);
      setFeedback(
        error instanceof Error ? error.message : "Unable to update visibility right now."
      );
    } finally {
      setIsSaving(false);
    }
  }, [isPublic, updateProject]);

  const handleSaveTags = useCallback(async () => {
    const parsed = parseTags(tagsInput);
    setIsSaving(true);
    setFeedback(null);
    try {
      const result = await updateProject({ tags: parsed });
      setTags(result.tags ?? parsed);
      setTagsInput((result.tags ?? parsed).join(", "));
      setFeedback("Tags updated.");
    } catch (error) {
      console.error("[VaultPublishingControls] failed to update tags", error);
      setFeedback(
        error instanceof Error ? error.message : "Unable to update tags right now."
      );
    } finally {
      setIsSaving(false);
    }
  }, [tagsInput, updateProject]);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold text-slate-900">
            Public Vault Visibility
          </h3>
          <p className="text-sm text-slate-600">
            Toggle this project into the public vault and curate discovery tags.
          </p>
        </div>
        <Button
          type="button"
          variant={isPublic ? "secondary" : "outline"}
          className="gap-2"
          onClick={() => void handleToggle()}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPublic ? (
            <Globe className="h-4 w-4" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          {isPublic ? "Publicly visible" : "Private"}
        </Button>
      </div>

      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Discovery Tags (comma separated)
        </label>
        <input
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="saas, youtube, nocode"
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <Badge key={tag} variant="neutral">
                {tag}
              </Badge>
            ))
          ) : (
            <span>No tags assigned yet.</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          Tags are lowercased and hyphenated automatically. Choose up to 6 focused categories.
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void handleSaveTags()}
          disabled={isSaving || !hasChanges}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save tags"}
        </Button>
      </div>

      {feedback ? (
        <div className="rounded-lg border border-secondary/40 bg-secondary/10 px-3 py-2 text-xs text-secondary">
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
