
---

## 🧠 Phase 24–25 — Reflection Loop & Feedback Optimization

### 🎯 Goal

Enable agents to **reflect** on their stored memories and **score** their own behaviors, creating a self-improving research network.
Each 24 h, agents will:

1. Review recent entries from `agent_memory`
2. Generate reflections summarizing what was learned
3. Assign confidence/impact scores to each behavior
4. Update `agent_behaviors` weights or disable low-impact routines

---

### 🧩 Schema Additions

**File:** `scripts/migrations/create_agent_reflections_table.sql`

```sql
create table if not exists public.agent_reflections (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  reflection text not null,
  behavior_id uuid references public.agent_behaviors(id) on delete set null,
  confidence numeric default 0.8,
  impact numeric default 0.0,
  created_at timestamp with time zone default now()
);

alter table public.agent_reflections enable row level security;
create policy "Allow service insert" on public.agent_reflections
  for insert using (auth.role() = 'service_role');
```

---

### ⚙️ Backend Implementation

#### 1️⃣  Reflection Generator

**File:** `src/lib/agents/reflection.ts`

* Fetch last N memory entries (`agent_memory`) for each agent.
* Build a reflection prompt:

  > “Summarize what the agent learned recently. Identify which behaviors contributed the most value.”
* Call OpenAI (using `OPENAI_AGENT_MODEL`)
* Insert into `agent_reflections`
* Return `{reflection, confidence, impact}`

#### 2️⃣  API Endpoint

**File:** `src/app/api/agents/reflect/route.ts`

```ts
POST → triggers reflection generation
GET  → lists recent reflections
```

Uses the service-role Supabase client and the `reflection.ts` helper.

#### 3️⃣  Feedback Optimizer

**File:** `src/lib/agents/feedback.ts`

* Fetch `agent_reflections` from the past 7 days
* Group by `behavior_id`
* Compute average impact
* If impact < 0.2 → set `enabled = false`
* If impact > 0.8 → boost confidence and log to `agent_insights`

#### 4️⃣  Cron Integration

**Files:**

* `src/app/api/cron/agents-reflect/route.ts` — daily reflections
* `src/app/api/cron/agents-feedback/route.ts` — weekly optimization
  Triggered via `WEEKLY_SUMMARY_SECRET`.

---

### 💻 Dashboard Extensions

**Files:**

* `/dashboard/agents/reflections/page.tsx`

  * List reflections (agent, date, snippet, impact score)
  * Add “Trigger Reflection” button
* `/dashboard/agents/behavior/page.tsx`

  * Display last impact score beside each behavior
  * Highlight high/low performers

---

### 🧪 Verification Scripts

**New scripts in `/scripts/test/`:**

1. `verifyAgentReflection.mjs`

   * Calls `/api/agents/reflect`
   * Checks `agent_reflections` table for new rows

2. `verifyAgentFeedback.mjs`

   * Simulates reflection data
   * Runs feedback optimizer
   * Verifies behavior rows updated

**Expected Output**

```
🤖  Phase 24 Reflection Verification
✓  Reflection generated and stored

🤖  Phase 25 Feedback Verification
✓  Behavior weights updated (2 improved, 1 disabled)
```

---

### ✅ Checklist Before Run

1. Run SQL migration for `agent_reflections`
2. Confirm `.env.local` includes `OPENAI_API_KEY` and `OPENAI_AGENT_MODEL`
3. Run sequentially:

   ```bash
   node --env-file=.env.local scripts/test/verifyAgentReflection.mjs
   node --env-file=.env.local scripts/test/verifyAgentFeedback.mjs
   ```
4. Confirm reflections appear at `/dashboard/agents/reflections`

---

### 📈 Expected Outcome

After this phase, your Realwebwins system will:

* Continuously **generate summaries** of agent learning
* **Score behaviors** automatically
* **Evolve** its research patterns weekly
* Display transparent insights and scores on-dashboard
