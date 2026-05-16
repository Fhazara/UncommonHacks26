# Teammate 2 — Frontend / Dashboard + Reflection UX Lead

> You are building only this part. Do not rewrite the whole repo. Do not touch `backend/` or `sandbox/`.

---

## Project Summary

**Claude Code on a Leash** — a safety, comprehension, and telemetry firewall for AI coding agents.

AI coding agents can run dangerous terminal commands, read secrets, install malicious packages, and follow injected instructions. Humans often approve these actions without understanding them. This system watches both the agent and the human. It detects dangerous actions AND detects when the human is drifting into passive approval.

**Repo:** https://github.com/Fhazara/UncommonHacks26

**Your branch:** `frontend-dashboard-reflection`

---

## Your Role

You own the entire frontend. You are responsible for:
- Next.js 14 App Router pages and layouts
- All React components (dashboard, sandbox, policies, telemetry, reports)
- API integration layer (`frontend/lib/api.ts`)
- TypeScript types (`frontend/lib/types.ts`)
- Mock data fallback so the dashboard works when backend is offline
- Dark cybersecurity theme (Tailwind CSS)
- Reflection UX — the UI that asks users to explain their approval decision

---

## What Is Already Built (Do Not Rewrite)

The following files are **already written and working**. Do not rewrite from scratch — read the existing code, understand it, and extend or fix it.

```
frontend/package.json                       ← next@14.2.3, react@18, typescript, tailwindcss
frontend/tsconfig.json
frontend/tailwind.config.ts
frontend/next.config.mjs
frontend/app/layout.tsx                     ← root layout, dark bg, nav bar
frontend/app/page.tsx                       ← landing page
frontend/app/dashboard/page.tsx             ← live log table, polls every 3s, mock fallback
frontend/app/sandbox/page.tsx               ← wraps SandboxRunner component
frontend/app/policies/page.tsx              ← loads and shows all YAML rules
frontend/app/telemetry/page.tsx             ← aggregated scores, decision distribution
frontend/app/reports/[id]/page.tsx          ← detail view for a single action event
frontend/lib/types.ts                       ← all TypeScript interfaces (match backend exactly)
frontend/lib/api.ts                         ← apiFetch wrapper + all API functions
frontend/lib/mockData.ts                    ← MOCK_LOGS with 5 entries (all decision types)
frontend/components/RiskBadge.tsx           ← severity+enforcement → colored chip
frontend/components/ModeToggle.tsx          ← research (blue) vs use (red) toggle
frontend/components/CognitiveDriftMeter.tsx ← progress bar 0-100, four color zones
frontend/components/InterventionBanner.tsx  ← colored banners per enforcement type
frontend/components/TeacherExplanationCard.tsx ← left border by risk_level, all fields
frontend/components/ReflectionPrompt.tsx    ← textarea, submit button disabled until 5+ chars
frontend/components/StatsCards.tsx          ← 5 stat cards: total/allowed/warned/reflected/blocked
frontend/components/ActionCard.tsx          ← single log row: action_type, command, scores, rules
frontend/components/TelemetryPanel.tsx      ← export status dots, score values, approval time
frontend/components/PolicyTable.tsx         ← full table of all YAML rules
frontend/components/SandboxRunner.tsx       ← scenario dropdown, mode toggle, run button, results
```

---

## Exact TypeScript Types (Do Not Change Field Names — Must Match Backend)

