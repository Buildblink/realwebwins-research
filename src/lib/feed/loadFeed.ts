import { promises as fs } from "fs";
import path from "path";

const FEED_PATH = path.join(
  process.cwd(),
  "exports",
  "realwebwins_feed.json"
);

export interface FeedProject {
  id?: string;
  title?: string | null;
  platform?: string | null;
  score?: number | null;
  summary?: string | null;
  proof_link?: string | null;
  last_refreshed_at?: string | null;
  slug?: string | null;
  image_url?: string | null;
  [key: string]: unknown;
}

export interface FeedFile {
  generated_at?: string | null;
  projects: FeedProject[];
  source?: string;
}

export async function loadFeed(): Promise<FeedFile> {
  try {
    const raw = await fs.readFile(FEED_PATH, "utf8");
    const parsed = JSON.parse(raw) as FeedFile;
    parsed.projects = Array.isArray(parsed.projects)
      ? parsed.projects
      : [];
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
      console.warn(
        "[feed] Unable to read realwebwins_feed.json:",
        (error as Error).message ?? error
      );
    }
    return {
      generated_at: null,
      projects: [],
      source: "missing-feed",
    };
  }
}

export async function getProjectBySlug(
  slug: string
): Promise<FeedProject | null> {
  const feed = await loadFeed();
  const project =
    feed.projects.find((entry) => entry.slug === slug) ?? null;
  return project;
}

export function resolveImageUrl(project: FeedProject): string {
  if (project.image_url && typeof project.image_url === "string") {
    return project.image_url;
  }
  const slug = project.slug;
  if (!slug) {
    return "/api/cards/preview.png";
  }

  const cardCdnBase = process.env.CARD_CDN_BASE ?? "";
  if (cardCdnBase) {
    const base = cardCdnBase.endsWith("/")
      ? cardCdnBase.slice(0, -1)
      : cardCdnBase;
    return `${base}/${slug}.png`;
  }

  return `/api/cards/${slug}`;
}
