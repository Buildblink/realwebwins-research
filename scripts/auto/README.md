# Hybrid AI Automation (Claude + OpenAI)

Automated pain point discovery and playbook generation using Claude for extraction and OpenAI for structured content creation.

## Overview

This automation system:
1. **Discovers pain points** from Reddit using Claude (Anthropic)
2. **Generates playbooks** for those pain points using OpenAI
3. **Links everything** in the database for the frontend

## Setup

### 1. Install Dependencies

```bash
npm install openai node-fetch
```

### 2. Configure API Keys

Add these to your `.env.local` file:

```bash
# Get from https://console.anthropic.com/
CLAUDE_API_KEY=sk-ant-xxxxx
# OR use existing
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-xxxxx

# Optional: Enable verbose logging
HYBRID_VERBOSE=true
```

## Scripts

### Individual Scripts

#### `npm run hybrid:discover`
Runs Claude pain point discovery from Reddit.

**What it does:**
- Fetches 10 recent threads from r/Entrepreneur, r/SideProject, r/startups
- Uses Claude to extract 0-3 pain points per thread
- Detects both creator and consumer problems
- Inserts into `pain_points` table
- Prevents duplicates based on (text, source, proof_link)

**Output:**
```
=== Claude Pain Point Discovery Started ===

Fetching threads from 3 subreddits...
  ✓ r/Entrepreneur: 10 posts fetched
  ✓ r/SideProject: 10 posts fetched
  ✓ r/startups: 10 posts fetched
Total threads collected: 10

Processing threads with Claude...
  ✓ Extracted 2 pain points from r/Entrepreneur thread
  ✓ Extracted 3 pain points from r/SideProject thread
  ✓ Inserted 15 new pain points

=== Discovery Complete ===
Threads processed: 10
Pain points inserted: 15
Pain points updated: 0
Duration: 45.2s
```

#### `npm run hybrid:generate`
Runs OpenAI playbook generation for unlinked pain points.

**What it does:**
- Queries pain_points WHERE related_playbook IS NULL
- Processes up to 5 pain points per run (cost control)
- Uses GPT-4o-mini to generate structured playbooks
- Creates markdown content, recommends tools, suggests affiliate links
- Links playbooks back to pain points

**Output:**
```
=== OpenAI Playbook Generation Started ===

Found 5 pain points without playbooks

Generating playbooks for 5 pain points...

Processing: "Finding my first customers as a new SaaS founder is..."
  ✓ Generated playbook: "SaaS Customer Acquisition for First-Time Founders"
  ✓ Inserted playbook: saas-customer-acquisition-first-time-founders
  ✓ Linked pain point → playbook

=== Generation Complete ===
Playbooks created: 5
Pain points linked: 5
Duration: 32.1s
```

### Full Automation

#### `npm run hybrid:refresh`
Runs the complete automation pipeline:

1. Claude pain point discovery
2. OpenAI playbook generation
3. Export feed (optional)

**Output:**
```
╔═══════════════════════════════════════════╗
║   Hybrid AI Refresh: Claude + OpenAI     ║
╚═══════════════════════════════════════════╝

==================================================
▶ Running: Claude Pain Point Discovery
==================================================

[... Claude discovery output ...]

✅ Claude Pain Point Discovery completed successfully

==================================================
▶ Running: OpenAI Playbook Generation
==================================================

[... OpenAI generation output ...]

✅ OpenAI Playbook Generation completed successfully

==================================================
🏁 Hybrid Refresh Complete
==================================================
✅ Successful steps: 3
❌ Failed steps: 0
⏱️  Total duration: 89.7s
==================================================
```

## How It Works

### Pain Point Discovery (Claude)

**Reddit Subreddits Monitored:**
- r/Entrepreneur
- r/SideProject
- r/startups

**Claude Prompt:**
- Extracts 0-3 pain points per thread
- Returns JSON: `{text, category, niche, source, audience, frequency, proof_link}`
- Audience detection: "creator" vs "consumer"
- Category auto-classification (Marketing, Monetization, Growth, etc.)

**Database:**
- Inserts into `pain_points` table
- Prevents duplicates on (text + source + proof_link)
- Updates `last_seen` on duplicates

### Playbook Generation (OpenAI)

**Query:**
- Fetches pain points WHERE `related_playbook IS NULL`
- Limits to 5 per run (cost control)

**OpenAI Prompt (GPT-4o-mini):**
- Generates structured playbook with:
  - Title (6-10 words)
  - Slug (kebab-case)
  - Description (1-2 sentences)
  - Markdown content (The Challenge, 5 Steps, Validation, Pitfalls)
  - Tools (2-4 recommended with URLs)
  - Affiliate links (0-2 optional)

