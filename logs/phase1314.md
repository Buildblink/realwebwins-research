
# Realwebwins — Phase 13 & 14 Build Plan
**Goal:** Transform Realwebwins from a single-user workspace into an intelligent, personalized, and community-driven ecosystem.

---

## 🌱 PHASE 13 — INTELLIGENCE & PERSONALIZATION

### 🎯 Objectives
1. Add analytics and workspace usage tracking.
2. Enable personalized workspace recommendations.
3. Introduce Copilot memory + adaptive feedback.
4. Launch a simple user dashboard for validation metrics.
5. Close the feedback loop so AI learns from user ratings.

---

### 1. DATABASE UPDATES
Create `scripts/migrations/create_phase13_tables.sql`

```sql
-- Analytics tracking
CREATE TABLE IF NOT EXISTS user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event text,
  context jsonb,
  created_at timestamptz DEFAULT now()
);

-- Workspace memory summaries
CREATE TABLE IF NOT EXISTS workspace_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  summary text,
  tokens_used int,
  updated_at timestamptz DEFAULT now()
);
```

---

### 2. API ROUTES
#### `/api/events`
Handles analytics events (workspace opened, export clicked, etc.)
```ts
POST /api/events
Body: { event: string, context?: any }
```

#### `/api/recommendations`
Returns similar workspaces using vector search (Supabase pgvector or Pinecone)
```ts
GET /api/recommendations?workspaceId={id}
```

---

### 3. FRONTEND UPDATES
#### a. `src/hooks/useAnalytics.ts`
Lightweight hook to log events automatically.
```ts
useEffect(() => {
  post("/api/events", { event: "workspace_opened", context: { id } });
}, []);
```

#### b. `src/hooks/useRecommendations.ts`
Fetch related workspaces for sidebar display.

#### c. `/dashboard/page.tsx`
New metrics view:
- Total workspaces created
- Total playbooks generated
- Most explored categories
- Recent exports

---

### 4. AI ADAPTATION
- Extend `generateWorkspaceSection()` to include personalization:
  ```ts
  const userContext = await getUserMemory(userId);
  const prompt = `You are helping ${userContext.style} build their next product...`;
  ```
- Add nightly summarizer (Node cron or `/api/cron/summarize`) that compresses recent user events → memory summary.

---

### 5. UI IMPROVEMENTS
- Add “Recommended for You” sidebar on `/workspace/[id]`.
- Add thumbs-up/down feedback under each generated section.
- Store votes via `/api/events`.

---

### ✅ SUCCESS CRITERIA
- Analytics stored for >90% of interactions.
- Recommendations visible in workspace sidebar.
- Copilot memory influencing next generations.
- `/dashboard` functional with accurate metrics.

---

## 🚀 PHASE 14 — COMMUNITY & GROWTH FLYWHEEL

### 🎯 Objectives
1. Allow users to publish and share workspaces publicly.
2. Introduce creator profiles and remix functionality.
3. Launch `/showcase` gallery with filters.
4. Enable affiliate tool embedding and weekly auto-promo.
5. Add referral leaderboard for gamified growth.

---

### 1. DATABASE UPDATES
Create `scripts/migrations/create_phase14_tables.sql`

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  username text UNIQUE,
  bio text,
  avatar_url text,
  links jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  published boolean DEFAULT false,
  title text,
  slug text UNIQUE,
  description text,
  category text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid,
  referred_user_id uuid,
  clicks int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

---

### 2. API ROUTES
#### `/api/public`
- `GET`: Fetch published workspaces.
- `POST`: Publish a workspace (auth required).

#### `/api/profile/[id]`
- Returns creator info + public workspaces.

#### `/api/remix/[workspaceId]`
- Duplicates workspace for current user.

---

### 3. FRONTEND PAGES
#### `/showcase/page.tsx`
Filterable grid of public workspaces:
- Filters: Category, Popularity, Recent
- Each card → `/workspace/[id]`
- “Remix This” button clones workspace to user account

#### `/u/[username]/page.tsx`
Public profile page:
- Avatar, bio, badges
- Grid of published workspaces

#### `/leaderboard/page.tsx`
Top referrers and most remixed workspaces.

---

### 4. AFFILIATE + PROMO INTEGRATION
- Parse affiliate links from playbooks (already JSONB).
- Auto-embed inside rendered markdown.
- Weekly export automation:
  ```bash
  npm run export:newsletter -- --for beehiiv --include-cards
  npm run export:tweets
  ```
- Optional: store affiliate clicks via `/api/events`.

---

### 5. GROWTH AUTOMATIONS
#### Cron script: `scripts/auto/runWeeklySummary.mjs`
- Collects top 5 new public workspaces
- Exports newsletter draft + tweets
- Updates leaderboard counts

---

### ✅ SUCCESS CRITERIA
- Users can publish, remix, and share workspaces.
- `/showcase` and `/u/[username]` pages live.
- Leaderboard and referral tracking operational.
- Weekly Beehiiv + X exports auto-generated.
- Affiliate links visible and tracked.

---

## ⚙️ ORDER OF EXECUTION
| Step | Component | Time |
|------|------------|------|
| 1 | Run Phase 13 migrations | 10 min |
| 2 | Implement `/api/events` + analytics hook | 30 min |
| 3 | Build recommendations + `/dashboard` | 1 day |
| 4 | Add personalization to workspace service | 1 day |
| 5 | Run Phase 14 migrations | 10 min |
| 6 | Build `/showcase` + `/u/[username]` | 2 days |
| 7 | Add remix + publish modals | 1 day |
| 8 | Integrate affiliate links + cron export | 1 day |

---

### 💡 FUTURE EXPANSIONS (After 14)
- “Agent Swarm” MVP generation (Phase 15)
- “Idea League” collaborations (Phase 16)
- Native app builder (Phase 17)

---

**End of Phase 13–14 Build Plan**
