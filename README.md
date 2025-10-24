# Realwebwins Research System

## Setup
- Copy `.env.local.example` to `.env.local`.
- Provide the following environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - Optionally `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` to enable analytics.
- Install dependencies with `npm install`.

## Local Development
- Run `npm run dev` and open `http://localhost:3000`.
- When Supabase credentials are missing, a local JSON-backed stub is used so you can prototype without network access.

## Supabase Policies & Keys

- The refresh CLI now uses the anon key for read-only queries and the service-role key exclusively for `UPDATE`/`INSERT` operations. Ensure `SUPABASE_SERVICE_ROLE_KEY` remains present in `.env.local` so write paths can bypass RLS.
- If the SQL Execution API (`/postgres/v1`) is disabled for your Supabase project, `npm run ensure:refresh-schema` will report `requested path is invalid`. In that case, open the Supabase SQL editor and run:
  ```sql
  CREATE POLICY "Allow service role updates"
    ON public.research_projects
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);
  ```
  Drop the legacy policy named "Allow service role to update refresh time" if it still exists to avoid duplicates.
- To audit existing policies, run `node --env-file=.env.local scripts/listPolicies.mjs`. Projects without the SQL Execution API enabled will print the same `requested path is invalid` message noted above.

## Background Research Refresh
- Prepare Supabase by running `npm run ensure:refresh-schema` once; this adds the `is_tracked` flag, `last_refreshed_at` column, and service-role update policy.
- Trigger a manual refresh locally with `npm run ensure:refresh`. The script reads `.env.local` and calls `/api/cron/research-refresh`.
- Optional environment overrides:
  - `RESEARCH_REFRESH_ENDPOINT` to point at a hosted deployment (defaults to `http://localhost:3000/api/cron/research-refresh`).
  - `CRON_SECRET` or `RESEARCH_REFRESH_SECRET` to send an `Authorization: Bearer` header.
- Schedule the job in production:
  1. **Vercel Cron** � `vercel cron add "0 9 * * MON" "/api/cron/research-refresh"` (runs every Monday 9am UTC).
  2. **GitHub Actions** � add a workflow:
     ```yaml
     name: Refresh research
     on:
       schedule:
         - cron: "0 9 * * MON"
     jobs:
       trigger:
         runs-on: ubuntu-latest
         steps:
           - name: Call Realwebwins refresh endpoint
             run: |
               curl -X POST \
                 -H "Authorization: Bearer ${{ secrets.RESEARCH_REFRESH_SECRET }}" \
                 ${{ secrets.RESEARCH_REFRESH_ENDPOINT }}
     ```
- The refresh route logs activity to the `AgentStatus` table (`stage = refresh`) and updates tracked projects with the latest research snapshot.

## System Verification
- Run `npm run verify:system` to check Supabase connectivity, AgentStatus freshness, tracked project updates, vault feed health, and required environment variables.
- The `/api/cron/verify` endpoint performs the same checks for remote automation; POSTing returns a JSON payload like:
  ```json
  {
    "success": true,
    "summary": {
      "supabase": "ok",
      "agentStatus": "ok",
      "trackedProjects": 3,
      "trackedProjectsTotal": 4,
      "vaultFeed": "ok",
      "aiProvider": "local",
      "missingEnv": []
    },
    "durationMs": 540
  }
  ```
- Optional automation: add a `vercel.json` with `{"crons":[{"path":"/api/cron/verify","schedule":"0 4 * * *"}]}` to run verification daily in production.

## Phase 15 Viral Growth Verification

**Status:** ✅ PASSED (October 23, 2025)

Phase 15 introduces viral growth features: Remix, Referrals, Affiliate tracking, and Weekly Automation.

### Quick Verification
```bash
# Run all Phase 15 tests
node --env-file=.env.local scripts/test/verifyPhase15Database.mjs
node --env-file=.env.local scripts/test/testReferral.mjs
node --env-file=.env.local scripts/test/testAffiliate.mjs
node --env-file=.env.local scripts/test/testWeeklySummary.mjs
```

### API Endpoints Tested
- ✅ **POST /api/referral** - Tracks referral clicks with IP hashing, increments user credits (+1)
- ✅ **POST /api/affiliate** - Logs affiliate tool clicks with metadata (workspace, playbook, ref)
- ✅ **POST /api/cron/weekly-summary** - Generates weekly newsletter (requires `WEEKLY_SUMMARY_SECRET`)
- ⚠️ **POST /api/remix/[workspaceId]** - Clones published workspaces (requires published workspace for testing)

