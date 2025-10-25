# Phase 20-21 — Autonomous Agent Network & Daily Insight Loop

## 🎯 Overview
Phases 20-21 connect the Realwebwins research agents into a *self-organizing intelligence network*.
Each agent can now communicate with peers, share insights, and trigger daily autonomous analysis cycles.

**Goals:**
- Enable agent-to-agent messaging and knowledge linking.
- Visualize active agent connections in a network view.
- Automate daily autonomous loops that refresh insights.

---

## 🧱 1. SQL Migrations

### `scripts/migrations/create_agent_links_table.sql`
```sql
-- Phase 20: Agent Link Relationships
CREATE TABLE IF NOT EXISTS agent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_agent text NOT NULL,
  target_agent text NOT NULL,
  relationship text DEFAULT 'peer',
  context jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE agent_links IS 'Graph relationships between autonomous agents.';
CREATE INDEX IF NOT EXISTS idx_agent_links_source_target ON agent_links (source_agent, target_agent);
```

### `scripts/migrations/create_synced_insights_table.sql`
```sql
-- Phase 21: Synced Insights Cache
CREATE TABLE IF NOT EXISTS synced_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  related_agent text,
  summary text,
  confidence numeric DEFAULT 0.8,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE synced_insights IS 'Stores periodically synced insights between agents.';
CREATE INDEX IF NOT EXISTS idx_synced_insights_agent_id ON synced_insights (agent_id);
```

Run both migrations in Supabase SQL Editor or:
```bash
psql $DATABASE_URL -f scripts/migrations/create_agent_links_table.sql
psql $DATABASE_URL -f scripts/migrations/create_synced_insights_table.sql
```

---

## ⚙️ 2. API Routes

### `/api/agents/link/route.ts`
Creates or removes relationships between agents.

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { source_agent, target_agent, relationship } = await req.json();
  const supabase = createClient();
  const { data, error } = await supabase.from('agent_links').insert({
    source_agent,
    target_agent,
    relationship: relationship ?? 'peer'
  });

  if (error) return NextResponse.json({ success: false, error: error.message });
  return NextResponse.json({ success: true, data });
}

export async function GET() {
  const supabase = createClient();
  const { data } = await supabase.from('agent_links').select('*').order('created_at', { ascending: false });
  return NextResponse.json({ success: true, data });
}
```

### `/api/agents/network/route.ts`
Returns a summarized network graph.

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: links } = await supabase.from('agent_links').select('*');

  const nodes = Array.from(new Set(links.flatMap(l => [l.source_agent, l.target_agent]))).map(id => ({ id }));
  return NextResponse.json({ success: true, nodes, links });
}
```

### `/api/cron/agents-daily/route.ts`
Triggers the autonomous loop daily.

```ts
import { NextResponse } from 'next/server';
import { relayMessage } from '@/lib/agents';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: links } = await supabase.from('agent_links').select('*');

  for (const link of links ?? []) {
    await relayMessage({
      conversationId: link.id,
      senderAgent: link.source_agent,
      receiverAgent: link.target_agent,
      content: `Daily sync triggered between ${link.source_agent} and ${link.target_agent}`,
    });
  }

  return NextResponse.json({ success: true, count: links?.length ?? 0 });
}
```

---

## 🧠 3. Library Helper

### `src/lib/agents/network.ts`
Reusable logic for managing agent graphs.

```ts
import { createClient } from '@/lib/supabase/server';

export async function getAgentNetwork() {
  const supabase = createClient();
  const { data: links } = await supabase.from('agent_links').select('*');
  const nodes = Array.from(new Set(links.flatMap(l => [l.source_agent, l.target_agent]))).map(id => ({ id }));
  return { nodes, links };
}
```

---

## 🖥️ 4. Dashboard UI

### `src/app/dashboard/agents/network/page.tsx`
A simple network visualization using D3 or lightweight SVG.

```tsx
'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function AgentNetworkPage() {
  const [graph, setGraph] = useState({ nodes: [], links: [] });

  useEffect(() => {
    fetch('/api/agents/network')
      .then(res => res.json())
      .then(setGraph);
  }, []);

  return (
    <div className="p-8 bg-[#060608] min-h-screen text-zinc-200">
      <h1 className="text-2xl font-semibold mb-4 text-indigo-400">Agent Network</h1>
      <div className="space-y-2">
        {graph.links.map((l: any) => (
          <motion.div key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {l.source_agent} → {l.target_agent} ({l.relationship})
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🧪 5. Verification Scripts

### `scripts/test/verifyAgentNetwork.mjs`
```js
import 'dotenv/config';
import fetch from 'node-fetch';

console.log('\n🤖  Phase 20 Network Verification');

const res = await fetch('http://localhost:3000/api/agents/network');
const data = await res.json();
console.log('✅ Agent network fetched:', data.nodes.length, 'nodes');
```

### `scripts/test/verifyAgentLoop.mjs`
```js
import 'dotenv/config';
import fetch from 'node-fetch';

console.log('\n🤖  Phase 21 Daily Loop Verification');

const res = await fetch('http://localhost:3000/api/cron/agents-daily', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.WEEKLY_SUMMARY_SECRET}` },
});

const data = await res.json();
console.log('✅ Daily loop triggered for', data.count, 'links');
```

---

## 🧾 6. Deployment Instructions

```bash
git add .
git commit -m "Phase 20-21 — Autonomous Agent Network + Daily Insight Loop"
git push origin main
vercel --prod --force
```

---

## ✅ Expected Outcomes
- **agent_links** and **synced_insights** tables live in Supabase.
- `/api/agents/network` returns a live graph of agent relationships.
- `/dashboard/agents/network` visualizes those connections.
- `/api/cron/agents-daily` runs successfully to relay inter-agent messages.
- Verified locally with `verifyAgentNetwork.mjs` and `verifyAgentLoop.mjs`.

---

## 🧭 Next Phase (22 — Memory & Reasoning)
- Introduce **persistent agent memory** stored in Supabase JSONB.
- Add reasoning summaries and reflection prompts.
- Integrate AI reasoning pipelines for strategic planning.

