# 🚀 Realwebwins – Core Product Roadmap (GPT-5 Codex Edition)

## 🎯 Objective
Shift Realwebwins from an internal experiment into a *publicly usable, high-retention product*:
**Users search real problems → watch AI agents collaborate → receive a downloadable MVP pack.**

This roadmap omits legacy “phase numbers.”  
Each section is a discrete deliverable GPT-5 Codex can implement & verify.

---

## 🧱 Current Foundation (Complete ✅)

- ✅ Supabase schema (agents, metrics, links, sessions, mvp_outputs, credits, auth)
- ✅ APIs: `/api/painpoints`, `/api/mvp/generate`, `/api/agents/session/[id]`, `/api/export/mvp/[id]`
- ✅ Pain → MVP pipeline verified end-to-end
- ✅ Neon dashboard & discover/pain/mvp pages functional

All future work builds directly on this.

---

## 🧩 Core Features to Complete Before Redesign

### 1️⃣ Real Export Content (High priority)
**Goal:** Turn the exported ZIP into a useful deliverable.

**Tasks**
- Populate `MVP.md` with title, summary, stack, pricing, risk, validation score.
- Add simple `validation.pdf` using `reportlab` or `pdfkit`  
  (`MVP Summary`, `Validation Score`, top 3 insights, timestamp).
- Include conversation transcript as `conversation.json`.
- Verify with `verifyPainPointMVP.mjs` (expect non-zero ZIP size).

**Files**
- `src/app/api/export/mvp/[id]/route.ts`
- `src/lib/mvp/outputs.ts`

---

### 2️⃣ Discover Experience (Entry point UX)
**Goal:** Help users *find pain points fast.*

**Tasks**
- Enhance `/discover` page:
  - Search bar (debounced, fuzzy match).
  - Category chips (AI, SaaS, Etsy, Freelance, etc.).
  - Trending list (order by `popularity_score`).
- Add `src/lib/painpoints/searchPainPoints.ts` for server-side filtering.
- Optional: “I feel lucky” random pain button.

**Files**
- `src/app/discover/page.tsx`
- `src/app/discover/discover-client.tsx`
- `src/lib/painpoints/queryPainPoints.ts`

---

### 3️⃣ Live Agent Studio (Engagement core)
**Goal:** Make `/pain/[id]` feel alive—like watching founders brainstorm.

**Tasks**
- Animated chat bubbles (Framer Motion).
- Typing indicator + progress dots.
- Color-coded avatars:
  - 🧠 Researcher (teal)
  - 🧑‍💻 Builder (violet)
  - 🧩 Validator (gold)
- Poll `/api/agents/session/[id]` every 1 s until `status:"done"`.
- Add error & retry handling.

**Files**
- `src/app/pain/[id]/page.tsx`
- `src/app/pain/[id]/studio-client.tsx`
- `src/components/agents/*`

---

### 4️⃣ MVP Result Page Polish
**Goal:** Deliver a satisfying finish + sharing loop.

**Tasks**
- Hero card: title, tagline, stack, pricing, validation score.
- Buttons:
  - [⬇ Download MVP Pack]
  - [🔁 Remix Another Pain]
  - [🔗 Share Link]
- Simple “share success” modal with copyable URL.
- Use existing `export` route for download.

**Files**
- `src/app/mvp/[slug]/page.tsx`
- `src/components/mvp/MVPCard.tsx`
- `src/components/mvp/DownloadModal.tsx`

---

### 5️⃣ Local Session Memory (Retention)
**Goal:** Show users their last few builds.

**Tasks**
- Store last 3 `mvp_id`s in `localStorage`.
- Add `/dashboard/recent` view or sidebar widget showing:
  - MVP title / validation score / timestamp.
- Link each card → `/mvp/[id]`.

**Files**
- `src/lib/storage/localSessions.ts`
- `src/components/dashboard/RecentMVPs.tsx`

---

## 🧠 Supporting Improvements

| Area | Enhancement |
|------|--------------|
| **Error Handling** | Every API must return JSON `{ success, error, message }` |
| **Loading UX** | Global spinner & toast notifications |
| **Analytics** | Log `pain_search`, `mvp_generate`, `mvp_download` events |
| **Auth** | Keep Supabase Auth passive (auto-login later) |

---

## 🎨 After Core Completion → Unified Layout v1
Once the 5 core items work, merge them into the **continuous Realwebwins experience**:

```
Discover  →  Run Agents (Live Studio)  →  Edit/Download MVP  →  Share & Remix
```

- One scrollable page (desktop split / mobile vertical)
- Matte dark-neon gradient (#0F1117 → #161A23)
- Minimal header, glowing cards, Inter/Geist font
- CTA: “Build my MVP” anchored mid-screen

---

## 🧪 Verification Targets

| Script | Expectation |
|---------|--------------|
| `verifyPainPointMVP.mjs` | ZIP > 0 bytes |
| `verifyExport.mjs` *(optional)* | returns `application/zip` |
| Manual test `/discover` | search + click pain → see agents → download works |

---

## 🧭 Development Order for GPT-5 Codex

1. **Enhance export handler** → produce meaningful ZIP/PDF  
2. **Upgrade discover UI** (search + filters)  
3. **Implement live studio interactions**  
4. **Polish MVP result + sharing flow**  
5. **Add local session memory**  
6. Merge all into unified layout v1 (continuous user journey)  

---

## ✅ Definition of Done
- Real user can:
  1. Search or pick a pain point  
  2. Watch agents collaborate  
  3. Receive an informative downloadable MVP pack  
  4. Remix or share result  
- All endpoints respond with valid JSON / ZIP  
- Verifier reports full success

> When these are true → mark tag **`core-product-verified`**

```
git tag -a core-product-verified -m "Realwebwins Core Product complete"
git push --follow-tags
```