### Database Tables
| Table | Purpose | Test Rows |
|-------|---------|-----------|
| `workspace_remixes` | Workspace cloning tracking | 0 |
| `referral_clicks` | Referral link clicks (SHA-256 hashed IPs) | 2 |
| `affiliate_clicks` | Affiliate tool link tracking | 1 |
| `user_credits` | User credit balance | 1 |

### Known Issues Resolved
1. **Column Types**: Changed `referrer_user_id` and `user_id` from `uuid` to `text` to support arbitrary referral codes
2. **Foreign Key Ambiguity**: Fixed Supabase query in `runWeeklySummary.mjs` to specify `public_workspaces_workspace_id_fkey`
3. **Test Parameters**: Fixed `testReferral.mjs` (`targetPath` → `target`) and `testAffiliate.mjs` (`tool` → `toolName`)

See [docs/phase15-verification-results.md](docs/phase15-verification-results.md) for detailed test results and troubleshooting steps.

## Analytics & Weekly Aggregation

**Status:** ✅ Production Ready (Phase 15.1)

Phase 15.1 introduces automated weekly aggregation of viral growth metrics into the `analytics_metrics` table.

### Metrics Tracked

| Metric | Source | Aggregation | Description |
|--------|--------|-------------|-------------|
| **remix** | `workspace_remixes` | COUNT | Workspaces cloned this week |
| **referral** | `referral_clicks` | COUNT | Referral link clicks this week |
| **affiliate** | `affiliate_clicks` | COUNT | Affiliate tool clicks this week |
| **credits** | `user_credits` | SUM | Total credits distributed (cumulative) |

### API Endpoints

#### Manual Aggregation
```bash
# Trigger manual aggregation (doesn't save to DB)
POST /api/analytics/aggregate
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "metric_type": "remix", "value": 3, "period_start": "...", "period_end": "..." },
    { "metric_type": "referral", "value": 5, "period_start": "...", "period_end": "..." }
  ],
  "period": { "start": "2025-10-20T00:00:00Z", "end": "2025-10-26T23:59:59Z" }
}
```

#### Weekly Cron Aggregation
```bash
# Automated weekly aggregation (saves to analytics_metrics)
POST /api/cron/analytics-weekly
Authorization: Bearer ${WEEKLY_SUMMARY_SECRET}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully aggregated 4 metrics",
  "metrics": { "aggregated": 4, "failed": 0 },
  "period": { "start": "...", "end": "..." }
}
```

### Database Schema

```sql
analytics_metrics:
  - id (uuid)
  - metric_type (text): remix | referral | affiliate | credits
  - period_start (timestamptz): Monday 00:00 UTC
  - period_end (timestamptz): Sunday 23:59 UTC
  - value (integer): Aggregated count or sum
  - metadata (jsonb): Additional context
  - created_at, updated_at (timestamptz)
```

### Verification

```bash
# Run analytics verification test
node --env-file=.env.local scripts/test/verifyAnalytics.mjs
```

**Expected Output:**
```
✅ Manual aggregation succeeded
   Metrics:
      - remix: 3
      - referral: 5
      - affiliate: 2
      - credits: 8

✅ Cron aggregation succeeded
✅ Found 4 metric records
✅ AgentStatus logging functional
```

### Cron Setup

**Production (Vercel):**
The cron job runs automatically every Monday at 00:00 UTC via `vercel.json` configuration.

**Local Testing:**
```bash
# Trigger cron manually
curl -X POST \
  -H "Authorization: Bearer ${WEEKLY_SUMMARY_SECRET}" \
  http://localhost:3000/api/cron/analytics-weekly
```

### Environment Variables

```bash
WEEKLY_SUMMARY_SECRET=your-secret-key  # Required for cron auth
```

### Monitoring

All aggregation runs are logged to `AgentStatus` with:
- `idea: 'viral-growth'`
- `stage: 'aggregate'` (manual) or `'cron'` (automated)
- `success: true/false`
- `meta:` JSON with period, metrics, and errors

Query recent runs:
```sql
SELECT * FROM "AgentStatus"
WHERE idea = 'viral-growth'
ORDER BY created_at DESC
LIMIT 10;
```

### Troubleshooting

**Issue:** "No metrics returned"
- **Solution:** Ensure Phase 15 tables have data (run Phase 15 verification tests)

**Issue:** "Cron returns 401 Unauthorized"
- **Solution:** Verify `WEEKLY_SUMMARY_SECRET` environment variable matches

**Issue:** "Credits value is 0"
- **Solution:** Users must have non-zero balance in `user_credits` table

**Issue:** "UNIQUE constraint violation"
- **Solution:** Cron tried to insert duplicate week - this is expected for retries

