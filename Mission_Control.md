# 🚀 REALWEBWINS MISSION CONTROL
## Multi-Agent Coordination System

Welcome to the **RealWebWins AI Crew**, a distributed team of Codex agents and local environments building the MVP together.

---

## 🧠 OVERVIEW

| Agent | Environment | Role | Main Focus | Dependencies |
|-------|--------------|------|-------------|---------------|
| 🧩 **Agent 1: Core Backend (Local)** | VS Code (local) | Implements all APIs, DB logic, Supabase schema | `/api/research/create`, auth, data saving | Supabase, Anthropic mock |
| 🎨 **Agent 2: Frontend UI (Cloud)** | Codex cloud env | Handles UI & user flow | Homepage idea input → markdown report | Calls Agent 1 API |
| 📦 **Agent 3: Export Agent (Cloud)** | Codex cloud env | Adds export + sharing tools | `/api/export/markdown`, “Download .md” button | Needs project data from Agent 1 |
| 📣 **Agent 4: Marketing Playbook (Cloud)** | Codex cloud env | Creates mocked `/api/marketing/generate` + UI | “Generate Marketing Plan” tab | Reads same Supabase DB |
| 🧪 **Agent 5: QA Tester (Local)** | Local (or ephemeral) | Runs validation & E2E tests | Playwright tests for main flow | Depends on all above |

---

## ⚙️ SETUP & COMMANDS

### 🧩 Agent 1 – Core Backend (Local)
Responsible for all server logic and data persistence.

**Prompt:**
```
Read PRD.md and implement all backend routes and database logic.
Use Supabase for persistence and mock Claude API calls for research.
Ensure local server runs at http://localhost:3000/api/research/create
```

**Start locally:**
```bash
npm run dev
```

---

### 🎨 Agent 2 – Frontend Builder (Cloud)
Implements homepage UI for idea input and research results.

**Prompt:**
```
You are the Frontend Builder Agent for the RealWebWins Research System MVP.
Reference PRD.md.
Implement src/app/page.tsx with:
- Textarea input for ideaDescription
- “Analyze Idea” button
- Loading state (Framer Motion)
- Markdown report rendering (react-markdown)
```

**Environment:** Codex Cloud → Next.js (TypeScript)

---

### 📦 Agent 3 – Export Agent (Cloud)
Handles report exports.

**Prompt:**
```
You are the Export Agent for RealWebWins.
Implement /api/export/markdown
- Input: { projectId }
- Fetch from Supabase
- Return downloadable .md file
Add “Export Markdown” button to Project Detail.
```

---

### 📣 Agent 4 – Marketing Playbook Agent (Cloud)
Mocks go-to-market generation.

**Prompt:**
```
You are the Marketing Playbook Agent.
Implement /api/marketing/generate
- Accept { projectId }
- Return mock JSON with 2–3 channels, scores, ideas
- Add “Generate Marketing Plan” button to Project Detail
```

---

### 🧪 Agent 5 – QA Tester (Local)
Validates MVP end-to-end.

**Prompt:**
```
You are the QA Agent.
Write Playwright tests for:
- Idea submission returns report
- Markdown renders
- Export works
- Marketing plan appears
```

Run:
```bash
npx playwright test
```

---

## 🧩 COORDINATION RULES

1. Each agent commits to the same GitHub repo (`realwebwins-research`).
2. Always pull latest before starting:
   ```bash
   git pull origin main
   ```
3. Commit work clearly:
   ```bash
   git add .
   git commit -m "Agent <n>: completed feature X"
   git push origin main
   ```
4. Shared truth document: **PRD.md**
5. Mission Control defines ownership & boundaries.
6. Only the orchestrator (you) assigns new tasks.

---

## 🌐 ENVIRONMENT NAMING
| Agent | Suggested Name |
|--------|----------------|
| Backend | realwebwins-backend-agent |
| Frontend | realwebwins-frontend-agent |
| Export | realwebwins-export-agent |
| Marketing | realwebwins-marketing-agent |
| QA | realwebwins-qa-agent |

---

## ✅ CHECKLIST BEFORE DEPLOYMENT
- [ ] Local backend passes all API tests
- [ ] Frontend connects successfully to local API
- [ ] Export feature returns valid markdown
- [ ] Marketing playbook displays mock data
- [ ] QA tests all pass
- [ ] Ready for Vercel + Supabase production deploy

---

## 🏁 FINAL NOTE
Use this file as your **AI Crew Playbook**.
Each agent acts like a specialized teammate.
Keep all instructions, PRD updates, and feature requests centralized here.

RealWebWins Crew – Version 1.0
