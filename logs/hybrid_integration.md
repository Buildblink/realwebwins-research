# ⚙️ HYBRID_AI_INTEGRATION_PLAN.md
### Realwebwins — Claude + ChatGPT Hybrid Integration (Developer Implementation Guide)

---

## 🎯 Purpose
Enable Realwebwins to use **Claude** for high-context research/summarization and **OpenAI (ChatGPT)** for structured automation, validation, and publishing.

Outputs powered by this integration:
- Automated **pain‑point discovery** (creator + consumer)
- **Playbook draft generation** for new problems
- **Newsletter/tweet** text generation
- **Nightly enrichment** of Supabase tables

---

## 🧱 Architecture Overview

```
┌─────────────────────────────┐
│      Next.js Frontend       │
│ (Pain Points / Playbooks)   │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│      Supabase Database      │
│  pain_points, playbooks     │
└──────────┬──────────────────┘
           │
   ┌───────┴─────────┐
   │                 │
Claude API        OpenAI API
(Discovery)       (Automation)
   │                 │
   └──────▶ Node Cron Jobs ◀──────┘
          scripts/auto/*
```

---

## 🔐 Environment

Add to `.env.local` (and Vercel project settings later):

```bash
# Claude (Anthropic)
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxxxxx

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxx

# Supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Optional logging/feature flags
HYBRID_VERBOSE=true
```

Install SDKs:
```bash
npm i @anthropic-ai/sdk openai node-fetch
```

---

## 🧠 Claude: Discovery & Summarization

**Create:** `scripts/auto/autoDiscoverPainPointsClaude.mjs`

```js
import Anthropic from "@anthropic-ai/sdk";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const claude = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1) Fetch raw posts (start with Reddit JSON for MVP; replace with RSS/IndieHackers later)
async function fetchThreads() {
  const subs = ["Entrepreneur", "IndieHackers", "SideProject"];
  const results = [];
  for (const sub of subs) {
    const res = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=10`);
    if (!res.ok) continue;
    const data = await res.json();
    for (const c of data.data.children) {
      const d = c.data;
      const body = [d.title, d.selftext].filter(Boolean).join("

");
      results.push({ body, url: `https://reddit.com${d.permalink}`, sub });
    }
  }
  return results.slice(0, 10);
}

// 2) Ask Claude to extract structured pain points (creator + consumer support)
async function extractPainPoints({ body, url, sub }) {
  const prompt = `From the following discussion, extract up to 3 distinct pain points.
Return a strict JSON array; each item must include: 
{text, category, niche, source, audience, frequency, proof_link}.
- category: Marketing | Monetization | Motivation | Product | Growth | Pricing | Technical | Trust | Personalization | Retention | Finance | Experience
- niche: short noun phrase (e.g., YouTubers, Etsy Sellers, Freelancers, SaaS Founders, Online Shoppers, Learners)
- source: "Reddit"
- audience: "creator" or "consumer" (choose based on who has the problem)
- frequency: integer 1-5 indicating prevalence in this thread
- proof_link: the canonical URL of the thread

Thread URL: ${url}
Subreddit: r/${sub}

Text:
${body}`;

  const resp = await claude.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const text = resp.content?.[0]?.text?.trim() ?? "[]";
  try {
    const arr = JSON.parse(text);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    if (process.env.HYBRID_VERBOSE) console.error("Claude JSON parse failed:", text);
    return [];
  }
}

// 3) Insert into Supabase pain_points table (ignores duplicates on identical text+source+proof_link)
async function upsertPainPoints(points) {
  if (!points.length) return;
  const rows = points.map(p => ({
    text: p.text?.slice(0, 1000),
    category: p.category,
    niche: p.niche,
    source: p.source,
    audience: p.audience || "creator",
    frequency: Number(p.frequency) || 1,
    proof_link: p.proof_link,
    last_seen: new Date().toISOString(),
  }));
  const { error } = await supabase.from("pain_points").upsert(rows, { onConflict: "text,source,proof_link" });
  if (error) console.error("Supabase upsert error:", error);
  else console.log(`Upserted ${rows.length} pain points.`);
}

