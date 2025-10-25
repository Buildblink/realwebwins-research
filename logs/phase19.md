Perfect — choice **(A) Autonomous Research Agents** ✅

This is the most powerful next step: agents that *read, analyze, and summarize your existing Supabase data* (pain points, cases, analytics, etc.), and produce new insights automatically (which later become social content or database enrichments).

Below is your **Phase 19 Implementation Plan** — ready to save and give directly to your coder.

---

## 🧠 Phase 19 — Autonomous Research Agents

**Goal:**
Turn Realwebwins into a self-learning research system where autonomous agents analyze your Supabase data, detect patterns, and generate structured insights (summaries, trends, recommendations).

---

### 1️⃣ Core Conceptnode scripts/verifyEnv.mjs


Each agent acts like a “research analyst”:

* **Input:** Reads from your Supabase tables (`pain_points`, `cases`, `analytics_metrics`, `workspace_outputs`)
* **Processing:** Uses your existing `agents/relay` system (OpenAI + Supabase)
* **Output:** Writes structured insights back into a new table: `agent_insights`

---

### 2️⃣ Database Changes

**File:** `scripts/migrations/create_agent_insights_table.sql`

```sql
CREATE TABLE IF NOT EXISTS agent_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_id UUID,
  insight_type TEXT,
  summary TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agent_insights ENABLE ROW LEVEL SECURITY;
```

✅  Index:

```sql
CREATE INDEX idx_agent_insights_source ON agent_insights (source_table, source_id);
```

---

### 3️⃣ New API Routes

#### `/api/agents/analyze`

* Loads fresh data (pain points, analytics, cases)
* Sends it to the relay
* Stores resulting insights in `agent_insights`

```ts
// src/app/api/agents/analyze/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { relayMessage } from "@/lib/agents"; // reuse from Phase 17

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: painPoints } = await supabase.from("pain_points").select("id, title, description").limit(5);

  const results = [];
  for (const point of painPoints || []) {
    const prompt = `Analyze this pain point and return key trends and insights:\n\n${point.title}\n${point.description}`;
    const reply = await relayMessage("agent_researcher", prompt);
    await supabase.from("agent_insights").insert({
      agent_id: "agent_researcher",
      source_table: "pain_points",
      source_id: point.id,
      insight_type: "trend_analysis",
      summary: reply,
      confidence: 0.9,
    });
    results.push({ point: point.id, reply });
  }

  return NextResponse.json({ success: true, results });
}
```

---

### 4️⃣ Dashboard Extension

#### File: `src/app/dashboard/agents/page.tsx`

Add a “Research Mode” section:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Autonomous Research Mode</CardTitle>
  </CardHeader>
  <CardContent>
    <Button onClick={() => fetch("/api/agents/analyze", { method: "POST" })}>
      Run Analysis
    </Button>
    <p className="text-zinc-400 mt-3 text-sm">
      The agent will analyze recent pain points and record insights below.
    </p>
  </CardContent>
</Card>
```

Add a new tab or section:

```tsx
<InsightsList />
```

New component:
`src/components/agents/InsightsList.tsx`

```tsx
export default function InsightsList() {
  const { data } = useSWR("/api/agents/insights", fetcher);
  return (
    <div className="mt-6 space-y-3">
      {data?.map((i) => (
        <div key={i.id} className="border border-white/10 rounded-xl p-4 bg-[#111113]">
          <p className="text-zinc-200">{i.summary}</p>
          <p className="text-xs text-zinc-500 mt-1">Confidence: {i.confidence}</p>
        </div>
      ))}
    </div>
  );
}
```

---

### 5️⃣ Supporting API

```ts
// src/app/api/agents/insights/route.ts
export async function GET() {
  const { data } = await supabase.from("agent_insights").select("*").order("created_at", { ascending: false });
  return NextResponse.json(data);
}
```

---

### 6️⃣ Verification Script

**File:** `scripts/test/verifyAgentInsights.mjs`

```js
import "dotenv/config";
import fetch from "node-fetch";

console.log("🤖  Phase 19 Agent Insights Verification");

const res = await fetch("http://localhost:3000/api/agents/analyze", { method: "POST" });
const json = await res.json();

if (json.success) {
  console.log(`✅  ${json.results.length} insights generated`);
} else {
  console.error("❌  Failed:", json);
}
```

✅ Expected output:

```
🤖  Phase 19 Agent Insights Verification
✅  5 insights generated
```

---

### 7️⃣ Environment Variables

Ensure your `.env.local` contains:

```
OPENAI_API_KEY=sk-...
OPENAI_AGENT_MODEL=gpt-4-turbo-preview
```

---

### 8️⃣ Test Checklist

| Step | Description                   | Expected Result                    |
| ---- | ----------------------------- | ---------------------------------- |
| ✅    | Run migration                 | `agent_insights` table appears     |
| ✅    | Trigger `/api/agents/analyze` | Inserts 3–5 insights               |
| ✅    | View `/dashboard/agents`      | “Research Mode” visible            |
| ✅    | Check Supabase                | Rows with summaries                |
| ✅    | Insights persist              | Agent conversations link correctly |

---


---

### ✅ Deliverables for Coder

* [ ] `scripts/migrations/create_agent_insights_table.sql`
* [ ] `src/app/api/agents/analyze/route.ts`
* [ ] `src/app/api/agents/insights/route.ts`
* [ ] `src/components/agents/InsightsList.tsx`
* [ ] `scripts/test/verifyAgentInsights.mjs`
* [ ] Update `dashboard/agents/page.tsx` to include “Research Mode”

---