**Database:**
- Inserts into `playbooks` table
- Updates `pain_points.related_playbook` with slug
- Sets `playbooks.related_pain_id` for back-reference

## Testing

### Manual Test Sequence

```bash
# 1. Test Claude discovery
npm run hybrid:discover

# 2. Check pain_points table in Supabase
# Verify new entries with source="Reddit"

# 3. Test OpenAI playbook generation
npm run hybrid:generate

# 4. Check playbooks table in Supabase
# Verify new playbooks linked to pain points

# 5. View in browser
npm run dev
# Visit: http://localhost:3002/pain-points
# Click a pain point with a playbook link

# 6. Run full automation
npm run hybrid:refresh
```

## Cost Estimation

**At MVP Scale (10 threads/day, 5 playbooks/day):**

- **Claude (Sonnet)**: ~10 threads × $0.003/thread = ~$0.90/month
- **OpenAI (GPT-4o-mini)**: ~5 playbooks × $0.001/playbook = ~$1.50/month
- **Total**: ~$2.40/month

**Optimizations:**
- Use Claude Haiku for daily scraping (~60% cheaper)
- Use Claude Sonnet weekly for deeper analysis
- Batch multiple posts per API call
- Set hard limit: max 5 playbooks/day

## Logging & Monitoring

All steps are logged to the `AgentStatus` table:

```sql
SELECT * FROM "AgentStatus"
WHERE idea IN ('pain_points_discovery', 'playbook_generation')
ORDER BY last_run DESC
LIMIT 10;
```

Fields logged:
- `idea`: "pain_points_discovery" or "playbook_generation"
- `stage`: Step name (e.g., "reddit_fetch", "pain_points_insert")
- `success`: true/false
- `error_log`: Error message if failed
- `last_run`: Timestamp

## Scheduling (Future)

You can schedule the automation with:

**Vercel Cron (vercel.json):**
```json
{
  "crons": [{
    "path": "/api/cron/hybrid-refresh",
    "schedule": "0 2 * * *"
  }]
}
```

**GitHub Actions (.github/workflows/hybrid-refresh.yml):**
```yaml
name: Hybrid Refresh
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily
  workflow_dispatch:

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run hybrid:refresh
        env:
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**Railway/Render:**
- Create a cron job pointing to the script
- Set environment variables in dashboard

## Troubleshooting

### "Missing CLAUDE_API_KEY environment variable"

Add to `.env.local`:
```bash
CLAUDE_API_KEY=sk-ant-xxxxx
```

Or use the existing `ANTHROPIC_API_KEY` (scripts check both).

### "Missing OPENAI_API_KEY environment variable"

Get from: https://platform.openai.com/api-keys

Add to `.env.local`:
```bash
OPENAI_API_KEY=sk-xxxxx
```

### "No threads fetched"

- Reddit may be rate-limiting
- Check internet connection
- Try again in a few minutes
- Verify User-Agent in fetch headers

### "Failed to parse Claude response"

- Claude sometimes returns markdown code blocks
- Scripts clean this automatically
- If persistent, check `HYBRID_VERBOSE=true` output
- May need to adjust temperature or prompt

### "Playbook slug already exists"

- Scripts automatically append timestamp on conflict
- Not an error, just a notice
- Check Supabase for duplicate slugs

### "Playbook links returning 404"

If playbook links show 404 errors, the `pain_points.related_playbook` field might contain **titles** instead of **slugs**.

**Fix:**
```bash
npm run fix:playbook-links
```

This script:
- ✅ Converts playbook titles → slugs (e.g., "SaaS Marketing Playbook" → "saas-marketing-solo")
- 🗑️ Nulls out references to non-existent playbooks
- ⚡ Preserves correctly-linked automated playbooks

**When to run:**
- After manually seeding pain points with playbook references
- If you see 404 errors when clicking playbook links
- After importing CSV data with playbook titles

## File Structure

```
scripts/auto/
├── README.md                              # This file
├── autoDiscoverPainPointsClaude.mjs      # Claude pain point discovery
├── generatePlaybooksFromPainPoints.mjs   # OpenAI playbook generation
└── runHybridRefresh.mjs                  # Orchestration runner
```

## Next Steps

1. **Run first discovery**: `npm run hybrid:discover`
2. **Generate playbooks**: `npm run hybrid:generate`
3. **Schedule automation**: Set up cron job
4. **Monitor costs**: Track API usage in dashboards
5. **Expand sources**: Add IndieHackers, Quora, Twitter/X
6. **Refine prompts**: Improve extraction accuracy
7. **Add consumer support**: Detect consumer problems better

## Support

Questions? Check:
- [Anthropic API Docs](https://docs.anthropic.com/)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Hybrid Integration Plan](../../logs/hybrid_integration.md)
