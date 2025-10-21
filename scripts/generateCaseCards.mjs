#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import { promises as fs } from "fs";
import path from "path";
import slugify from "slugify";
import QRCode from "qrcode";
import Mustache from "mustache";
import puppeteer from "puppeteer";
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

const EXPORT_ROOT = path.join(process.cwd(), "exports");
const FEED_PATH = path.join(EXPORT_ROOT, "realwebwins_feed.json");
const CARDS_DIR = path.join(EXPORT_ROOT, "cards");
const MANIFEST_PATH = path.join(CARDS_DIR, "manifest.json");
const TEMPLATE_BASE = process.env.CARD_TEMPLATE_PATH
  ? path.resolve(process.cwd(), process.env.CARD_TEMPLATE_PATH)
  : path.join(process.cwd(), "src", "templates", "card");
const TEMPLATE_HTML = path.join(TEMPLATE_BASE, "base.html");
const TEMPLATE_STYLE = path.join(TEMPLATE_BASE, "style.css");
const ICON_DIR = path.join(TEMPLATE_BASE, "platform-icons");

const BRAND_PRIMARY = process.env.BRAND_COLOR_PRIMARY ?? "#F8FAFC";
const BRAND_ACCENT = process.env.BRAND_COLOR_SECONDARY ?? "#38BDF8";
const CARD_CDN_BASE = process.env.CARD_CDN_BASE ?? "";
const CARD_STORAGE_BUCKET =
  process.env.CARD_STORAGE_BUCKET ?? process.env.SUPABASE_STORAGE_BUCKET ?? "";
const CARD_STORAGE_PREFIX = process.env.CARD_STORAGE_PREFIX ?? "";

console.log(
  chalk.cyan(
    `[generate:cards] template=${TEMPLATE_HTML} | feed=${FEED_PATH} | output=${CARDS_DIR}`
  )
);