## Local QA
- Use `npm run refresh:research` to simulate refreshes locally. The CLI prints per-project status (refreshed, simulated, failed), updates Supabase when a service role key is present, and exits with a non-zero code only if a refresh fails.
- Run `npm run diagnose:system` to check whether diagnostics report the app as online, partially degraded, or offline before running automation.
- Configure optional alerts by setting `SLACK_WEBHOOK_URL` for Slack notifications, and `RESEND_API_KEY` + `ALERT_EMAIL` (plus optional `ALERT_EMAIL_FROM`) for email fallbacks. Alerts fire when refresh runs report failures or a non-ok status.
- Use `npm run summary:logs` to print the recent AgentStatus dashboard (shows refresh runs, verification checks, and alerts using Supabase or local fallback logs).
- `AgentStatus` rows now include `run_type`, `passed`, and `summary`. When Supabase logging fails, entries are appended to `./logs/agentstatus-fallback.json`. Example summary entry:
  ```json
  {
    "idea": "auto-refresh",
    "stage": "run-summary",
    "run_type": "cron",
    "success": true,
    "passed": true,
    "summary": "{\"projects_checked\":3,\"refreshed\":2,\"simulated\":1,\"failures\":0,\"status\":\"ok\",\"average_score\":82,\"timestamp\":\"2025-10-20T10:00:00.000Z\"}"
  }
  ```

## Research Agent Integration
- The cron/CLI refresh paths call `src/agents/runResearchAgent.ts`, which is the future hook for LLM or external research summarisation.
- `runResearchAgent` currently queries `src/lib/vault/queryVault.ts` (placeholder returning `{ sources: [], notes: 'vault not yet connected' }`) and then produces a simulated markdown/verdict so the pipeline remains idempotent.
- When wiring real research logic, provide environment variables such as `VAULT_SUPABASE_URL`, `VAULT_SUPABASE_KEY`, or other API keys (e.g., `LLM_API_KEY`) and update `queryVault` / `runResearchAgent` to pull and summarise real data. If those services are offline, the agent keeps generating simulated output automatically.

## Validation Metrics
- Every refresh run now computes a `validation_score` (0-100) via `src/lib/validation/computeScore.ts`, storing both `validation_score` and a `validation_snapshot` JSON payload on `research_projects`.
- The snapshot captures the score, reason, verdict, and timestamp so downstream dashboards can benchmark changes. Real agents can override `computeValidationScore` with richer heuristics or model-based scoring later.
- AgentStatus summaries include these fields, and `npm run summary:logs` surfaces the latest scores to help spot regressions quickly.

