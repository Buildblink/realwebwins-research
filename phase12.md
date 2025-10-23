# Phase 12 — Interactive Solution Workspace (Desktop, Dark Minimalist)

**Purpose**
Turn each pain point into a guided, interactive “from insight → shipped” workspace with four tabs:
**Understand · Ideate · Build · Validate**.
Reuses your current Supabase + Hybrid AI stack. Adds new API routes, components, prompts, deliverables, and caching.

---

## High-Level UX (Desktop)

**Layout: split view**

- **Left Panel (Problem Context)**
  - Pain point: text, audience, category, niche, source, proof link
  - “Open Playbook” (if linked)
  - “Generate Starter Kit” (deliverables)
  - “Open in Workspace” (active state indicator)
- **Right Panel (Workspace)**
  - Tabs: Understand | Ideate | Build | Validate
  - Each tab renders AI output (cached), with:
    - “Regenerate” button
    - Streaming/loading state
    - Export to Markdown/PDF
  - Floating “Ask AI” Copilot (single-shot prompt scoped to current pain point)

---

## Tech Constraints & Reuse

- **Keep existing tables and code:**
  - `pain_points` (+ audience, related_playbook)
  - `playbooks`
  - hybrid discovery/generation scripts
  - AgentStatus logging
- **Add minimal schema:**
  - `workspaces` (1:1 per pain point)
  - `workspace_outputs` (1:N per workspace section)

---

## New/Updated Schema

### Table: `workspaces`
```sql
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  pain_point_id uuid not null references public.pain_points(id) on delete cascade,
  title text not null,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists ux_workspaces_pp on public.workspaces(pain_point_id);
```

### Table: `workspace_outputs`
```sql
create table if not exists public.workspace_outputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  section text not null,
  content_md text,
  content_json jsonb,
  model text,
  tokens integer default 0,
  cost_usd numeric(8,4) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_workspace_outputs_ws_section on public.workspace_outputs(workspace_id, section);
```

---

## Routes & Contracts

### 1) Create/Fetch Workspace
`GET /api/workspace/[painPointId]`

### 2) Generate/Regenerate Section
`POST /api/workspace/[painPointId]?section=understand|ideate|build|validate`

### 3) Export Deliverables
`POST /api/workspace/[painPointId]/deliverables`

### 4) Copilot Ask
`POST /api/workspace/[painPointId]/ask`

---

## Frontend

### Pages
- `src/app/workspace/[painPointId]/page.tsx`

### Components
- `WorkspaceHeader.tsx`
- `SidebarContext.tsx`
- `Tabs.tsx`
- `SectionPanel.tsx`
- `ExportBar.tsx`
- `CopilotButton.tsx`

### Styling
- Dark minimalist (charcoal → deep navy gradient)
- Accent cyan/emerald for active states
- Glassmorphism panels (blur + subtle borders)

---

## Prompts (per Section)

### UNDERSTAND
Summarize context and evidence.

### IDEATE
Generate 3 actionable solutions.

### BUILD
Create MVP plan, tools, and marketing.

### VALIDATE
Scan competitors and score uniqueness.

---

## Deliverables Generation
- From Build tab → Markdown + PDF export.
- Optional Notion export if `NOTION_TOKEN` exists.

---

## Analytics & Logging
- Extend `AgentStatus` for workspace actions.
- Add `user_events` table for analytics.

---

## Environment Variables

```
MODEL_WORKSPACE_UNDERSTAND=gpt-4o-mini
MODEL_WORKSPACE_IDEATE=gpt-4o-mini
MODEL_WORKSPACE_BUILD=gpt-4o-mini
MODEL_WORKSPACE_VALIDATE=gpt-4o-mini
DELIVERABLES_BUCKET=deliverables
NOTION_TOKEN=
HYBRID_VERBOSE=true
```

---

## Build Plan

1. DB migrations for new tables.
2. Implement 4 API routes.
3. Build frontend workspace UI.
4. Integrate export + Copilot.
5. Log analytics + errors.

---

## Acceptance Tests

- Open a pain point → "Open Workspace"
- Each tab generates unique markdown output.
- Export works for Markdown/PDF.
- Copilot answers contextually.
- Cached outputs reload instantly.

---

## Rollout Plan

- Phase A: local tests
- Phase B: staging (50/day limit)
- Phase C: production with dashboards

---

## Future Hooks

- Add prototype deploy button.
- Add personalized Shadow Twin.
- Add Agent Marketplace.