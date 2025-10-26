# Phase 28 — Agent Performance Leaderboard + Insight Feed

> Build Plan + Verification Checklist

## Goal
Leverage `agent_metrics` and `agent_links` to rank agents by impact, consistency, and collaboration.  
Generate an “Insight Feed” highlighting:

- ✅ Top Performer (highest `impact_avg`)
- ✅ Most Consistent (lowest `impact_variance`)
- ✅ Most Collaborative (highest collaboration weight sum)

## Core Deliverables

| # | Item | Path / Description |
|---|------|--------------------|
| 1 | **Migration** | `scripts/migrations/create_phase28_leaderboard_tables.sql` — ensures `agent_leaderboard` storage, augments `agent_insights`, triggers schema reload. |
| 2 | **API Route** | `src/app/api/agents/leaderboard/route.ts` — `GET` for top ranks, `POST` to recompute scores + insights. |
| 3 | **Dashboard View** | `src/app/dashboard/agents/leaderboard/page.tsx` — table + bar chart with auto-polling insight cards. |
| 4 | **Verification Script** | `scripts/test/verifyAgentLeaderboard.mjs` — schema guardrails, POST + GET smoke test with human-readable diagnostics. |
| 5 | **Logs + Docs** | This file plus `logs/phase28.md` to capture run notes. |

## Schema Design

```sql
CREATE TABLE IF NOT EXISTS public.agent_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  rank_score numeric DEFAULT 0,
  impact_rank integer DEFAULT 0,
  consistency_rank integer DEFAULT 0,
  collaboration_rank integer DEFAULT 0,
  impact_avg numeric DEFAULT 0,
  impact_variance numeric DEFAULT 0,
  collaboration_weight_sum numeric DEFAULT 0,
  computed_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_insights
  ADD COLUMN IF NOT EXISTS insight text,
  ADD COLUMN IF NOT EXISTS metric jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS category text;

NOTIFY pgrst, 'reload schema';
```

## Implementation Steps

1. `npm run ensure:phase28-schema` — runs migration via `runMigration.mjs`.
2. Implement GET + POST handlers in `/api/agents/leaderboard`.
3. Add leaderboard tab + dashboard view with Recharts visualization.
4. Run verification suite:  
   `node --env-file=.env.local scripts/test/verifyAgentLeaderboard.mjs`
5. Ship it:  
   ```
   git add .
   git commit -m "Phase 28 — Agent Leaderboard + Insight Feed"
   git tag -a phase28-initial -m "Phase 28 schema + API ready"
   git push --follow-tags
   ```

## Verification Checklist

- ☐ Migration executes without manual SQL.
- ☐ `POST /api/agents/leaderboard` recomputes ranks + insights.
- ☐ `GET /api/agents/leaderboard` returns top rows.
- ☐ Dashboard renders table, chart, and insight cards.
- ☐ Tag `phase28-initial` created and pushed.

## Safeguards

1. **Idempotent SQL** — every `CREATE` / `ALTER` uses `IF NOT EXISTS`.
2. **Schema Reload** — migrations notify PostgREST automatically.
3. **Pre-flight Checks** — verification script inspects REST columns before POSTing.
4. **Central Runner** — `runMigration.mjs` continues to provide fallback SQL if credentials are missing.
5. **Docs + Tags** — phase documentation captures deliverables and deployment commands.
