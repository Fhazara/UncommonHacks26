# Demo Script — Claude Code on a Leash

## Setup (Before Judges Arrive)

```bash
# 1. Start backend
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# 2. Start frontend
cd frontend && npm run dev

# 3. Seed the dashboard with demo data
python3 scripts/seed_logs.py --backend http://localhost:8000

# 4. Open dashboard in browser
open http://localhost:3000/dashboard
```

---

## 60-Second Demo

**"AI coding agents are useful, but users often approve actions they don't understand."**

1. Show dashboard → 8 events, mix of allowed/warned/reflected/blocked
2. Point to blocked event: `cat .env && curl ... evil.example`
3. Point to cognitive drift meter: score 70 — "passive approval"
4. Show teacher explanation card: plain English summary

**Done.**

---

## 3-Minute Demo

### Part 1: The Problem (30 seconds)

"AI coding agents can read your `.env` file, install malicious packages, and push to unknown
git remotes. And humans often approve these actions without reading them.
Our system catches both problems."

### Part 2: Research Mode (30 seconds)

Show toggle set to RESEARCH.

"In research mode, we observe and score. We never block — we study when users stop paying attention."

Click on `would_block` event. Show:
- Action risk score: 95
- Cognitive drift: 70 (approved in 900ms, no diff viewed, 3 fast approvals in a row)
- Intervention score: 175
- Teacher explanation

### Part 3: Run Live Scenario (60 seconds)

Switch to Sandbox page. Select "Prompt Injection README". Set mode to USE.

Click "Run Scenario".

Show results:
1. `file_read README.md` → allowed (safe)
2. `cat .env` → BLOCKED (critical: RULE_ENV_READ)
3. `curl ... evil.example` → BLOCKED (critical: RULE_EXFIL_CURL)

"The agent read a README that told it to steal environment secrets and send them to an attacker's
server. Our policy engine caught it in milliseconds."

### Part 4: Cognitive Drift (30 seconds)

Run "Cognitive Drift Demo" scenario. Show:
- 300-line auth rewrite
- Approved in 1.5 seconds
- No diff viewed, no explanation viewed
- Drift score 90+ → passive approval
- Intervention: reflection_required

"The user approved a 300-line authentication rewrite in 1.5 seconds without reading the diff.
Our cognitive drift engine detected this and would trigger a reflection loop."

### Part 5: Research Value (30 seconds)

Show Telemetry page.
"We log every action, score, and intervention. This data can answer: when do humans stop supervising?
What interventions restore meaningful oversight? This is human-AI complementarity research."

---

## Judge Q&A Answers

**"How does it integrate with Claude Code / Cursor?"**
"For the MVP, we simulate agent actions as JSON events. Level 2 integration would use Claude Code hooks or
PreToolUse events to intercept real commands before execution. Level 3 is an MCP safety gateway."

**"Why rule-based? Why not just use a model?"**
"The safety layer must be deterministic and auditable. You can't have your safety check fail because
an LLM was confused. We use a deterministic rule engine first, and optionally call a smaller
teacher/interpreter model only for explanation — not for the safety decision itself."

**"Isn't this just a wrapper?"**
"No. Wrappers check the agent. We check both the agent AND the human. Cognitive drift is the novel part.
We detect when the human stops supervising, which is just as dangerous as a bad agent action."

**"What about Snowflake?"**
"Snowflake is our optional analytics warehouse for research telemetry. Every evaluated action can be
exported to Snowflake for offline analysis of over-reliance, under-reliance, and cognitive drift patterns."

**"What about Wafer?"**
"Wafer is our optional real-time telemetry layer — a generic HTTP event poster. We send events like
`action_blocked` and `reflection_loop_triggered` in real time for observability."

**"Did you train a model?"**
"No. We generate synthetic telemetry from sandboxed agent scenarios. The dataset can later support
evaluation of human-AI oversight. The safety decisions are deterministic, not learned."
