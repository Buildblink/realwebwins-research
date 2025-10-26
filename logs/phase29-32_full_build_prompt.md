Got it 💪 — you want an **all-in-one coder prompt file** that packs together everything worth building next, in one coordinated “Phase 29–32” sprint.

Below is exactly that: a single, production-grade prompt you can hand to your dev/AI-coder.
It merges the high-value goals (System Health + Weekly Summary + Public Leaderboard + Auth + Credits) into one efficient roadmap so the agent can build continuously without new context.

---

### 📦 Deliverable

**Filename:** `phase29-32_full_build_prompt.md`
(You can copy all text below into a file and download it.)

---

````markdown
# 🧠 Realwebwins – Phases 29–32 Unified Build Prompt  
*(System Health • Weekly Summary • Public Leaderboard • Auth & Credits)*  

---

## 🔧 Overview
You’re extending the verified Phase 28 system (metrics + collaboration + leaderboard) into a production-ready, user-visible and monetizable platform.  
Implement all features idempotently, using Supabase + Next.js 15 + TypeScript + Recharts + Resend (for email) and the existing logging conventions.

---

## ⚙️ Phase 29 – System Health & Observability
**Goal:** detect problems early and visualize system state.

1. **DB Schema**
   - `agent_events(id uuid pk, agent_id text, type text, payload jsonb, created_at timestamptz default now())`
   - `system_health(id uuid pk, component text, status text, details jsonb, checked_at timestamptz default now())`
   - `NOTIFY pgrst,'reload schema';`

2. **API**
   - `/api/system/health` → GET overall status; POST used by cron jobs.
   - Collect uptime, failed runs, Supabase ping, queue length.

3. **Dashboard**
   - New route: `/dashboard/system/health`
   - Cards: Uptime, Error Count 24 h, Last Sync OK?, Recent Failures (list from agent_events).

4. **Verification**
   - `scripts/test/verifySystemHealth.mjs`  
     checks both tables and ensures `/api/system/health` → 200 OK.

---

## 🧠 Phase 30 – Weekly Agent Summary & Export
**Goal:** generate recurring insight reports.

1. **DB**
   - `weekly_summaries(id uuid pk, week_start date, report jsonb, created_at timestamptz default now())`

2. **API + Cron**
   - `/api/cron/weekly-summary` → runs every Monday 09:00 UTC.  
     - Calls `/api/agents/leaderboard`  
     - Produces Markdown summary (top agents + insights)  
     - Stores in `weekly_summaries`  
     - Sends email via Resend (`RESEND_API_KEY` env).

3. **Dashboard**
   - `/dashboard/weekly` page listing summaries; downloadable `.md`.

4. **Verification**
   - `scripts/test/verifyWeeklySummary.mjs` validates cron + report insertion.

---

## 🌍 Phase 31 – Public Leaderboard & Shareable Reports
**Goal:** turn internal data into public credibility.

1. **Public Endpoints**
   - `/public/leaderboard` (Next.js Server Component, SSR cached 10 min).  
   - `/public/agent/[id]` → shows one agent’s timeline, reflections, metrics.

2. **Security**
   - Read-only (RLS OFF) views:  
     ```sql
     CREATE VIEW public.v_leaderboard AS
       SELECT agent_id, rank_score, impact_avg, consistency_rank
       FROM agent_leaderboard;
     ```

3. **Design**
   - Minimal landing-style layout with CTA → Newsletter / Sign-Up.  
   - SEO meta for Twitter cards + OpenGraph.

4. **Verification**
   - `scripts/test/verifyPublicLeaderboard.mjs` ensures SSR pages render and return 200.

---

## 💰 Phase 32 – Auth & Credits Foundation
**Goal:** enable future SaaS monetization.

1. **DB**
   ```sql
   CREATE TABLE IF NOT EXISTS user_profiles (
     id uuid primary key default uuid_generate_v4(),
     email text unique,
     created_at timestamptz default now()
   );

   CREATE TABLE IF NOT EXISTS user_credits (
     id uuid pk default uuid_generate_v4(),
     user_id uuid references user_profiles(id),
     balance integer default 100,
     updated_at timestamptz default now()
   );
   NOTIFY pgrst,'reload schema';
````

2. **Auth**

   * Enable Supabase Auth (email magic link).
   * Add middleware `/middleware.ts` protecting `/dashboard/*`.
   * Expose `/api/auth/session` for frontend state.

3. **Credit Usage**

   * Middleware deducts 1 credit per API call that runs an agent.
   * Add credit display to navbar (`Balance: 42 credits`).

4. **Verification**

   * `scripts/test/verifyAuthCredits.mjs`:

     * Creates temp user via service key
     * Simulates deduction and checks balance update.

---

## 🧩 Shared Safeguards

* All migrations use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`.
* End every migration with `NOTIFY pgrst,'reload schema';`
* All verifiers print diagnostics instead of throwing.
* Keep migrations in `/scripts/migrations/` and never import into `/src`.

---

## 🧾 Deliverables

| File / Dir                                                      | Purpose                         |
| --------------------------------------------------------------- | ------------------------------- |
| `scripts/migrations/create_phase29_32_tables.sql`               | combined schema migration       |
| `src/app/api/system/health/route.ts`                            | Phase 29                        |
| `src/app/api/cron/weekly-summary/route.ts`                      | Phase 30                        |
| `src/app/api/public/leaderboard/route.ts`                       | Phase 31                        |
| `src/app/api/auth/session/route.ts`                             | Phase 32                        |
| `src/app/dashboard/system/health/page.tsx`                      | Phase 29 UI                     |
| `src/app/dashboard/weekly/page.tsx`                             | Phase 30 UI                     |
| `src/app/dashboard/agents/leaderboard/page.tsx`                 | extended with “Share Publicly”  |
| `src/lib/agents/health.ts`, `src/lib/agents/summary.ts`, etc.   | helper libs                     |
| `scripts/test/verifySystemHealth.mjs` … `verifyAuthCredits.mjs` | verifiers                       |
| `docs/phase29_32-runbook.md`                                    | run instructions + tag template |

---

## 🧠 Tagging & Docs

After all verifiers print ✅:

```bash
git add .
git commit -m "Phases 29–32 – Health, Summary, Public Leaderboard, Auth & Credits"
git tag -a phase29-32-initial -m "Phases 29–32 base system ready"
git push --follow-tags
```

---

### ✅ Expected Outcome

A self-healing, publicly visible Realwebwins platform:

* Agents tracked and ranked continuously
* Weekly summaries auto-emailed
* Public leaderboard showcasing results
* Authenticated users with basic credit system

```

---


