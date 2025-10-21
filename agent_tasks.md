# 🧠 RealWebWins Research — Agent Build Plan (v0.2)

**Goal:**  
Evolve the current MVP into an autonomous validation and execution agent.  
This file defines all coding tasks, routes, tables, and logic the agent must implement sequentially.

---

## ⚙️ 1️⃣ Self-Repair & Retry Engine

**Objective:**  
Ensure idea validation always returns valid data, retries when partial or failed, and logs all runs.

**Tasks:**
- Create `src/lib/researchAgent.ts` with:
  - 3 retry attempts on failed or incomplete generations.
  - Self-repair mechanism: regenerate only missing fields (verdict, market, competition).
  - Supabase logging table `AgentStatus { id, idea, stage, success, error_log, last_run }`.
- Integrate `researchAgent` into `/api/research/create`.
- Automatically retry on 429 / 500 errors.
- On success, store result + timestamp in Supabase.
- Verify `npm run build` passes and API returns JSON without errors.

---

## 🧩 2️⃣ Action Plan Generator

**Objective:**  
Convert validated research into an actionable 7-day plan for solo builders.

**Tasks:**
- Add new route: `src/app/api/actionplan/route.ts`
  - Accepts `{ project_id, research_json }`
  - Sends to Claude/Anthropic model to generate a Markdown 7-day plan.
  - Upsert result into Supabase table `ActionPlans { id, project_id, markdown, created_at }`.
- Update project page:
  - Add button **“Generate Action Plan”**
  - POST to `/api/actionplan`
  - Display Markdown output below report viewer.
- Validate with `npm run build` and local POST test.

---

## 📋 3️⃣ Agent Status Dashboard

**Objective:**  
Give visibility into the agent’s background operations.

**Tasks:**
- Create route `/agent/status` (or `/dashboard/agent`)  
- Fetch and display data from Supabase `AgentStatus` table (latest first).
- Show:
  - Idea
  - Stage (Success/Failed)
  - Timestamp
  - Short error log
- Add “Refresh” button to re-query Supabase.

---

## 💰 4️⃣ Monetization System (Stripe + Roles)

**Objective:**  
Add basic monetization logic for Free vs Pro users.

**Tasks:**
- Create `/pricing` page with two plans:
  - **Free:** 3 ideas max
  - **Pro:** Unlimited + Action Plan access
- Integrate Stripe checkout (test mode).
- Create Supabase table `Subscriptions { user_id, plan, active_until }`.
- Add plan check to dashboard:
  - Disable “Generate Action Plan” after 3 free runs.
  - Show “Upgrade to Pro” button.
- Load environment vars:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- Validate flow: checkout → webhook → update subscription in Supabase.

---

## 🔍 5️⃣ Trend Analyzer (Optional)

**Objective:**  
Automatically detect trending topics and keywords across all research.

**Tasks:**
- Add `/api/trends/analyze` route.
- Aggregate Supabase research data → summarize common keywords and markets.
- Store in table `Trends { id, summary, created_at }`.
- Display results in `/dashboard/top-trends`.
- (Optional) schedule daily run via Supabase cron.

---

## 🧠 General Instructions

**Rules for the Agent:**
- Follow tasks in numerical order.
- Use TypeScript, Next.js App Router, and Supabase client.
- Always confirm `npm run build` passes before moving to next section.
- Use descriptive console logs for debugging.
- Deploy after each successful phase with:
  ```bash
  vercel --prod
  ```
- Never delete existing working routes or components unless explicitly stated.

**Success Criteria:**
- No runtime or build errors.
- Research flow works end-to-end.
- Action Plans generate Markdown correctly.
- Agent logs appear in `/agent/status`.
- Monetization locks non-pro users after 3 free ideas.
- Trend Analyzer (optional) returns insights JSON.

---

✅ When complete, the app should function as an autonomous “validation + action” system with self-healing, analytics, and monetization built in.
