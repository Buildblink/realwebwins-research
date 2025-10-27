Perfect 💪
Here’s your complete **developer hand-off document** for the next sprint.

---

# 📘 REALWEBWINS_PHASE35_ROADMAP.md

**Phase 35 — “Control & Insight”**
*Goal: give builders (and the admin) full visibility and control over LLM providers, prompt testing, agent performance, and live streaming feedback.*

---

## ⚙️ 1️⃣  Schema & Migrations

### 📄 `scripts/migrations/create_phase35_admin_analytics.sql`

```sql
-- Phase 35 – Admin Settings + Analytics schema
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.system_settings (key, value)
VALUES ('llm_provider', '{"provider":"openai","model":"gpt-4o-mini","temperature":0.7}')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.agent_run_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agent_definitions(id) ON DELETE CASCADE,
  llm_provider text,
  llm_model text,
  tokens integer DEFAULT 0,
  duration_ms numeric DEFAULT 0,
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_run_metrics_agent_id
  ON public.agent_run_metrics(agent_id);

COMMENT ON TABLE public.system_settings IS 'Stores global app settings like default LLM provider/model.';
COMMENT ON TABLE public.agent_run_metrics IS 'Per-run telemetry for analytics dashboard.';

NOTIFY pgrst, 'reload schema';
```

### npm script

```json
"ensure:phase35-schema": "node --env-file .env.local scripts/runMigration.mjs scripts/migrations/create_phase35_admin_analytics.sql"
```

---

## 🧩 2️⃣  API Layer

### ✅ `/api/admin/settings/route.ts`

CRUD endpoints for system settings.

### ✅ `/api/admin/test-llm/route.ts`

Simple endpoint that runs `runLLM()` with the active provider.

### ✅ `/api/admin/analytics/route.ts`

Returns aggregated metrics:

```ts
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_run_metrics")
    .select("llm_provider, llm_model, duration_ms, success, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true, data });
}
```

---

## 🎨 3️⃣  Admin UI

### **`/admin/settings`**

Neon-themed panel for switching providers and models
→ Already outlined earlier; integrate `system_settings` table.

### **`/admin/analytics`**

Charts and tables using **Recharts**:

* Avg response time by provider
* Token cost over time
* Success/failure rates
* Top performing agents

File: `src/app/admin/analytics/page.tsx`

```tsx
"use client";
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState([]);
  useEffect(() => {
    fetch("/api/admin/analytics").then(res => res.json()).then(json => {
      if (json.success) setData(json.data);
    });
  }, []);

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">📊 Agent Performance Analytics</h1>
      <AreaChart width={700} height={300} data={data}>
        <defs>
          <linearGradient id="colorDur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00FFAA" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#00FFAA" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis dataKey="created_at"/>
        <YAxis/>
        <CartesianGrid strokeDasharray="3 3" />
        <Tooltip />
        <Area type="monotone" dataKey="duration_ms" stroke="#00FFAA" fillOpacity={1} fill="url(#colorDur)" />
      </AreaChart>
    </div>
  );
}
```

---

## 💬 4️⃣  Prompt Sandbox (`/studio/test`)

### File: `src/app/studio/test/page.tsx`

Features:

* Select agent from dropdown
* Inline editable prompt box
* Run test → show model name, time, and full output
* Save prompt version

---

## ⚡ 5️⃣  Streamed MVP Generation

### File: `src/app/api/mvp/generate/route.ts`

Add Server-Sent Events (SSE) for real-time updates:

```ts
import { runAgentsDynamic } from "@/lib/agents/network";
import { ReadableStream } from "node:stream/web";

export async function POST(req: Request) {
  const { pain_id } = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode("event: start\ndata: MVP generation started\n\n"));
      const agents = await runAgentsDynamic(pain_id);
      for (const entry of agents) {
        controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(entry)}\n\n`));
      }
      controller.enqueue(encoder.encode("event: end\ndata: done\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

Then `/studio` can consume this via an EventSource to show “typing bubbles” live.

---

## 🧠 6️⃣  Dev Console Debug

In `src/lib/agents/network.ts`, extend:

```ts
if (process.env.NODE_ENV !== "production") {
  console.log(`🧩 ${agent.name} (${agent.llm_provider}): ${result.content.slice(0, 80)}...`);
}
```

---

## 📦 7️⃣  Export Report Polish

### File: `src/app/api/export/mvp/[id]/route.ts`

Enhance ZIP structure:

```
/MVP.md
/validation.pdf
/conversation.json
/agents_used.json
/stats.txt
```

Add `agents_used.json`:

```ts
zip.file("agents_used.json", JSON.stringify(dynamicOutputs.map(a => ({
  agent: a.agent.name,
  provider: a.agent.llm_provider,
  model: a.agent.llm_model
})), null, 2));
```

---

## 🧰 8️⃣  Verifiers

### `scripts/test/verifyAdminSettings.mjs`

Validates `/api/admin/settings` CRUD and `/api/admin/test-llm`.

### `scripts/test/verifyAnalyticsFlow.mjs`

Checks `agent_run_metrics` entries after a few MVP generations.

---

## ✅ Phase 35 Completion Criteria

| Check | Goal                                               |
| ----- | -------------------------------------------------- |
| ⚙️    | `npm run ensure:phase35-schema` runs without error |
| 🧠    | `/admin/settings` can switch providers and test    |
| 📈    | `/admin/analytics` shows real data                 |
| 💬    | `/studio/test` runs single-agent prompt tests      |
| ⚡     | `/api/mvp/generate` streams results to UI          |
| 📦    | MVP export ZIP includes new metadata               |
| 🧪    | All verifiers return ✅                             |

---

