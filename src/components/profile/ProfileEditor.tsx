"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Loader2 } from "lucide-react";
import { Profile } from "@/hooks/useProfile";

interface ProfileEditorProps {
  profile: Profile | null;
  onSave: (data: {
    username: string;
    bio?: string;
    avatar_url?: string;
    links?: Array<{ label: string; url: string }>;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function ProfileEditor({ profile, onSave, isLoading }: ProfileEditorProps) {
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [links, setLinks] = useState<Array<{ label: string; url: string }>>(
    profile?.links ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const addLink = () => {
    setLinks([...links, { label: "", url: "" }]);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const updateLink = (
    index: number,
    field: "label" | "url",
    value: string
  ) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      await onSave({
        username: username.trim(),
        bio: bio.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
        links: links.filter((link) => link.label && link.url),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {profile ? "Edit Profile" : "Create Your Profile"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Username *
            </label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-username"
              required
              disabled={isSaving || isLoading}
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">
              3-30 characters. Letters, numbers, dashes, and underscores only.
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label htmlFor="bio" className="text-sm font-medium">
              Bio
            </label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
              disabled={isSaving || isLoading}
              className="max-w-2xl"
            />
          </div>

          {/* Avatar URL */}
          <div className="space-y-2">
            <label htmlFor="avatar" className="text-sm font-medium">
              Avatar URL
            </label>
            <Input
              id="avatar"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              disabled={isSaving || isLoading}
              className="max-w-md"
            />
          </div>

          {/* Links */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Social Links</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLink}
                disabled={isSaving || isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Link
              </Button>
            </div>

            {links.map((link, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={link.label}
                  onChange={(e) => updateLink(index, "label", e.target.value)}
                  placeholder="Label (e.g., Twitter)"
                  disabled={isSaving || isLoading}
                  className="flex-1"
                />
                <Input
                  value={link.url}
                  onChange={(e) => updateLink(index, "url", e.target.value)}
                  placeholder="https://..."
                  disabled={isSaving || isLoading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLink(index)}
                  disabled={isSaving || isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isSaving || isLoading || !username.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
