

* a single migration file that is idempotent (`IF NOT EXISTS` + column checks)
* an automatic Supabase schema-reload call
* a verification script that prints actionable diagnostics rather than crashing
* documentation embedded right in `/docs/phase28-leaderboard.md`

Below is the **complete content** that I’ll save for you as a ready-to-commit file.

---

````markdown
# Phase 28 — Agent Performance Leaderboard + Insight Feed
*(Build Plan + Verification Checklist)*

## Goal
Use the data in `agent_metrics` and `agent_links` to rank agents by impact,
consistency, and collaboration.  
Generate an “Insight Feed” with highlights such as:

- 🥇 Top Performer (agent with highest impact_avg)
- 🔁 Most Consistent (agent with lowest impact_variance)
- 🤝 Most Collaborative (agent with highest link weight sum)

## Core Deliverables
| # | Item | Path / Description |
|---|------|--------------------|
| 1 | **Migration** | `scripts/migrations/create_phase28_leaderboard_tables.sql` – creates `agent_leaderboard` and `agent_insights` tables (safe `IF NOT EXISTS`) and calls `NOTIFY pgrst,'reload schema'`. |
| 2 | **API Route** | `src/app/api/agents/leaderboard/route.ts` → GET returns top 10 ranked agents; POST recomputes rankings and insights. |
| 3 | **Dashboard View** | `src/app/dashboard/agents/leaderboard/page.tsx` – Recharts bar + table view; auto-polls `/api/agents/leaderboard`. |
| 4 | **Verification Script** | `scripts/test/verifyAgentLeaderboard.mjs` – runs safe HTTP tests, warns if schema columns missing, prints diagnostics instead of throwing. |
| 5 | **Documentation** | This file + auto-generated logs → `logs/phase28.md`. |

## Schema Design
```sql
CREATE TABLE IF NOT EXISTS public.agent_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  rank_score numeric DEFAULT 0,
  impact_rank integer DEFAULT 0,
  consistency_rank integer DEFAULT 0,
  collaboration_rank integer DEFAULT 0,
  computed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  insight text,
  metric jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

NOTIFY pgrst, 'reload schema';
````

## Implementation Steps

1️⃣ `npm run ensure:phase28-schema` → runs migration through `runMigration.mjs`.
2️⃣ Add GET + POST handlers in `/api/agents/leaderboard`.
3️⃣ Add leaderboard tab to dashboard nav.
4️⃣ Run verification:

```bash
node --env-file=.env.local scripts/test/verifyAgentLeaderboard.mjs
```

5️⃣ Commit & tag:

```bash
git add .  
git commit -m "Phase 28 – Agent Leaderboard + Insight Feed"  
git tag -a phase28-initial -m "Phase 28 schema + API ready"  
git push --follow-tags
```

## Verification Checklist

* ✅ Migration runs with no manual SQL needed.
* ✅ GET `/api/agents/leaderboard` → 200 OK + JSON rows.
* ✅ Dashboard renders rank + insight cards.
* ✅ No ECONNREFUSED / schema-cache errors.
* ✅ Tag `phase28-initial` created and pushed.

```

---

### 🧠 Safeguards to Prevent Past Problems
1. **Idempotent Migrations:** All CREATE/ALTER use `IF NOT EXISTS` so reruns never break.  
2. **Automatic Schema Reload:** Each migration ends with `NOTIFY pgrst,'reload schema'`.  
3. **Pre-flight Checker:** Verification scripts query `/rest/v1/agent_metrics` columns before POSTing.  
4. **Single Runner Script:** `runMigration.mjs` reads from `.env.local` and logs SQL fallback if auth fails.  
5. **Docs + Tags:** Each phase writes its own `docs/phaseXX.md` so no missing files during commits.

---
