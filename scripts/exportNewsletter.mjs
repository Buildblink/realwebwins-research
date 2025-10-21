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
const FEED_FILE = path.join(EXPORT_DIR, "realwebwins_feed.json");
const MARKDOWN_OUT = path.join(EXPORT_DIR, "newsletter_draft.md");
const HTML_OUT = path.join(EXPORT_DIR, "newsletter_draft.html");
const FALLBACK_LOG_PATH = path.join(
  process.cwd(),
  "logs",
  "agentstatus-fallback.json"
);

const target = parseTarget(process.argv);
const includeCards = process.argv.includes("--include-cards");
const CARD_CDN_BASE = process.env.CARD_CDN_BASE ?? "";

console.log(
  chalk.cyan(
    `[export:newsletter] Using feed file: ${FEED_FILE} | target=${target} | includeCards=${includeCards}`
  )
);

function parseTarget(argv) {
  const index = argv.indexOf("--for");
  if (index === -1 || !argv[index + 1]) {
    return "default";
  }
  const value = argv[index + 1].toLowerCase();
  if (["buttondown", "beehiiv", "substack"].includes(value)) {
    return value;
  }
  console.warn(
    chalk.yellow(
      `[export:newsletter] Unknown target "${value}" supplied. Using default formatting.`
    )
  );
  return "default";
}

function truncate(value, length = 400) {
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

  let slug = base || `project-${index}`;
  let suffix = 1;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  usedSlugs.add(slug);
  return slug;
}

function buildCardUrl(cardBase, slug) {
  if (cardBase) {
    const cleanBase = cardBase.endsWith("/")
      ? cardBase.slice(0, -1)
      : cardBase;
    return `${cleanBase}/${slug}.png`;
  }
  return `cards/${slug}.png`;
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
        `[export:newsletter] Unable to write AgentStatus fallback log: ${formatError(
          error
        )}`
      )
    );
  }
}

async function logAgentStatus(entry) {
  const payload = {
    idea: entry.idea ?? "newsletter-export",
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
    const raw = await fs.readFile(FEED_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    const message = formatError(error);
    throw new Error(
      `Unable to read feed file (${FEED_FILE}). Run "npm run export:feed" first. Details: ${message}`
    );
  }
}

function pickTopProjects(feed) {
  const projects = Array.isArray(feed.projects) ? feed.projects : [];
  const sorted = [...projects].sort((a, b) => {
    const aScore = typeof a.score === "number" ? a.score : -1;
    const bScore = typeof b.score === "number" ? b.score : -1;
    return bScore - aScore;
  });

  const top = sorted.slice(0, Math.min(sorted.length, 5));

  if (top.length > 3) {
    return top;
  }

  return sorted.slice(0, Math.min(sorted.length, 3));
}

function buildNewsletterMarkdown(feed, projects, options) {
  const { targetMode, includeCards: includeCardImages, cardBase } = options;
  const header = getHeaderLines(targetMode);
  const usedSlugs = new Set();

  const body = projects.map((project, index) => {
    const score =
      typeof project.score === "number"
        ? `${project.score}/100`
        : "Score unavailable";
    const proof = project.proof_link
      ? `Proof: ${project.proof_link}`
      : "Proof: pending (add your link)";
    const summary =
      truncate(project.summary, targetMode === "substack" ? 360 : 420) ??
      "Summary unavailable.";

    const platformLine = project.platform
      ? `Platform: ${project.platform}`
      : "Platform: n/a";

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
    const lines = [
      `${index + 1}. ${project.title ?? "Untitled"} \u2014 ${score}`,
      `   ${platformLine}`,
      `   ${summary}`,
      `   ${proof}`,
    ];

    if (includeCardImages) {
      const cardUrl = buildCardUrl(cardBase, slug);
      lines.push(`   ![${project.title ?? "Case card"}](${cardUrl})`);
    }

    return lines.join("\n");
  });

  const footer = [
    "",
    `Generated on ${new Date().toISOString()}`,
    `Projects included: ${projects.length} of ${
      Array.isArray(feed.projects) ? feed.projects.length : 0
    }`,
    "",
    "Generated automatically by the Realwebwins Research Agent.",
  ];

  return [...header, "", ...body, "", ...footer].join("\n");
}

function getHeaderLines(targetMode) {
  const base = [
    "Realwebwins Weekly",
    "Indie Successes Worth Reading",
    "-----------------------------------",
  ];

  switch (targetMode) {
    case "buttondown":
      return [
        ...base,
        "Paste directly into Buttondown (Markdown supported).",
      ];
    case "beehiiv":
      return [
        ...base.map((line) => line.toUpperCase()),
        "Optimised for Beehiiv's rich text editor.",
      ];
    case "substack":
      return [
        ...base,
        "Tip: Paste as Markdown in Substack for clean formatting.",
      ];
    default:
      return base;
  }
}

function markdownToHtml(markdown) {
  const blocks = markdown
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (!lines.length) {
        return "";
      }

      const htmlLines = lines.map((line) => {
        const imageMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imageMatch) {
          const alt = escapeAttr(imageMatch[1]);
          const src = escapeAttr(imageMatch[2]);
          return `<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;border-radius:16px;margin-top:12px;" />`;
        }

        return escapeHtml(line);
      });

      return `<p>${htmlLines.join("<br />")}</p>`;
    })
    .filter(Boolean);

  return [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    '  <meta charset="utf-8" />',
    "  <title>Realwebwins Newsletter Draft</title>",
    "</head>",
    "<body>",
    blocks.join("\n"),
    "</body>",
    "</html>",
  ].join("\n");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

async function writeOutput(markdown, html) {
  await fs.mkdir(EXPORT_DIR, { recursive: true });
  await fs.writeFile(MARKDOWN_OUT, `${markdown}\n`, "utf8");
  await fs.writeFile(HTML_OUT, `${html}\n`, "utf8");
}

async function main() {
  console.log(chalk.bold("Realwebwins Newsletter Draft Generator"));

  const feed = await readFeed();
  const projects = pickTopProjects(feed);

  if (!projects.length) {
    throw new Error("Feed file contains no projects to include in newsletter.");
  }

  const markdown = buildNewsletterMarkdown(feed, projects, {
    targetMode: target,
    includeCards,
    cardBase: CARD_CDN_BASE,
  });
  const html = markdownToHtml(markdown);

  await writeOutput(markdown, html);

  await logAgentStatus({
    idea: "newsletter-export",
    stage: "run",
    success: true,
    passed: true,
    summary: createSummary({
      projects_included: projects.length,
      target,
      feed_generated_at: feed.generated_at ?? null,
      include_cards: includeCards,
    }),
  });

  console.log(
    chalk.green(`Newsletter drafts created:\n  - ${MARKDOWN_OUT}\n  - ${HTML_OUT}`)
  );
}

main().catch(async (error) => {
  console.error(chalk.red(formatError(error)));
  await logAgentStatus({
    idea: "newsletter-export",
    stage: "run",
    success: false,
    passed: false,
    error_log: formatError(error),
  });
  process.exit(1);
});












