# 🧠 PRODUCT REQUIREMENTS DOCUMENT
**Project:** RealWebWins Research System (MVP v1.0)
**Purpose:** Provide Codex (in VS Code) everything it needs to build, test, and deploy the MVP autonomously.
**Date:** Oct 2025
**Owner:** RealWebWins
**Status:** Implementation Ready

---

## 🎯 1. GOAL & VISION
An AI-powered research workspace that lets solopreneurs **validate business ideas in < 3 minutes** and **launch with confidence**.

**Core Promise:**
> “From vague idea → validated opportunity → actionable launch plan — all in one persistent dashboard.”

---

## ⚙️ 2. MVP SCOPE (for build phase 1)

| Module | Deliverable | Notes |
|---------|--------------|-------|
| **Auth & DB** | Supabase Auth (email + password), schema setup | Use SQL schema below verbatim |
| **Research API** | `/api/research/create` integrating Claude Sonnet 4.5 | Implements 7-Step Framework |
| **Vault UI** | Dashboard (list + detail + compare stub) | Use Next.js 14 App Router + shadcn/ui |
| **Playbook API (Stub)** | `/api/marketing/generate` returns mock JSON | Real generation phase 2 |
| **Export to Markdown** | Local download only | PDF/Notion phase 2 |
| **Payments (Stub)** | Stripe checkout page placeholder | Live later |
| **Deployment** | Vercel (front + API) + Supabase DB | env vars in `.env.local.example` |

---

## 👤 3. TARGET USER
**“Alex the Aspiring Solopreneur”**
• Age 28–40 • Dev/Designer/Creator • Wants validated idea before coding • Pays $29–79 / mo

---

## 🧩 4. CORE FEATURES (Implemented Now)

### 4.1 Research Engine
Flow:
User enters idea → POST /api/research/create
→ Claude Sonnet 4.5 analyzes → structured JSON → save to Supabase → render markdown

7-Step Validation Framework:
1. Market Size Analysis
2. Competition Landscape
3. Customer Pain Points
4. Search Trend Analysis
5. Monetization Assessment
6. Build Complexity
7. Go/No-Go Verdict

Claude Prompt Spec:
{
  "system": "You are a business research analyst...",
  "user": "Research this business idea: {ideaDescription}. Use the 7-step framework. Output JSON with keys: market_size, competition, pain_points, trends, monetization, build_complexity, verdict."
}

Expected Claude Response:
{
  "verdict": {"score":8.2,"label":"strong_go","confidence":"high"},
  "market_size":{"tam":"2.1B","growth":"+45%"},
  "competition":[{"name":"Competitor A","price":"$29/mo"}],
  "pain_points":["Creators waste hours validating ideas"],
  "trends":{"keyword":"ai startup validation","trend":"+40% YoY"},
  "monetization":{"model":"SaaS subscription","price_suggestion":"$29 – 79/mo"},
  "build_complexity":{"difficulty":5,"weeks":4,"stack":["Next.js","Supabase","Claude API"]}
}

DB Insert Schema:
- research_report = markdown rendered summary
- Store raw Claude JSON in research_json column (for parsing later)

---

### 4.2 Research Vault (Dashboard)
3 Pages only for MVP:

| Page | Route | Purpose |
|-------|--------|----------|
| Home | `/` | Idea input + result render |
| Dashboard | `/dashboard` | List of saved research projects |
| Project Detail | `/project/[id]` | Show report + placeholder tabs for Playbook & Action Plan |

---

## 🗃️ 5. DATABASE (Supabase PostgreSQL)
users:
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_tier TEXT DEFAULT 'free'
);

research_projects:
CREATE TABLE research_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  idea_description TEXT NOT NULL,
  score DECIMAL(3,1),
  verdict TEXT,
  confidence TEXT,
  research_json JSONB,
  research_report TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_research_user ON research_projects(user_id);

---

## 🔌 6. API ENDPOINTS (MVP)
POST /api/research/create
Body:
{ "ideaDescription": "AI tool for real estate agents" }
Response:
{
  "projectId": "uuid",
  "status": "completed",
  "score": 8.2,
  "verdict": "strong_go",
  "reportMarkdown": "## 🎯 VERDICT..."
}

GET /api/research/:projectId
Returns project JSON + markdown.

GET /api/research/list
Paginated list for dashboard.

---

## 💻 7. FRONTEND SPEC
Framework: Next.js 14 (App Router + TypeScript)
Styling: Tailwind + shadcn/ui
Animations: Framer Motion
Fonts: Inter (body), Space Grotesk (headings)

Components:
- ResearchCard
- LoadingState
- ReportViewer

Color Palette:
primary #3B82F6, secondary #8B5CF6, success #10B981, warning #F59E0B, danger #EF4444, background #FFFFFF, foreground #0F172A, muted #F1F5F9

---

## 🔐 8. SECURITY / CONFIG
Supabase Auth JWTs (RLS enabled)
Rate limit 50 researches / hour / user

.env.local.example:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000

---

## 🧪 9. TESTING PLAN
- S1 – New User Signup → Research (Report renders < 3 min)
- S2 – Free Tier Limit → `RATE_LIMIT_EXCEEDED`
- S3 – Claude Timeout → Retry once → error banner

---

## 📈 10. ANALYTICS
Vercel Analytics + Supabase logs for token usage

---

## 🚀 11. DEPLOYMENT ROADMAP (3 Weeks)
Week 1: Auth + DB + API
Week 2: Vault UI
Week 3: Testing + Deploy

---

## ✅ 12. ACCEPTANCE CRITERIA
- Idea → Report ≤ 3 min
- Score display works
- Data saved in Supabase
- Dashboard lists projects
- No critical prod errors

---

## 🧱 13. FILE STRUCTURE
/app
  /api
    /research/create/route.ts
    /research/[projectId]/route.ts
  /dashboard/page.tsx
  /project/[id]/page.tsx
/components
  ResearchCard.tsx
  ReportViewer.tsx
  LoadingState.tsx
/lib
  supabaseClient.ts
  anthropicClient.ts

---

## 🧩 14. IMPLEMENTATION CHECKLIST
- [ ] Create Next.js project
- [ ] Install deps: @supabase/supabase-js, @anthropic-ai/sdk, shadcn/ui, tailwindcss, framer-motion, react-markdown
- [ ] Initialize Supabase schema
- [ ] Build /api/research/create route
- [ ] Build UI (Home + Dashboard + Project Detail)
- [ ] Test end-to-end
- [ ] Deploy to Vercel

---

## 🔮 15. FUTURE (Phase 2)
- Marketing Playbook generator
- Action Plan generator
- PDF/Notion exports
- Stripe live payments
- Trend monitor dashboard