function truncate(value, limit = 180) {
  if (!value) return null;
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 3)}...`;
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
  const fallbackPath = path.join(
    process.cwd(),
    "logs",
    "agentstatus-fallback.json"
  );
  try {
    await fs.mkdir(path.dirname(fallbackPath), { recursive: true });
    await fs.appendFile(
      fallbackPath,
      `${JSON.stringify({ ...entry, fallback_at: new Date().toISOString() })}\n`,
      "utf8"
    );
  } catch (error) {
    console.warn(
      chalk.yellow(
        `[generate:cards] unable to write AgentStatus fallback log: ${formatError(
          error
        )}`
      )
    );
  }
}

async function logAgentStatus(entry) {
  const payload = {
    idea: entry.idea ?? "case-card",
    stage: entry.stage ?? "render",
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
    return JSON.parse(raw);
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

async function resolvePlatformIcon(platform) {
  if (!platform) return null;
  const slug = slugify(platform, { lower: true, strict: true });
  const candidates = [
    `${slug}.svg`,
    `${slug}.png`,
    `${slug}.jpg`,
    "default.svg",
  ];

  for (const file of candidates) {
    const location = path.join(ICON_DIR, file);
    try {
      const buffer = await fs.readFile(location);
      const ext = path.extname(location).toLowerCase();
      const mime =
        ext === ".svg"
          ? "image/svg+xml"
          : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : "image/png";
      return `data:${mime};base64,${buffer.toString("base64")}`;
    } catch {
      // try next candidate
    }
  }

  return null;
}

function shortenLink(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/+/g, "/");
    const trimmed =
      pathname.length > 28 ? `${pathname.slice(0, 25)}...` : pathname;
    return `${parsed.hostname}${trimmed}`;
  } catch {
    return truncate(url, 32);
  }
}

function buildDefaultImageUrl(slug) {
  if (CARD_CDN_BASE) {
    const base = CARD_CDN_BASE.endsWith("/")
      ? CARD_CDN_BASE.slice(0, -1)
      : CARD_CDN_BASE;
    return `${base}/${slug}.png`;
  }
  return `/api/cards/${slug}`;
}

async function buildCardView(project, options) {
  const { style, slug, feedGeneratedAt } = options;

  const score =
    typeof project.score === "number" ? `${project.score}/100` : "Score pending";
  const summary =
    truncate(project.summary ?? project.idea_description, 220) ??
    "Snapshot generated from the Realwebwins vault.";
  const proofLink = project.proof_link ?? null;
  const qrDataUrl = proofLink
    ? await QRCode.toDataURL(proofLink, { margin: 1, width: 200 })
    : null;
  const iconDataUrl = await resolvePlatformIcon(project.platform);
  const timestampSource =
    project.last_refreshed_at ?? feedGeneratedAt ?? new Date().toISOString();

  return {
    style,
    title: project.title ?? "Untitled project",
    platform: project.platform ?? "Independent",
    timestamp: timestampSource.slice(0, 10),
    score_text: score,
    verified_text: "Verified ✓",
    summary,
    proof_link: proofLink,
    short_proof: shortenLink(proofLink),
    qr_data_url: qrDataUrl,
    icon_data_url: iconDataUrl,
    background_color: BRAND_PRIMARY,
    accent_color: BRAND_ACCENT,
    slug,
  };
}

async function renderCardBuffer(browser, templateHtml, view) {
  const html = Mustache.render(templateHtml, view);
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 675, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "networkidle0" });
  const buffer = await page.screenshot({ type: "png" });
  await page.close();
  return buffer;
}

function buildStorageKey(slug) {
  const cleanedPrefix = CARD_STORAGE_PREFIX.replace(/^\/+/, "").replace(/\/+$/, "");
  const fileName = `${slug}.png`;
  return cleanedPrefix ? `${cleanedPrefix}/${fileName}` : fileName;
}

async function uploadToStorage(buffer, slug) {
  if (!CARD_STORAGE_BUCKET || !supabaseWrite || !HAS_SERVICE_ROLE) {
    return null;
  }

  const storageKey = buildStorageKey(slug);
  const { error } = await supabaseWrite.storage
    .from(CARD_STORAGE_BUCKET)
    .upload(storageKey, buffer, {
      upsert: true,
      contentType: "image/png",
    });

  if (error) {
    console.warn(
      chalk.yellow(
        `[generate:cards] failed to upload ${storageKey} to ${CARD_STORAGE_BUCKET}: ${formatError(
          error
        )}`
      )
    );
    return null;
  }

  const { data } = supabaseWrite.storage
    .from(CARD_STORAGE_BUCKET)
    .getPublicUrl(storageKey);
  return data?.publicUrl ?? null;
}

async function main() {
  console.log(chalk.bold("Realwebwins Case-Card Generator"));

  await fs.mkdir(CARDS_DIR, { recursive: true });

  const [templateHtml, templateStyle, feed] = await Promise.all([
    fs.readFile(TEMPLATE_HTML, "utf8"),
    fs.readFile(TEMPLATE_STYLE, "utf8"),
    readFeed(),
  ]);

  const projects = Array.isArray(feed.projects) ? feed.projects : [];
  if (!projects.length) {
    throw new Error("Feed contains no projects to render.");
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const usedSlugs = new Set();
  const manifestEntries = [];
  let rendered = 0;

  try {
    for (let index = 0; index < projects.length; index += 1) {
      const project = projects[index];
      const slug = makeSlug(project, index, usedSlugs);
      const view = await buildCardView(project, {
        style: templateStyle,
        slug,
        feedGeneratedAt: feed.generated_at,
      });

      const buffer = await renderCardBuffer(browser, templateHtml, view);
      const localRelativePath = `cards/${slug}.png`;
      const localPath = path.join(CARDS_DIR, `${slug}.png`);
      await fs.writeFile(localPath, buffer);

      let publicUrl = await uploadToStorage(buffer, slug);
      if (!publicUrl) {
        publicUrl = buildDefaultImageUrl(slug);
      }

      manifestEntries.push({
        slug,
        image_url: publicUrl,
        local_path: localRelativePath,
      });
      rendered += 1;

      await logAgentStatus({
        idea: "case-card",
        stage: "render",
        success: true,
        passed: true,
        summary: createSummary({
          slug,
          projectId: project.id ?? null,
          title: project.title ?? null,
          proof: Boolean(project.proof_link),
          image_url: publicUrl,
        }),
      });

      console.log(
        chalk.green(`Rendered "${project.title ?? slug}" -> ${localPath}`)
      );
    }
  } finally {
    await browser.close();
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    entries: manifestEntries,
  };
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  await logAgentStatus({
    idea: "case-card",
    stage: "summary",
    success: true,
    passed: true,
    summary: createSummary({
      rendered,
      total: projects.length,
      manifest: "cards/manifest.json",
    }),
  });

  console.log(
    chalk.bold(`Completed rendering ${rendered}/${projects.length} case cards.`)
  );
}

main().catch(async (error) => {
  console.error(chalk.red(formatError(error)));
  await logAgentStatus({
    idea: "case-card",
    stage: "render",
    success: false,
    passed: false,
    error_log: formatError(error),
  });
  process.exit(1);
});
