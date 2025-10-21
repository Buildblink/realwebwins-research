#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import { promises as fs } from "fs";
import path from "path";
import slugify from "slugify";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
  "";

const HAS_SERVICE_ROLE = Boolean(serviceRoleKey);
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
const FEED_PATH = path.join(EXPORT_DIR, "realwebwins_feed.json");
const OUTPUT_PATH = path.join(EXPORT_DIR, "tweets.txt");
const FALLBACK_LOG_PATH = path.join(
  process.cwd(),
  "logs",
  "agentstatus-fallback.json"
);

const CASE_BASE_URL =
  process.env.CASE_BASE_URL ?? "https://realwebwins.com/case";
const CARD_CDN_BASE = process.env.CARD_CDN_BASE ?? "";

console.log(
  chalk.cyan(`[export:tweets] Using feed file: ${FEED_PATH}`)
);

function truncate(value, length = 220) {
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
        `[export:tweets] Unable to write AgentStatus fallback log: ${formatError(
          error
        )}`
      )
    );
  }
}

async function logAgentStatus(entry) {
  const payload = {
    idea: entry.idea ?? "tweet-export",
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

async function readFeed() {
  try {
    const raw = await fs.readFile(FEED_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.projects) ? parsed.projects : [];
  } catch (error) {
    throw new Error(
      `Unable to read feed file (${FEED_PATH}). Run "npm run export:feed" first. Details: ${formatError(
        error
      )}`
    );
  }
}

function makeSlug(project, index, usedSlugs) {
  const base =
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

  let candidate = base || `project-${index}`;
  let suffix = 1;
  while (usedSlugs.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  usedSlugs.add(candidate);
  return candidate;
}

function buildCaseLink(project, slug) {
  if (project.proof_link) {
    return project.proof_link;
  }
  const base = CASE_BASE_URL.endsWith("/")
    ? CASE_BASE_URL.slice(0, -1)
    : CASE_BASE_URL;
  return `${base}/${slug}`;
}

function buildCardLink(slug) {
  if (CARD_CDN_BASE) {
    const base = CARD_CDN_BASE.endsWith("/")
      ? CARD_CDN_BASE.slice(0, -1)
      : CARD_CDN_BASE;
    return `${base}/${slug}.png`;
  }
  return `/api/cards/${slug}`;
}

function buildTweet(project, slug) {
  const scoreText =
    typeof project.score === "number"
      ? `${project.score}/100 validation score`
      : "Verified win (score pending)";
  const summary =
    truncate(project.summary, 160) ??
    "Verified build from Realwebwins.";
  const platform = project.platform ?? "Independent";
  const link = buildCaseLink(project, slug);
  const cardUrl =
    project.image_url && typeof project.image_url === "string"
      ? project.image_url
      : buildCardLink(slug);

  const lines = [
    `Win: ${project.title ?? "Indie win"} (${platform})`,
    summary,
    `Score: ${scoreText}`,
    `Link: ${link}`,
  ];

  if (cardUrl) {
    lines.push(`Card: ${cardUrl}`);
  }

  return lines.join("\n");
}

async function main() {
  console.log(chalk.bold("Realwebwins Tweet Snippet Exporter"));

  await fs.mkdir(EXPORT_DIR, { recursive: true });
  const projects = await readFeed();

  if (!projects.length) {
    throw new Error("Feed contains no projects to convert into tweets.");
  }

  const usedSlugs = new Set();
  const tweets = projects.map((project, index) => {
    let slug =
      project.slug && typeof project.slug === "string"
        ? project.slug
        : null;

    if (slug) {
      if (usedSlugs.has(slug)) {
        slug = makeSlug({ ...project, slug: undefined }, index, usedSlugs);
      } else {
        usedSlugs.add(slug);
      }
    } else {
      slug = makeSlug(project, index, usedSlugs);
    }

    return buildTweet(project, slug);
  });

  const output = tweets.join("\n\n---\n\n");
  await fs.writeFile(OUTPUT_PATH, `${output}\n`, "utf8");

  await logAgentStatus({
    idea: "tweet-export",
    stage: "run",
    success: true,
    passed: true,
    summary: createSummary({
      tweets: tweets.length,
      output: OUTPUT_PATH,
    }),
  });

  console.log(
    chalk.green(
      `Tweet snippets exported to ${OUTPUT_PATH} (${tweets.length} entries)`
    )
  );
}

main().catch(async (error) => {
  console.error(chalk.red(formatError(error)));
  await logAgentStatus({
    idea: "tweet-export",
    stage: "run",
    success: false,
    passed: false,
    error_log: formatError(error),
  });
  process.exit(1);
});
