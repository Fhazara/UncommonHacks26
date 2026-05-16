# AgentFirewall — Architecture Document

## What the System Does

AgentFirewall is a policy-driven firewall for AI coding agents. When an AI agent (Claude Code, Cursor, GitHub Copilot, or a custom agent) proposes an action — running a shell command, reading a file, installing a package, making a network request — it sends a structured JSON payload to AgentFirewall's `/api/actions/evaluate` endpoint **before** executing the action.

AgentFirewall:
1. Evaluates the action against a set of configurable YAML policy rules
2. Assigns a risk score (0–100) based on matched rules, action type, and current mode
3. Decides whether to **allow**, **warn**, or **block** the action
4. Optionally calls GPT-4o-mini for edge-case second opinions
5. Logs everything to SQLite + JSONL for the dashboard and audit trail
6. Returns a `Decision` object to the agent

The agent is responsible for honoring the decision (block = don't execute, warn = show user warning, allow = proceed).

---

## Full Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Agent Process                         │
│  (Claude Code / Cursor / custom wrapper / sandbox simulator)    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │  POST /api/actions/evaluate
                            │  Body: ActionEvent (JSON)
                            │  {id, timestamp, session_id, actor,
                            │   mode, action_type, command, ...}
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend (port 8000)                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  POST /api/actions/evaluate  (routes/actions.py)         │   │
│  │  1. Validate ActionEvent with Pydantic                   │   │
│  │  2. Call PolicyEngine.evaluate(action)                   │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │                                         │
│  ┌────────────────────▼─────────────────────────────────────┐   │
│  │  PolicyEngine  (services/policy_engine.py)               │   │
│  │  - Loads rules from default_policies.yaml + DB           │   │
│  │  - Iterates all enabled rules                            │   │
│  │  - For each rule, checks all conditions (AND logic)      │   │
│  │  - Condition operators: contains, equals, regex,         │   │
│  │    startswith, not_contains                              │   │
│  │  - Returns list[PolicyMatch] with evidence + risk_points │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │ list[PolicyMatch]                        │
│  ┌────────────────────▼─────────────────────────────────────┐   │
│  │  RiskScorer  (services/risk_scoring.py)                  │   │
│  │  - Sums risk_points from all PolicyMatches               │   │
│  │  - Applies action_type modifier                          │   │
│  │    (shell_command+10, network+8, file_write+5, pkg+7)    │   │
│  │  - Applies mode modifier (use+15, research-5)            │   │
│  │  - Clamps to 0-100                                       │   │
│  │  - Determines severity: low/medium/high/critical         │   │
│  │  - Determines decision:                                  │   │
│  │    use mode:      allow<30, warn 30-60, block>60         │   │
│  │    research mode: allow<40, warn 40-70, block>70         │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │ risk_score, decision                     │
│  ┌────────────────────▼─────────────────────────────────────┐   │
│  │  AIEvaluator  (services/ai_evaluator.py)  [OPTIONAL]     │   │
│  │  - Only runs if AI_EVALUATOR_ENABLED=true                │   │
│  │  - Only for edge-case scores (35-65)                     │   │
│  │  - Calls GPT-4o-mini with structured prompt              │   │
│  │  - Returns override_decision, reasoning, confidence      │   │
│  │  - Gracefully handles API errors (returns None)          │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │ Decision object                          │
│  ┌────────────────────▼─────────────────────────────────────┐   │
│  │  Logger  (services/logger.py)                            │   │
│  │  - Writes Decision+ActionEvent to JSONL file             │   │
│  │  - Inserts row into SQLite ActionLog table               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Response: Decision JSON → back to agent                        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │  REST API (polling / websocket future)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Next.js Frontend (port 3000)                   │
│                                                                 │
│  /dashboard    - Live action timeline (polls every 5s)         │
│  /sandbox      - Scenario runner                               │
│  /policies     - Policy CRUD                                   │
│  /reports/[id] - Session reports with charts                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Main Services

### `policy_engine.py` — PolicyEngine
Loads YAML policy definitions and evaluates each incoming action against all enabled rules. Each rule has one or more conditions with field/operator/value triples. All conditions must match (AND logic) for a rule to trigger. Returns a `list[PolicyMatch]` with evidence, risk points, and suggested safer alternatives.

### `risk_scoring.py` — RiskScorer
Converts the list of PolicyMatches into a single integer risk score (0–100). Applies base points from each match, then adds modifiers for action type and mode. Uses mode-aware thresholds to determine the final `allow`/`warn`/`block` decision.

### `logger.py` — Logger
Persists every evaluation result. Writes a newline-delimited JSON record to the JSONL log file and inserts a row into the SQLite `action_logs` table. Also provides query methods used by the dashboard API.

### `ai_evaluator.py` — AIEvaluator
Optional second-opinion service. Activated when `AI_EVALUATOR_ENABLED=true` and the risk score falls in the ambiguous 35–65 range. Sends a structured prompt to GPT-4o-mini and may override the rule-based decision. Designed to catch false positives and false negatives in edge cases.

### `report_generator.py` — ReportGenerator
Aggregates logs for a given session or time window into a structured report: summary stats, risk timeline, top dangerous actions, policy violations by category, and actionable recommendations.

---

## How Frontend/Backend Communicate

The frontend (Next.js) communicates with the backend (FastAPI) over plain HTTP REST API. All endpoints are under `/api/*`. The frontend polls `/api/actions` every 5 seconds for the live dashboard. Policy CRUD and sandbox runs are triggered by user actions.

In development: frontend at `localhost:3000`, backend at `localhost:8000`, CORS configured to allow the frontend origin.

In production: `NEXT_PUBLIC_API_URL` is set to the Render backend URL, and CORS is configured to allow the Vercel frontend domain.

---

## How the Sandbox Connects

The Python sandbox (`sandbox/run_demo.py`) simulates a misbehaving AI agent by constructing realistic `ActionEvent` JSON objects and POSTing them directly to `http://localhost:8000/api/actions/evaluate`. Each scenario (prompt_injection, secrets_exfiltration, dependency_attack) submits 4–6 actions in sequence, printing color-coded results to the terminal.

The frontend sandbox page (`/sandbox`) calls `POST /api/sandbox/run` which internally executes the same logic server-side, returning a list of `Decision` objects the UI can display.

---

## How Deployment Works

- **Frontend**: Deployed to **Vercel**. Push to `main` triggers automatic deployment. Set `NEXT_PUBLIC_API_URL` to the backend Render URL in Vercel environment settings.
- **Backend**: Deployed to **Render** as a web service. Build command: `pip install -r requirements.txt`. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`. SQLite database persists on Render's attached disk.
- **Database**: SQLite file at `./data/firewall.db`. Tables are auto-created on startup via `init_db()`.

See `docs/DEPLOYMENT.md` for step-by-step instructions.

---

## ASCII Architecture Diagram

```
 ╔══════════════════════════════════════════════════════════════╗
 ║                    AGENTFIREWALL SYSTEM                     ║
 ╠══════════════════════════════════════════════════════════════╣
 ║                                                              ║
 ║  ┌─────────────┐    ActionEvent JSON                        ║
 ║  │  AI Agent   │ ──────────────────────────────┐            ║
 ║  │ (Claude /   │                               │            ║
 ║  │  Cursor /   │  ◄── Decision JSON ───────────┤            ║
 ║  │  Sandbox)   │                               │            ║
 ║  └─────────────┘                               │            ║
 ║                                                ▼            ║
 ║  ┌─────────────────────────────────────────────────────┐   ║
 ║  │              FastAPI  (port 8000)                   │   ║
 ║  │  ┌────────────┐  ┌───────────┐  ┌──────────────┐  │   ║
 ║  │  │  /actions  │  │/policies  │  │  /sandbox    │  │   ║
 ║  │  │  /evaluate │  │  CRUD     │  │  /run        │  │   ║
 ║  │  └─────┬──────┘  └───────────┘  └──────────────┘  │   ║
 ║  │        │                                            │   ║
 ║  │  ┌─────▼──────────────────────────────────────┐   │   ║
 ║  │  │           Service Layer                     │   │   ║
 ║  │  │  PolicyEngine → RiskScorer → AIEvaluator   │   │   ║
 ║  │  │                    ↓                        │   │   ║
 ║  │  │               Logger                        │   │   ║
 ║  │  └─────────────────────────────────────────────┘   │   ║
 ║  │        │                    │                        │   ║
 ║  │  ┌─────▼──────┐   ┌────────▼────────┐              │   ║
 ║  │  │  SQLite DB │   │  JSONL Log File │              │   ║
 ║  │  │  (tables:  │   │  action_logs    │              │   ║
 ║  │  │  action_   │   │  .jsonl         │              │   ║
 ║  │  │  logs,     │   └─────────────────┘              │   ║
 ║  │  │  policies) │                                     │   ║
 ║  │  └────────────┘                                     │   ║
 ║  └─────────────────────────────────────────────────────┘   ║
 ║                         │ REST API                           ║
 ║                         ▼                                    ║
 ║  ┌─────────────────────────────────────────────────────┐   ║
 ║  │           Next.js Frontend  (port 3000)             │   ║
 ║  │                                                     │   ║
 ║  │   /dashboard   /sandbox   /policies   /reports      │   ║
 ║  └─────────────────────────────────────────────────────┘   ║
 ╚══════════════════════════════════════════════════════════════╝
```