```typescript
// frontend/lib/types.ts — these already exist, do not rename fields

export type DecisionType = "allow" | "warn" | "reflect" | "block";
export type SeverityLevel = "low" | "medium" | "high" | "critical";
export type AppMode = "research" | "use";

export interface PolicyMatch {
  rule_id: string;
  rule_name: string;
  severity: SeverityLevel;
  reason: string;
  evidence: string;
  safer_alternative: string;
  risk_points: number;
}

export interface TeacherExplanation {
  plain_english_summary: string;
  why_it_matters: string;
  what_could_go_wrong: string;
  risk_level: string;
  reflection_question: string;
  safer_alternative: string;
  should_pause_user: boolean;
}

export interface DecisionResponse {
  action_id: string;
  decision: DecisionType;
  mode: AppMode;
  enforcement: string;       // "allowed" | "warned" | "would_warn" | "reflection_required" |
                             // "would_reflect" | "blocked" | "would_block"
  action_risk_score: number;
  cognitive_drift_score: number;
  intent_mismatch_score: number;
  intervention_score: number;
  severity: SeverityLevel;
  triggered_rules: PolicyMatch[];
  teacher_explanation: TeacherExplanation;
  reflection_question: string | null;
  safer_alternative: string | null;
  timestamp: string;
  exports: { local: boolean; snowflake: boolean; wafer: boolean };
}

export interface ActionLog {
  id: string;
  session_id: string;
  timestamp: string;
  mode: string;
  action_type: string;
  command: string | null;
  file_path: string | null;
  action_risk_score: number;
  cognitive_drift_score: number;
  intervention_score: number;
  decision: string;
  enforcement: string;
  severity: string;
  triggered_rules: string;        // JSON-encoded string in DB rows
  teacher_explanation: string;    // JSON-encoded string in DB rows
}

export interface SandboxResult {
  action_type: string;
  command: string | null;
  file_path: string | null;
  decision: string;
  enforcement: string;
  action_risk_score: number;
  cognitive_drift_score: number;
  intervention_score: number;
  severity: string;
  triggered_rules: { rule_id: string; rule_name: string; severity: string }[];
  teacher_summary: string;
}
```

---

## API Contracts (All endpoints are served by TM1's backend at `http://localhost:8000`)

```
GET  /api/health
  → { status: "ok", mode: "research"|"use", version: string }

POST /api/actions/evaluate
  Body: ActionEvent (see below)
  → DecisionResponse

GET  /api/actions/logs?limit=50
  → ActionLog[]          ← NOTE: triggered_rules and teacher_explanation are JSON strings here

GET  /api/actions/{id}
  → { event: {...}, decision: {...} }

GET  /api/policies
  → { policies: [{id, name, severity, risk_points, reason, safer_alternative},...] }

POST /api/policies/reload
  → { ok: true, count: number }

POST /api/sandbox/run
  Body: { scenario: string, mode: "research"|"use" }
  → { scenario: string, mode: string, results: SandboxResult[] }

POST /api/reflection/answer
  Body: { action_id: string, session_id: string, answer: string, user_confidence?: number }
  → { ok: true, action_id: string }

GET  /api/telemetry/session/{session_id}
  → { session_id: string, events: [...] }

GET  /api/report/generate?session_id=xxx
  → { session_id, total_actions, allowed, warned, reflected, blocked, avg_risk, avg_drift, events }
```

### Minimum ActionEvent fields for POST /api/actions/evaluate:
```typescript
{
  session_id: string,
  mode: "research" | "use",
  action_type: "shell_command" | "file_read" | "file_write" | "dependency_install" |
               "network_request" | "git_operation" | "plan_message" | "approval_request",
  user_prompt: string,
  agent_stated_plan: string,
  // optional but used by cognitive drift scoring:
  approval_time_ms?: number,
  diff_viewed?: boolean,
  explanation_viewed?: boolean,
  lines_changed?: number,
  fast_approvals_in_row?: number,
  keystroke_count?: number,
  scroll_depth_percent?: number,
  user_skill_level?: "beginner" | "intermediate" | "advanced",
  command?: string,
  file_path?: string,
  package_name?: string,
}
```

---

## Decision / Enforcement Visual Guide

| decision  | enforcement          | color  | meaning                                     |
|-----------|----------------------|--------|---------------------------------------------|
| allow     | allowed              | green  | Safe, proceed                               |
| warn      | warned               | yellow | Risk detected, user warned                  |
| warn      | would_warn           | blue   | Research mode — would warn if enforced      |
| reflect   | reflection_required  | orange | User must answer a question before proceeding |
| reflect   | would_reflect        | blue   | Research mode — would require reflection    |
| block     | blocked              | red    | Blocked entirely                            |
| block     | would_block          | blue   | Research mode — would block if enforced     |

---

## Build Order (What To Do First)