// Orchestrator
(async () => {
  const threads = await fetchThreads();
  for (const t of threads) {
    const extracted = await extractPainPoints(t);
    if (extracted.length) await upsertPainPoints(extracted);
  }
  console.log("Claude discovery complete.");
})();
```

> Uses Claude to read messy forum text and output structured problem items for your `pain_points` table.

---

## ⚙️ OpenAI: Playbook Drafts & Structured Automation

**Create:** `scripts/auto/generatePlaybooksFromPainPoints.mjs`

```js
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchUnlinked(limit = 5) {
  const { data, error } = await supabase
    .from("pain_points")
    .select("*")
    .is("related_playbook", null)
    .order("last_seen", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function generatePlaybook(p) {
  const prompt = `Create a concise playbook to solve this problem for a solo builder.
Return valid JSON with keys: 
{ title, slug, description, content, tools, affiliate_links, category, niche, related_pain_id }.
- title: 6-10 words, clear and specific
- slug: kebab-case from title
- description: 1-2 sentences
- content: markdown with 5 steps, a validation step, and pitfalls
- tools: array of { name, url, why } (2-4 items)
- affiliate_links: array of { name, url, note } (0-3 items)
- category, niche: reuse from pain point
- related_pain_id: ${p.id}

Problem text:
${p.text}`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const raw = res.choices[0]?.message?.content || "{}";
  try { return JSON.parse(raw); } catch { 
    // fallback: try another JSON extraction
    const match = raw.match(/\{[\s\S]*\}$/);
    return match ? JSON.parse(match[0]) : null;
  }
}

async function insertPlaybook(pb) {
  if (!pb) return;
  const { error } = await supabase.from("playbooks").insert({
    title: pb.title,
    slug: pb.slug,
    description: pb.description,
    content: pb.content,
    category: pb.category,
    niche: pb.niche,
    related_pain_id: pb.related_pain_id,
    tools: pb.tools || [],
    affiliate_links: pb.affiliate_links || [],
  });
  if (error) console.error("Playbook insert error:", error);
  else console.log("Inserted playbook:", pb.title);
}

(async () => {
  const unlinked = await fetchUnlinked(5);
  for (const p of unlinked) {
    const pb = await generatePlaybook(p);
    await insertPlaybook(pb);
  }
  console.log("Playbook generation complete.");
})();
```

> Uses OpenAI to convert new pain points into publish‑ready, structured playbooks.

---

## 🕓 Cron Orchestration

**Create:** `scripts/auto/runHybridRefresh.mjs`

```js
import { execSync } from "node:child_process";

const steps = [
  "node scripts/auto/autoDiscoverPainPointsClaude.mjs",
  "node scripts/auto/generatePlaybooksFromPainPoints.mjs",
  "npm run export:feed",
];

for (const cmd of steps) {
  try {
    console.log("▶", cmd);
    const out = execSync(cmd, { stdio: "pipe" }).toString();
    console.log(out);
  } catch (e) {
    console.error("Step failed:", cmd, e?.stderr?.toString() || e.message);
  }
}
console.log("Hybrid refresh done.");
```

**package.json**
```json
{
  "scripts": {
    "hybrid:refresh": "node scripts/auto/runHybridRefresh.mjs"
  }
}
```

Schedule in your chosen runner (Railway/Vercel/Actions), daily or 2× per day.

---

## 🧪 Manual Test Order

```bash
# 1) Claude discovery → inserts new pain points
node scripts/auto/autoDiscoverPainPointsClaude.mjs

# 2) OpenAI playbook generator → creates playbooks for new items
node scripts/auto/generatePlaybooksFromPainPoints.mjs

# 3) Verify in app
npm run dev
# Open http://localhost:3000/pain-points and click through to playbooks
```

---

## 💰 Token Cost Control

- Use **Claude Haiku** for daily scraping; **Sonnet** weekly for deeper summaries.
- Limit to **10 threads/day** initially; batch multiple posts per call when possible.
- Use OpenAI **gpt‑4o‑mini** or **gpt‑4‑turbo** for JSON playbooks; temperature ≤ 0.3.
- Set hard guards: max 5 playbooks/day.

Expected ops: **<$10/month** at MVP scale.

---

## 🧾 Logging & Safety

- Reuse your `AgentStatus` logger to record each step: run type, passed, summary JSON.
- Never expose `SERVICE_ROLE_KEY` client‑side; scripts live in `scripts/auto/*` only.
- Add retries (3×) + backoff on network errors.
- Consider a `dryRun=true` flag for development.

---

## 🚀 Next Steps After Wiring

- Extend discovery to **consumer** audience (set `audience="consumer"`).
- Weekly “Top 5 Pain Points + Playbooks” newsletter via your existing export CLI.
- Optional: push new playbooks to a **/playbook** list page for browsing.

---
Setup steps before running scripts:
1️⃣ Copy .env.local.example → .env.local
2️⃣ Add API keys for Claude, OpenAI, and Supabase
3️⃣ Run npm install
4️⃣ Test with node scripts/auto/autoDiscoverPainPointsClaude.mjs