## Analytics
- The layout ships with [Plausible](https://plausible.io) tracking. Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (for example, `realwebwins.app`) in both local and production environments.
- Once the variable is present, page views for `/research` and `/dashboard` are tracked automatically - no extra code changes required.

## Feedback Storage
- Feedback submissions are persisted to Supabase table `feedback`. Create it with:

  ```sql
  create table feedback (
    id uuid primary key default gen_random_uuid(),
    name text,
    message text not null,
    rating int,
    created_at timestamptz not null default now()
  );
  ```

- Ensure your Supabase Row Level Security policies allow inserts for the application role, or rely on the local stub in development.

## Testing
- End-to-end tests use [Playwright](https://playwright.dev/).
  - Install browsers once: `npx playwright install`
  - Run the suite: `npm run test`
- The configuration starts `npm run dev` on an ephemeral port and covers the `/research` submission flow end-to-end, including dashboard verification.
- Vercel preview builds can run the same command to catch regressions before production deploys.

## Deploying on Vercel
1. Push the repository to GitHub.
2. In Vercel, import the repo and select the `main` branch.
3. Set environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (required for server-side inserts when not using the stub)
   - `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (optional analytics)
   - Enable analytics and feedback by configuring these variables in the Vercel dashboard.
4. Deploy—Vercel runs `npm run build` and serves the standalone output automatically.

















## Pain Point Explorer

The Pain Point Explorer is the core discovery layer for Realwebwins. It aggregates real creator struggles from Reddit, IndieHackers, and other sources, then links them to playbook solutions and case studies.

### Setup Pain Points Table

1. Create the `pain_points` table in Supabase:
   ```bash
   npm run ensure:pain-points
   ```

   If the SQL Execution API is disabled for your Supabase project, manually run the SQL in `scripts/migrations/create_pain_points_table.sql` using the Supabase SQL Editor.

2. Seed initial pain point data:
   ```bash
   npm run seed:pain-points
   ```

   This imports ~30 curated pain points from `data/pain_points_seed.csv`.

### Pain Points API

**Endpoint:** `/api/pain-points`

**Query Parameters:**
- `search` – full-text search on pain point text
- `category` – filter by category (Marketing, Monetization, Growth, etc.)
- `niche` – filter by niche (YouTubers, Etsy Sellers, Freelancers, etc.)
- `source` – filter by source (Reddit, IndieHackers, X)
- `page` – page number (default: 1)
- `pageSize` – results per page (default: 20)

**Example:**
```bash
curl "http://localhost:3000/api/pain-points?category=Marketing&niche=YouTubers&page=1"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "text": "Can't grow YouTube channel beyond 1K subscribers",
      "category": "Growth",
      "niche": "YouTubers",
      "source": "Reddit",
      "frequency": 5,
      "proof_link": "https://reddit.com/r/YouTubers",
      "related_playbook": "Audience Growth Playbook",
      "last_seen": "2025-10-20T12:00:00Z",
      "created_at": "2025-10-20T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 30,
    "totalPages": 2
  }
}
```

### Adding New Pain Points

Edit `data/pain_points_seed.csv` and re-run `npm run seed:pain-points`, or insert directly via Supabase dashboard.

---

## Playbooks (Solution Guides)

Playbooks are actionable solution guides that show how to solve specific pain points. They link pain points → solutions → case studies → tools.

### Setup Playbooks Table

1. Create the `playbooks` table in Supabase:
   ```bash
   npm run ensure:playbooks-v2
   ```

   If the SQL Execution API is disabled, manually run the SQL in `scripts/migrations/create_playbooks_table.sql` using the Supabase SQL Editor.

2. Seed playbook data:
   ```bash
   npm run seed:playbooks
   ```

   This imports 10 comprehensive playbooks from `data/playbooks_seed.csv`.

### Playbooks API

**Endpoint:** `/api/playbooks`

**Query Parameters:**
- `category` – filter by category (Marketing, Monetization, Growth, etc.)
- `niche` – filter by niche (YouTubers, Etsy Sellers, Freelancers, etc.)
- `page` – page number (default: 1)
- `pageSize` – results per page (default: 20)

**Example:**
```bash
curl "http://localhost:3000/api/playbooks?category=Growth&niche=YouTubers"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "YouTube Growth Playbook: 0 to 1K Subscribers",
      "slug": "youtube-growth-0-to-1k",
      "description": "Proven strategies to get your first 1000 YouTube subscribers",
      "category": "Growth",
      "niche": "YouTubers",
      "tools": [{"name": "TubeBuddy", "link": "https://tubebuddy.com"}],
      "affiliate_links": [],
      "created_at": "2025-10-20T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

### Playbook Pages

- **Detail Page:** `/playbook/[slug]` – Full playbook with markdown content, tools, related pain point, and case study
- Pain points automatically link to their related playbooks

### Adding New Playbooks

Edit `data/playbooks_seed.csv` with new playbooks (tools and affiliate_links are JSON arrays), then re-run `npm run seed:playbooks`.

---

## Export & Newsletter Scripts

```bash
npm run export:feed          # Generate JSON dataset
npm run export:newsletter    # Generate newsletter draft
npm run generate:cards       # Render visual cards from the feed
npm run export:tweets        # Produce tweet snippets
```

## Newsletter Environment Variables
- `NOTION_API_KEY` � optional; connect future Notion exports.
- `NOTION_DB_ID` � optional; identifies the Notion database when API mode is enabled.
- `NEWSLETTER_MODE` � set to `manual` (default) or `api` to toggle upcoming automation features.
- `CARD_CDN_BASE` � optional CDN base URL for rendered card images.
- `BRAND_COLOR_PRIMARY` / `BRAND_COLOR_SECONDARY` � override gradient colours for cards.
- `CARD_TEMPLATE_PATH` � override the template directory used by the card generator.
- `CASE_BASE_URL` � base URL for case study pages when exporting tweet snippets.

## Automations � Newsletter & Feed
1. Run `npm run refresh:research` to generate the latest research snapshots.
2. Run `npm run export:feed` to cache tracked projects in `exports/realwebwins_feed.json`.
3. Run `npm run generate:cards` to render social/shareable card images.
4. Run `npm run export:newsletter -- --include-cards` (optional) to embed card images in the draft.
5. Run `npm run export:tweets` to seed social snippets.
6. Paste the generated markdown/HTML into Buttondown, Beehiiv, or Substack and schedule your send.

The CLI logs each export to the `AgentStatus` table (`idea` values `feed-export`, `case-card`, `newsletter-export`, and `tweet-export`) so the dashboard can display newsletter production status. Future API modes can reuse the same feed payload without changing these steps.
