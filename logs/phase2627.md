Perfect ✅ — we’ll skip the relay repair (you can always revisit it when “agent-to-agent messaging” becomes useful) and move forward into **Phase 26 – 27: Autonomous Self-Tuning + Cross-Agent Collaboration**.

---

## ⚙️ PHASE 26–27 — Implementation Plan

**Goal:**
Make the system *self-optimizing over time* and allow agents to *collaborate* by triggering each other intelligently.

---

### 🧩 1. Schema Additions (SQL migrations)

#### a) `agent_metrics`

Tracks performance trends for each agent.

```sql
-- scripts/migrations/create_agent_metrics_table.sql
create table if not exists agent_metrics (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  average_impact numeric default 0,
  consistency numeric default 0,
  last_tune_at timestamp with time zone default now(),
  reflection_count integer default 0,
  behavior_count integer default 0,
  meta jsonb default '{}',
  created_at timestamp with time zone default now()
);

create index if not exists idx_agent_metrics_agent_id on agent_metrics (agent_id);

alter table agent_metrics enable row level security;
create policy "service-role insert/select" on agent_metrics
  for all using (true) with check (true);
```

#### b) `agent_links`

Defines cross-agent collaboration.

```sql
-- scripts/migrations/create_agent_links_table.sql
create table if not exists agent_links (
  id uuid primary key default gen_random_uuid(),
  source_agent text not null,
  target_agent text not null,
  collaboration_type text check (
    collaboration_type in ('relay','assist','analyze')
  ) not null,
  strength numeric default 0.5,
  created_at timestamp with time zone default now()
);

create index if not exists idx_agent_links_source_target
  on agent_links (source_agent, target_agent);
```

---

### 🧠 2. Backend Logic

#### `/api/agents/metrics`

Compute & store averages based on recent reflections.

```ts
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function POST() {
  const supabase = getSupabaseAdminClient();

  const { data: reflections } = await supabase
    .from("agent_reflections")
    .select("agent_id, metadata");

  const grouped = Object.groupBy(reflections ?? [], r => r.agent_id);
  const metrics = Object.entries(grouped).map(([agent, list]) => {
    const impacts = list.map(l => l.metadata?.impact ?? 0);
    const avg = impacts.reduce((a,b)=>a+b,0)/impacts.length || 0;
    const variance = impacts.map(i => (i-avg)**2).reduce((a,b)=>a+b,0)/impacts.length || 0;
    const consistency = 1 - Math.min(1, Math.sqrt(variance));
    return { agent_id: agent, average_impact: avg, consistency, reflection_count: list.length };
  });

  for (const row of metrics)
    await supabase.from("agent_metrics").upsert(row, { onConflict: "agent_id" });

  return NextResponse.json({ success: true, updated: metrics.length });
}
```

#### `/api/agents/collaborate`

Trigger linked agents based on collaboration type.

```ts
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { runBehavior } from "@/lib/agents/behaviors";

export async function POST(request: Request) {
  const { source_agent } = await request.json().catch(() => ({}));
  if (!source_agent)
    return NextResponse.json({ success: false, error: "Missing source_agent" }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { data: links } = await supabase
    .from("agent_links")
    .select("*")
    .eq("source_agent", source_agent);

  const results = [];
  for (const link of links ?? []) {
    try {
      const outcome = await runBehavior(
        { agent_id: link.target_agent, action_type: link.collaboration_type },
        { trigger: "collaborate" }
      );
      results.push({ link, success: true, outcome });
    } catch (err) {
      results.push({ link, success: false, error: String(err) });
    }
  }

  return NextResponse.json({ success: true, results });
}
```

---

### 📊 3. Dashboard Enhancements

#### `/dashboard/agents/analytics`

* Add chart “**Performance Over Time**” showing `average_impact` vs. date.
* Display “consistency score” gauge next to each agent.

#### `/dashboard/agents/network`

* Visualize `agent_links` as a **collaboration graph**.
  (Use `recharts` or `force-graph` – show nodes as agents, edges as link type.)

---

### 🧪 4. Verification Scripts

#### a) `scripts/test/verifyAgentMetrics.mjs`

```js
import "dotenv/config";
import fetch from "node-fetch";
console.log("\n🤖 Phase 26 Metrics Verification");

const res = await fetch("http://localhost:3000/api/agents/metrics", { method: "POST" });
const json = await res.json();
if (!res.ok) throw new Error(JSON.stringify(json));
console.log(`✓ Metrics updated for ${json.updated} agents`);
```

#### b) `scripts/test/verifyAgentCollaboration.mjs`

```js
import "dotenv/config";
import fetch from "node-fetch";
console.log("\n🤖 Phase 27 Collaboration Verification");

const res = await fetch("http://localhost:3000/api/agents/collaborate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ source_agent: "agent_researcher" })
});
const json = await res.json();
if (!res.ok) throw new Error(JSON.stringify(json));
console.log(`✓ Collaboration executed across ${json.results.length} links`);
```

---

### 🪄 5. Expected Outcome

After running migrations + scripts:

✅ New `agent_metrics` table shows each agent’s long-term scores.
✅ `agent_links` defines “who can trigger whom.”
✅ Clicking “Run Now → Analyze” automatically logs a reflection *and* updates metrics.
✅ `POST /api/agents/collaborate` shows agents working together end-to-end.

---
