# Phase 22–23 — Autonomous Behavior & Shared Memory

## Phase 22 — Autonomous Behavior Loops

### Goal
Give each agent the ability to act periodically (daily or triggered) — like micro-workers that review pain points, analytics, or user data and post insights automatically.

### 1. New Table: agent_behaviors
**File:** scripts/migrations/create_agent_behaviors_table.sql
```sql
create table if not exists public.agent_behaviors (
  id uuid primary key default uuid_generate_v4(),
  agent_id text not null,
  trigger_type text not null,            -- e.g. "daily", "event", "manual"
  action text not null,                  -- description of what to execute
  status text default 'idle',            -- idle / running / failed / complete
  last_run timestamptz,
  created_at timestamptz default now()
);
alter table public.agent_behaviors enable row level security;
create policy "Allow service insert" on public.agent_behaviors for insert using (true);
```

### 2. New API Route
**File:** src/app/api/agents/behavior/route.ts  
Handles behavior registration + manual triggering  
On POST, runs the configured “action” (calls existing `/agents/analyze` or `/agents/relay`)  
Logs results into `agent_insights`

### 3. Daily Cron
**File:** src/app/api/cron/agents-behavior/route.ts  
Runs daily (through Vercel cron or manual trigger).  
Fetches all behaviors where `trigger_type='daily'` and executes them sequentially.

### 4. Dashboard Integration
**File:** src/app/dashboard/agents/behavior/page.tsx  
Lists all behaviors, status, last_run, and includes a “Run Now” button.

### 5. Verification Script
**File:** scripts/test/verifyAgentBehavior.mjs  
- Inserts one behavior  
- Calls the behavior endpoint  
- Confirms new record in `agent_insights`

---

## Phase 23 — Shared Memory & Knowledge Sync

### Goal
Allow agents to share insights via a central “memory pool” — a lightweight distributed knowledge base using Supabase.

### 1. New Table: agent_memory
**File:** scripts/migrations/create_agent_memory_table.sql
```sql
create table if not exists public.agent_memory (
  id uuid primary key default uuid_generate_v4(),
  agent_id text not null,
  topic text not null,
  content text not null,
  relevance numeric default 1.0,
  last_updated timestamptz default now()
);
alter table public.agent_memory enable row level security;
create index on public.agent_memory (topic);
```

### 2. Sync API
**File:** src/app/api/agents/memory/route.ts  
- GET: fetch memories by topic or agent  
- POST: insert/update memory entries  
- POST /sync: aggregates new insights from `agent_insights` into memory

### 3. Network Sync Cron
**File:** src/app/api/cron/agents-sync/route.ts  
Runs daily after `agents-daily`.  
Collects top insights and updates shared topics in `agent_memory`.

### 4. Dashboard UI
**File:** src/app/dashboard/agents/memory/page.tsx  
Displays memory topics and allows filtering by agent or keyword.

### 5. Verification Scripts
- **scripts/test/verifyAgentMemory.mjs** → ensures inserts, updates, and sync run successfully  
- **scripts/test/verifyAgentSync.mjs** → runs daily sync simulation across agents

---

## Expected Outcomes
✅ Agents now act autonomously via defined behaviors  
✅ Shared “memory” accessible across agents and dashboards  
✅ Behavioral logs appear in `agent_behaviors`  
✅ New insights propagate to `agent_memory`  
✅ Daily sync keeps all agents contextually aware  

---

## Deployment Steps
```bash
npm run lint && npm run build
git add . && git commit -m "Phase 22–23 – Autonomous Behavior + Shared Memory"
git push origin main
node --env-file=.env.local scripts/test/verifyAgentBehavior.mjs
node --env-file=.env.local scripts/test/verifyAgentMemory.mjs
```
Then verify visually:
- `/dashboard/agents/behavior`
- `/dashboard/agents/memory`
