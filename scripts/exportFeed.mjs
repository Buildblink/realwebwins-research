#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import slugify from "slugify";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
  "";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
  "";

const HAS_SERVICE_ROLE = Boolean(serviceRoleKey);
const HAS_READ_ACCESS = Boolean(anonKey || serviceRoleKey);

const supabaseRead =
  supabaseUrl && (anonKey || serviceRoleKey)
    ? createClient(supabaseUrl, anonKey || serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const supabaseWrite =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const EXPORT_DIR = path.join(process.cwd(), "exports");
const EXPORT_FILE = path.join(EXPORT_DIR, "realwebwins_feed.json");
const FALLBACK_LOG_PATH = path.join(
  process.cwd(),
  "logs",
  "agentstatus-fallback.json"
);

const DESIRED_FIELDS =
  "id, title, idea_description, platform, validation_score, last_refreshed_at, proof_link, research_report";
const FALLBACK_FIELDS =
  "id, title, idea_description, last_refreshed_at, research_report";
const CARD_CDN_BASE = process.env.CARD_CDN_BASE ?? "";
const CARD_MANIFEST_PATH = path.join(EXPORT_DIR, "cards", "manifest.json");
let cardManifestMap = {};


console.log(
  chalk.cyan(
    `[export:feed] Supabase URL: ${
      supabaseUrl || "missing"
    } | anon key: ${anonKey ? "present" : "missing"} | service role: ${
      serviceRoleKey ? "present" : "missing"
    }`
  )
);

function truncate(value, length = 280) {
  if (!value) return null;
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, length - 3)}...`;
}

function formatError(error) {
  if (!error) return "Unknown error";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function createSummary(details) {
  return JSON.stringify({
    ...details,
    timestamp: new Date().toISOString(),
  });
}

function makeSlug(project, index, usedSlugs) {
  const baseSlug =
    project.slug && typeof project.slug === "string"
      ? project.slug
      : slugify(
          `${project.title ?? "project"}-${project.id ?? index}`,
          {
            lower: true,
            strict: true,
            trim: true,
          }
        );

  let candidate = baseSlug || `project-${index}`;
  let suffix = 1;
  while (usedSlugs.has(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  usedSlugs.add(candidate);
  return candidate;
}

async function loadCardManifest() {
  try {
    const raw = await fs.readFile(CARD_MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const map = {};
    for (const entry of parsed.entries ?? []) {
      if (entry?.slug) {
        map[entry.slug] = entry;
      }
    }
    cardManifestMap = map;
  } catch (error) {
    cardManifestMap = {};
    const code =
      error && typeof error === "object" && "code" in error
        ? error.code
        : undefined;
    if (code !== "ENOENT") {
      console.warn(
        chalk.yellow(
          `[export:feed] Unable to load card manifest: ${formatError(error)}`
        )
      );
    }
  }
}

function getImageUrlForSlug(slug) {
  const entry = cardManifestMap[slug];
  if (entry?.image_url) {
    return entry.image_url;
  }
  if (CARD_CDN_BASE) {
    const base = CARD_CDN_BASE.endsWith("/")
      ? CARD_CDN_BASE.slice(0, -1)
      : CARD_CDN_BASE;
    return `${base}/${slug}.png`;
  }
  return `/api/cards/${slug}`;
}


async function logAgentStatus(entry) {
  const payload = {
    idea: entry.idea ?? "feed-export",
    stage: entry.stage ?? "run",
    run_type: "cli",
    success: Boolean(entry.success),
    passed: entry.passed ?? Boolean(entry.success),
    error_log: truncate(entry.error_log, 1000),
    summary: entry.summary ? truncate(entry.summary, 1000) : null,
  };

  if (!supabaseWrite || !HAS_SERVICE_ROLE) {
    await writeFallbackLog(payload);
    return;
  }

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { error } = await supabaseWrite.from("AgentStatus").insert([payload]);
      if (!error) return;
      lastError = error;
    } catch (error) {
      lastError = error;
    }
  }

  await writeFallbackLog({
    ...payload,
    fallback_error: lastError ? formatError(lastError) : "supabase unavailable",
  });
}

async function writeFallbackLog(entry) {
  try {
    await fs.mkdir(path.dirname(FALLBACK_LOG_PATH), { recursive: true });
    await fs.appendFile(
      FALLBACK_LOG_PATH,
      `${JSON.stringify({ ...entry, fallback_at: new Date().toISOString() })}\n`,
      "utf8"
    );
  } catch (error) {
    console.warn(
      chalk.yellow(
        `[export:feed] Unable to write AgentStatus fallback log: ${formatError(error)}`
      )
    );
  }
}

async function fetchTrackedProjects() {
  if (!supabaseRead || !HAS_READ_ACCESS) {
    throw new Error("Supabase read client unavailable.");
  }

  const primary = await supabaseRead
    .from("research_projects")
    .select(DESIRED_FIELDS)
    .eq("is_tracked", true)
    .order("last_refreshed_at", { ascending: false, nullsFirst: true });

  if (primary.error) {
    if (isMissingColumnError(primary.error)) {
      console.warn(
        chalk.yellow(
          `[export:feed] Missing columns detected (${primary.error.message}); retrying with fallback selection.`
        )
      );
      const fallback = await supabaseRead
        .from("research_projects")
        .select(FALLBACK_FIELDS)
        .eq("is_tracked", true)
        .order("last_refreshed_at", { ascending: false, nullsFirst: true });

      if (fallback.error) {
        throw fallback.error;
      }

      return fallback.data ?? [];
    }

    throw primary.error;
  }

  return primary.data ?? [];
}

function isMissingColumnError(error) {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  const details =
    typeof error.details === "string" ? error.details.toLowerCase() : "";
  return (
    message.includes("column") ||
    message.includes("schema cache") ||
    details.includes("column") ||
    error.code === "42703" ||
    error.code === "PGRST204"
  );
}

function projectToExport(project, index, usedSlugs) {
  const slug = makeSlug(project, index, usedSlugs);
  const summary =
    truncate(project.research_report, 320) ??
    truncate(project.idea_description, 320) ??
    "Summary unavailable.";
  const imageUrl = getImageUrlForSlug(slug);

  return {
    id: project.id,
    title: project.title ?? "Untitled project",
    platform: project.platform ?? "unknown",
    score:
      typeof project.validation_score === "number"
        ? project.validation_score
        : null,
    summary,
    proof_link: project.proof_link ?? null,
    last_refreshed_at: project.last_refreshed_at,
    slug,
    image_url: imageUrl,
  };
}

async function buildFeedFromFallback() {
  try {
    const raw = await fs.readFile(FALLBACK_LOG_PATH, "utf8");
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .reverse();

    const projects = [];
    const usedSlugs = new Set();
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (
          parsed.summary &&
          typeof parsed.summary === "string" &&
          parsed.summary.includes("projectId")
        ) {
          const summaryObj = JSON.parse(parsed.summary);
          if (
            summaryObj.projectId &&
            !projects.find((p) => p.id === summaryObj.projectId)
          ) {
            const fallbackProject = {
              id: summaryObj.projectId,
              title: summaryObj.idea ?? summaryObj.projectId,
              platform: summaryObj.platform ?? "unknown",
              score:
                typeof summaryObj.validationScore === "number"
                  ? summaryObj.validationScore
                  : null,
              summary:
                summaryObj.message ??
                summaryObj.reason ??
                "Generated from fallback log entry.",
              proof_link: null,
              last_refreshed_at: summaryObj.refreshed_at ?? null,
            };
            fallbackProject.slug = makeSlug(
              fallbackProject,
              projects.length,
              usedSlugs
            );

            projects.push(fallbackProject);
          }
        }
      } catch (error) {
        console.warn(
          chalk.yellow(
            `[export:feed] Skipping malformed fallback log entry: ${formatError(error)}`
          )
        );
      }

      if (projects.length >= 5) {
        break;
      }
    }

    if (projects.length === 0) {
      return null;
    }

    return {
      generated_at: new Date().toISOString(),
      projects,
      source: "fallback-log",
    };
  } catch (error) {
    console.warn(
      chalk.yellow(
        `[export:feed] Unable to read fallback log: ${formatError(error)}`
      )
    );
    return null;
  }
}

async function writeFeed(feed) {
  await fs.mkdir(EXPORT_DIR, { recursive: true });
  await fs.writeFile(EXPORT_FILE, `${JSON.stringify(feed, null, 2)}\n`, "utf8");
}

async function main() {
  await loadCardManifest();
  console.log(chalk.bold("�Y�� Realwebwins Export Feed"));

  let projects = [];
  let usedFallback = false;

  if (supabaseRead && HAS_READ_ACCESS) {
    try {
      projects = await fetchTrackedProjects();
    } catch (error) {
      console.error(
        chalk.red(
          `[export:feed] Failed to fetch projects: ${formatError(error)}`
        )
      );
    }
  }

  if (!projects.length) {
    const fallbackFeed = await buildFeedFromFallback();
    if (fallbackFeed) {
      await writeFeed(fallbackFeed);
      await logAgentStatus({
        idea: "feed-export",
        stage: "fallback",
        success: true,
        passed: true,
        summary: createSummary({
          projects: fallbackFeed.projects.length,
          source: "fallback",
        }),
      });

      console.log(
        chalk.yellow(
          `�s���?  Feed exported from fallback log to ${EXPORT_FILE} (${fallbackFeed.projects.length} projects)`
        )
      );
      usedFallback = true;
      process.exit(0);
    }
  }

  if (!projects.length) {
    await logAgentStatus({
      idea: "feed-export",
      stage: "run",
      success: false,
      passed: false,
      error_log: "Unable to generate feed data (no projects available).",
      summary: createSummary({ projects: 0 }),
    });
    console.error(chalk.red("�?O No projects available for export."));
    process.exit(1);
  }

  const slugMemo = new Set();
  const feedProjects = projects.map((project, index) =>
    projectToExport(project, index, slugMemo)
  );

  const feed = {
    generated_at: new Date().toISOString(),
    projects: feedProjects,
  };

  await writeFeed(feed);

  await logAgentStatus({
    idea: "feed-export",
    stage: usedFallback ? "fallback" : "run",
    success: true,
    passed: true,
    summary: createSummary({
      projects: feed.projects.length,
      source: usedFallback ? "fallback" : "supabase",
    }),
  });

  console.log(
    chalk.green(
      `�o. Exported ${feed.projects.length} project(s) to ${EXPORT_FILE}`
    )
  );
}

main().catch(async (error) => {
  console.error(chalk.red(formatError(error)));
  await logAgentStatus({
    idea: "feed-export",
    stage: "run",
    success: false,
    passed: false,
    error_log: formatError(error),
  });
  process.exit(1);
});