1. **Clone and set up**
   ```bash
   git clone https://github.com/Fhazara/UncommonHacks26.git
   cd UncommonHacks26
   git checkout frontend-dashboard-reflection
   git pull origin main
   cd frontend
   npm install
   npm run dev
   # App runs at http://localhost:3000
   ```

2. **Verify mock data works (backend NOT required)**
   ```bash
   # With backend offline, http://localhost:3000/dashboard should still show 5 mock log entries
   # from frontend/lib/mockData.ts
   ```

3. **Set your backend URL**
   ```bash
   # Create frontend/.env.local
   echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
   ```

4. **Connect to backend (once TM1 has their server running)**
   ```bash
   # Open http://localhost:3000/dashboard
   # Should now show real logs from the backend
   # Dashboard polls every 3 seconds automatically
   ```

5. **Extend or fix as needed:**

   **Dashboard improvements:**
   - Add session_id filter dropdown to the log table
   - Add decision filter (show only "block" or "reflect")
   - Add a real-time auto-scroll indicator

   **Reports page (`/reports/[id]`):**
   - Make sure `triggered_rules` and `teacher_explanation` are JSON.parsed correctly (they come as strings from `/api/actions/logs` but as objects from `/api/actions/{id}`)
   - Show cognitive drift flags: `approval_speed_flag`, `diff_size_flag`, `repeated_approval_flag`, `low_engagement_flag`, `explanation_skipped_flag`

   **Reflection UX (`ReflectionPrompt` component):**
   - Currently submits to `POST /api/reflection/answer`
   - Consider adding a confidence slider (1-5 scale) mapped to `user_confidence` field
   - Show the `reflection_question` from `DecisionResponse` prominently before the textarea

   **Telemetry page (`/telemetry`):**
   - Group events by session_id
   - Add a bar chart for decision distribution (allowed/warned/reflected/blocked counts)
   - Show avg_risk and avg_drift from `GET /api/report/generate`

   **Sandbox page (`/sandbox`):**
   - `SandboxRunner` already exists — verify the 5 scenarios appear in the dropdown
   - Show `teacher_summary` and triggered rules for each step result

6. **CORS — TM1 must add your Vercel URL**
   - When you deploy to Vercel, give TM1 your URL so they can add it to `CORS_ORIGINS` in `backend/.env`

---

## Environment Variables

```bash
# frontend/.env.local (create this file, do not commit it)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For Vercel deployment:
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

---

## What TM1 (Backend) Is Building

TM1 owns everything in `backend/`. They run a FastAPI server on port 8000. They provide all the API routes listed above. Do not edit any files in `backend/`. If you need a new endpoint or a field added to a response, ask TM1 — don't add it yourself.

## What TM3 (Sandbox) Is Building

TM3 owns `sandbox/` and `scripts/`. Their `sandbox/run_demo.py` CLI posts ActionEvent payloads to your backend and generates test data you can see in your dashboard. They will also wire up optional Snowflake/Wafer telemetry exports. Do not edit `sandbox/` or `scripts/`.

---

## Do Not Touch

- `backend/` — any file inside backend/
- `sandbox/` — any file inside sandbox/
- `scripts/` — any script file
- `shared/` — schema files

---

## Hour 2 Target
Dashboard at `/dashboard` loads real data from the backend (or falls back to mock data). All 5 decision types visible. `RiskBadge` and `CognitiveDriftMeter` render correctly.

## Hour 6 Target
All 5 pages working: dashboard, sandbox, policies, telemetry, reports. Reflection UX submits answers. CORS configured for your deployment URL.

## Final Demo Target
Frontend deployed to Vercel. Connected to TM1's backend on Render. Sandbox results from TM3 appear in the dashboard live. Judges can see blocked/warned/reflected events with teacher explanations.

---

## Git Commands

```bash
git checkout frontend-dashboard-reflection
git pull origin main

# After your changes:
git add frontend/
git commit --author="Farhat Hazara <fhazara05@gmail.com>" -m "feat: improve dashboard UX and reflection flow"
git push origin frontend-dashboard-reflection
```

When ready to merge, open a PR on GitHub: `frontend-dashboard-reflection → main`
