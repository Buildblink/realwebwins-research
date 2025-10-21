# 🧩 REALWEBWINS PHASE 1: DATABASE + API IMPLEMENTATION PLAN

## 🎯 Overview
Build the database foundation and API layer for **PainPoint Explorer**, enabling manual seeding and search/filter capabilities.

---

## 📦 Tasks

### 1️⃣ Database Setup

**File:** `scripts/createPainPointsTable.mjs`

- Create Supabase migration script.
- **Table:** `pain_points` with columns:
  - id (uuid, primary key)
  - text (text)
  - category (text)
  - niche (text)
  - source (text)
  - frequency (int)
  - proof_link (text)
  - related_case_id (uuid, FK → research_projects.id)
  - related_playbook (text)
  - last_seen (timestamptz)
  - created_at (timestamptz default now())

**Indexes:**
- category, niche, source for fast filtering
- full-text search index on text column

**RLS Policies:**
- Public read access for `SELECT`
- Service role required for `INSERT` / `UPDATE`

---

### 2️⃣ TypeScript Types

**File:** `src/types/painpoint.ts`

- `PainPoint` interface matching schema
- `PainPointFilters` interface: search, category, niche, source
- `PainPointResponse` interface: `{ data: PainPoint[], total: number, page: number, pageSize: number }`
- `Category` and `Niche` enums/types

---

### 3️⃣ API Endpoint

**File:** `src/app/api/pain-points/route.ts`

**Method:** `GET`

**Query params:**  
`search`, `category`, `niche`, `source`, `page`, `pageSize`

**Behavior:**
- Full-text search on `text`
- Filter by category, niche, and source
- Pagination (default 20 per page)
- Sort by `frequency DESC`, `last_seen DESC`

**Response:**
```json
{
  "data": [ ...PainPoint ],
  "total": 123,
  "page": 1,
  "pageSize": 20
}
```

---

### 4️⃣ Data Seeding

**File:** `scripts/seedPainPoints.mjs`

- Read from `data/pain_points_seed.csv` or JSON.
- Validate structure.
- Insert into Supabase using service role key.
- Log success and errors.

**Add script to package.json:**
```json
"seed:pain-points": "node --env-file=.env.local scripts/seedPainPoints.mjs"
```

**Sample Seed File:** `data/pain_points_seed.csv`  
Include ~20–30 curated pain points:

| text | category | niche | source | frequency |
|------|-----------|--------|---------|------------|
| "Can’t grow YouTube beyond 1K subs" | Growth | YouTubers | Reddit | 5 |
| "Etsy sales dropped suddenly" | Monetization | Etsy Sellers | Reddit | 4 |
| "Struggling to price freelance services" | Pricing | Freelancers | IndieHackers | 3 |
| ... | ... | ... | ... | ... |

**Categories:** Marketing, Monetization, Motivation, Product, Growth  
**Niches:** YouTubers, Etsy Sellers, Indie Hackers, Freelancers, Solopreneurs  
**Sources:** Reddit, IndieHackers

---

### 5️⃣ Library Functions

**File:** `src/lib/painpoints/queryPainPoints.ts`

Reusable query builder to fetch pain points from Supabase.

**Features:**
- Supports filters (category, niche, source)
- Full-text search
- Pagination
- Exports utility for API + future frontend

---

### 6️⃣ Testing

- Test API endpoint with different filters.
- Verify search results and pagination.
- Test Supabase RLS policies.
- Confirm full-text search and indexes are performant.

---

## 📁 Files to Create or Modify

**New Files:**
```
scripts/createPainPointsTable.mjs
scripts/seedPainPoints.mjs
data/pain_points_seed.csv
src/types/painpoint.ts
src/app/api/pain-points/route.ts
src/lib/painpoints/queryPainPoints.ts
```

**Modified Files:**
```
package.json  → add "seed:pain-points" script
README.md     → document pain_points feature & seeding
```

---

## ✅ Success Criteria

- [ ] `pain_points` table exists in Supabase with correct schema
- [ ] Seed script successfully populates 20–30 entries
- [ ] `/api/pain-points` returns filtered & paginated results
- [ ] Full-text search functions correctly
- [ ] Public read access confirmed under RLS
- [ ] Ready for Phase 2: Frontend Explorer build

---

### 🚀 Next Phase Preview: Frontend Explorer

Phase 2 will implement:
- `/pain-points` list & search UI
- Filter components (category, niche)
- Integration with this API

This phase establishes the data layer foundation.
