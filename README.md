# Tether

**A safety, comprehension, and telemetry layer for AI coding agents.**

> AI coding agents are powerful — but they can be manipulated by malicious repo instructions, unsafe commands, or hidden exfiltration attempts. Even worse, humans often approve agent actions without understanding the consequences. This project adds a safety firewall, a cognitive drift detector, a teacher/interpreter model, and a research telemetry layer between what an agent proposes and what actually executes.

---

## The Problem

AI coding agents like Claude Code, Cursor, and Devin-style assistants can:
- Read `.env` files and secrets
- Run `rm -rf`, `sudo`, `chmod 777`
- Install malicious or typosquatted dependencies
- Exfiltrate code and secrets to external URLs
- Follow injected instructions hidden in READMEs
- Modify auth logic, database migrations, and deployment configs

Two compounding problems:

1. **Agent-action risk** — The agent may attempt something technically dangerous.
2. **Human cognitive drift** — The human may stop meaningfully supervising. If the first several actions seem correct, users often blindly approve large diffs and risky commands without understanding them.

**Current AI coding tools assume human approval equals human understanding. That assumption is false.**

---

## The Solution

**Claude Code on a Leash** separates approval from understanding.

It checks:
1. Is the proposed agent action technically safe?
2. Does the human user understand what they are approving?
3. Is the user drifting into passive approval because the agent seems competent?
4. Should the system allow, warn, ask a reflection question, or block?

---

## Two Operating Modes

| Mode | Behavior |
|------|----------|
| **Research Mode** | Observes, scores, logs. Never blocks. Shows `would_warn`, `would_reflect`, `would_block`. Exports telemetry for human-AI oversight research. |
| **Use Mode** | Actively enforces. Allows low-risk, warns medium-risk, forces reflection on high-risk, blocks critical actions. |

---

## Core Features

- **Policy Engine** — Deterministic YAML rules. Detects `rm -rf`, `.env` reads, exfiltration, prompt injection, typosquatting, path traversal, auth-file edits, and more.
- **Cognitive Drift Engine** — Measures whether the user is meaningfully supervising by tracking approval speed, diff viewed, explanation viewed, scroll depth, keystroke activity.
- **Teacher/Interpreter Model** — Smaller model (or rule-based fallback) explains the coding agent's actions in plain English. Generates reflection questions and safer alternatives.
- **Intervention Engine** — Combines action risk + cognitive drift + intent mismatch into a final decision.
- **Research Telemetry** — Logs every action, score, explanation, and intervention. Exports to Snowflake and/or Wafer if configured.
- **Sandbox Scenarios** — Repeatable demo scenarios: prompt injection, secrets exfiltration, dangerous cleanup, dependency attack, cognitive drift.
- **Dark Cybersecurity Dashboard** — Real-time action timeline, risk scores, drift meter, teacher explanation cards, reflection prompts, telemetry panel.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       USER / BROWSER                        │
│   [Coding Request] → [Agent Proposes Action] → [Dashboard]  │
└───────────────────────────┬─────────────────────────────────┘
                            │ POST /api/actions/evaluate
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND                         │
│  ├── Policy Engine      (YAML rules → risk score)           │
│  ├── Cognitive Drift    (telemetry → drift score)           │
│  ├── Teacher Model      (plain English explanation)         │
│  └── Intervention       (allow / warn / reflect / block)   │
│                                                             │
│  Storage: SQLite + JSONL (always)                           │
│  Optional: Snowflake exporter, Wafer exporter               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  SANDBOX / DEMO ENGINE                      │
│  run_demo.py → generates ActionEvent JSON → POSTs to backend│
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
git clone https://github.com/Fhazara/UncommonHacks26.git
cd UncommonHacks26

# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Sandbox demo (new terminal, needs backend running)
cd sandbox
python3 run_demo.py --scenario prompt_injection_repo --backend http://localhost:8000 --mode use
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) to see the live dashboard.

---

## Intervention Score

```
intervention_score = action_risk_score + cognitive_drift_score + intent_mismatch_score

0–24:   allow
25–59:  warn
60–99:  reflect (user must answer comprehension question)
100+:   block
any critical policy match in use mode: block immediately
research mode: never block, reports would_warn / would_reflect / would_block
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11, Pydantic v2 |
| Policy Config | YAML |
| Local Logging | SQLite + JSONL |
| Optional Analytics | Snowflake |
| Optional Telemetry | Wafer |
| Optional AI Interpreter | OpenAI API / Gemini API |
| Frontend Deploy | Vercel |
| Backend Deploy | Render / Railway |

---

## Team

| Role | Branch |
|------|--------|
| Backend / Policy + Comprehension Engine Lead | `backend-policy-comprehension` |
| Frontend / Dashboard + Reflection UX Lead | `frontend-dashboard-reflection` |
| Sandbox / Telemetry + Demo Integration Lead | `sandbox-telemetry-demo` |

---

## Repository: [github.com/Fhazara/UncommonHacks26](https://github.com/Fhazara/UncommonHacks26)
