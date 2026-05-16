# Teammate 1 — Backend / Policy + Comprehension Engine Lead

> You are building only this part. Do not rewrite the whole repo. Do not touch `frontend/` or `sandbox/`.

---

## Project Summary

**Claude Code on a Leash** — a safety, comprehension, and telemetry firewall for AI coding agents.

AI coding agents can run dangerous terminal commands, read secrets, install malicious packages, and follow injected instructions. Humans often approve these actions without understanding them. This system watches both the agent and the human. It detects dangerous actions AND detects when the human is drifting into passive approval.

**Repo:** https://github.com/Fhazara/UncommonHacks26

**Your branch:** `backend-policy-comprehension`

---

## Your Role

You own the entire backend. You are responsible for:
- The FastAPI app and all routes
- The YAML-driven policy engine (already has 14 rules)
- The cognitive drift scoring engine
- The intervention engine (combines scores → allow/warn/reflect/block)
- The teacher/interpreter model (rule-based fallback + optional OpenAI)
- SQLite + JSONL local logging
- All Pydantic models
- All backend tests

---

## What Is Already Built (Do Not Rewrite)

The following files are **already written and working**. All 26 tests pass. Do not rewrite from scratch — read the existing code, understand it, and extend or fix it.

```
backend/main.py                              ← FastAPI app, CORS, routers
backend/app/config.py                        ← pydantic-settings, env vars
backend/app/models.py                        ← All Pydantic models
backend/app/database.py                      ← SQLite init, save_event, get_logs
backend/app/policies/default_policies.yaml  ← 14 YAML rules
backend/app/routes/actions.py               ← POST /api/actions/evaluate
backend/app/routes/policies.py              ← GET /api/policies
backend/app/routes/reflection.py            ← POST /api/reflection/answer
backend/app/routes/reports.py               ← GET /api/report/generate
backend/app/routes/sandbox.py               ← POST /api/sandbox/run
backend/app/routes/telemetry.py             ← GET /api/telemetry/session/{id}
backend/app/services/policy_engine.py       ← evaluate_action(), load_policies()
backend/app/services/cognitive_drift.py     ← compute_drift()
backend/app/services/intervention_engine.py ← make_decision()
backend/app/services/teacher_model.py       ← generate_explanation()
backend/app/services/risk_scoring.py        ← calculate_risk_score()
backend/app/services/telemetry_router.py    ← route_telemetry()
backend/app/services/snowflake_exporter.py  ← export_to_snowflake()
backend/app/services/wafer_exporter.py      ← export_to_wafer()
backend/app/services/logger.py              ← log_event(), log_reflection()
backend/app/tests/test_policy_engine.py     ← 13 passing tests
backend/app/tests/test_cognitive_drift.py   ← 7 passing tests
backend/app/tests/test_intervention_engine.py ← 6 passing tests
```

---

## Files You May Need to Touch

- `backend/app/policies/default_policies.yaml` — add more rules if needed
- `backend/app/services/teacher_model.py` — wire up OpenAI if you have a key
- `backend/app/services/cognitive_drift.py` — tune scoring if needed
- `backend/app/tests/` — add more tests for edge cases
- `backend/app/config.py` — add any missing settings

---

## Exact Data Models (Do Not Change Field Names — TM2 and TM3 depend on these)

### ActionEvent (incoming request body to POST /api/actions/evaluate)
```python
id: str                          # uuid, auto-generated
timestamp: str                   # ISO8601, auto-generated
session_id: str = "default_session"
actor: str = "agent"
mode: str                        # "research" | "use"
user_prompt: str
latest_user_instruction: str
user_skill_level: str            # "beginner" | "intermediate" | "advanced"
agent_stated_plan: str
agent_explanation: str
action_type: str                 # "shell_command" | "file_read" | "file_write" |
                                 # "dependency_install" | "network_request" |
                                 # "git_operation" | "plan_message" | "approval_request"
command: str | None
file_path: str | None
diff: str | None
lines_changed: int = 0
files_changed_count: int = 0
package_name: str | None
url: str | None
repo_context: str | None
approval_time_ms: int = 5000
time_spent_viewing_diff_ms: int = 0
time_spent_viewing_explanation_ms: int = 0
diff_viewed: bool = False
explanation_viewed: bool = False
scroll_depth_percent: float = 0.0
keystroke_count: int = 0
fast_approvals_in_row: int = 0
metadata: dict = {}
```

### DecisionResponse (returned by POST /api/actions/evaluate)
```python
action_id: str
decision: str                    # "allow" | "warn" | "reflect" | "block"
mode: str                        # "research" | "use"
enforcement: str                 # "allowed" | "warned" | "would_warn" |
                                 # "reflection_required" | "would_reflect" |
                                 # "blocked" | "would_block"
action_risk_score: int           # 0-100
cognitive_drift_score: int       # 0-100+
intent_mismatch_score: int       # 0-30
intervention_score: int          # sum of all three
severity: str                    # "low" | "medium" | "high" | "critical"
triggered_rules: list[PolicyMatch]
teacher_explanation: TeacherExplanation
reflection_question: str | None  # only set when decision is reflect or block
safer_alternative: str | None    # only set when decision is not allow
timestamp: str
exports: ExportStatus            # {local: bool, snowflake: bool, wafer: bool}
```

### Intervention Score Thresholds
```
0–24:   allow
25–59:  warn
60–99:  reflect
100+:   block
any critical policy match in use mode → always block
research mode → never block, map to would_warn / would_reflect / would_block
```

### Cognitive Drift Scoring (already implemented, do not change without good reason)
```
approval_time_ms < 2000          → +20 (approval_speed_flag)
lines_changed >= 100 AND ms < 5000 → +25 (diff_size_flag)
diff_viewed == false AND lines_changed > 5 → +30
explanation_viewed == false      → +15 (explanation_skipped_flag)
fast_approvals_in_row >= 3       → +20 (repeated_approval_flag)
keystroke_count < 3 AND scroll < 20 → +15 (low_engagement_flag)
user_skill_level == "beginner" AND score > 20 → +15
keystroke_count > 10             → -15
diff_viewed AND scroll > 80      → -15

0-24:   engaged
25-49:  mild_drift
50-74:  strong_drift
75+:    passive_approval
```

---

## API Routes (all already implemented, verify they work correctly)

```
GET  /api/health
POST /api/actions/evaluate          ← main endpoint TM2 and TM3 call
GET  /api/actions/logs?limit=50
GET  /api/actions/{action_id}
POST /api/reflection/answer
GET  /api/policies
POST /api/policies/reload
POST /api/sandbox/run
GET  /api/report/generate?session_id=xxx
GET  /api/telemetry/session/{session_id}
```

---

## Build Order (What To Do First)

1. **Clone and set up**
   ```bash
   git clone https://github.com/Fhazara/UncommonHacks26.git
   cd UncommonHacks26
   git checkout backend-policy-comprehension
   git pull origin main
   cd backend
   pip install -r requirements.txt --break-system-packages
   ```

2. **Run the existing tests to confirm baseline**
   ```bash
   cd backend
   python3 -m pytest app/tests/ -v
   # Expect: 26 passed
   ```

3. **Start the backend and confirm the API works**
   ```bash
   uvicorn main:app --reload --port 8000
   curl http://localhost:8000/api/health
   ```

4. **Test the main endpoint**
   ```bash
   curl -s -X POST http://localhost:8000/api/actions/evaluate \
     -H "Content-Type: application/json" \
     -d '{
       "session_id": "test_001",
       "mode": "use",
       "action_type": "shell_command",
       "command": "cat .env",
       "user_prompt": "Fix the login bug",
       "agent_stated_plan": "Read config",
       "approval_time_ms": 800,
       "diff_viewed": false,
       "explanation_viewed": false,
       "fast_approvals_in_row": 3,
       "user_skill_level": "beginner"
     }' | python3 -m json.tool
   # Expect: decision=block, enforcement=blocked, RULE_ENV_READ triggered
   ```

5. **Extend or fix as needed:**
   - Add more YAML rules to `default_policies.yaml` (e.g., base64 encoding, deploy file edits)
   - Improve teacher model templates if they feel too generic
   - Wire up OpenAI if `OPENAI_API_KEY` is available:
     - Set `ALLOW_AI_EVALUATOR=true` in `backend/.env`
     - The `_call_openai()` function in `teacher_model.py` is already written — it uses `gpt-4o-mini`
   - Add test cases for new rules
   - Tune cognitive drift thresholds if they feel off during demo

6. **CORS — update for deployment**
   - When TM2 deploys frontend, update `CORS_ORIGINS` in `backend/.env` to include their Vercel URL

---

## Environment Variables (backend/.env — create from .env.example)

```bash
cp ../.env.example backend/.env
```

Minimum required:
```
FIREWALL_MODE=research
ALLOW_AI_EVALUATOR=false
CORS_ORIGINS=http://localhost:3000
```

Optional:
```
OPENAI_API_KEY=sk-...
SNOWFLAKE_ENABLED=false
WAFER_ENABLED=false
```

---

## What TM2 (Frontend) Needs From You

TM2 is building the dashboard. They call:
- `POST /api/actions/evaluate` — must return `DecisionResponse` exactly as specified
- `GET /api/actions/logs` — must return list of DB rows with these fields: `id`, `session_id`, `timestamp`, `mode`, `action_type`, `command`, `file_path`, `action_risk_score`, `cognitive_drift_score`, `intervention_score`, `decision`, `enforcement`, `severity`, `triggered_rules`, `teacher_explanation`
- `GET /api/actions/{id}` — must return `{event: {...}, decision: {...}}`
- `GET /api/policies` — must return `{policies: [...]}`
- `POST /api/sandbox/run` — must return `{scenario, mode, results: [...]}`
- `POST /api/reflection/answer` — must return `{ok: true, action_id: "..."}`

**If you change any field name or response shape, tell TM2 immediately.**

## What TM3 (Sandbox) Needs From You

TM3's `run_demo.py` POSTs `ActionEvent` JSON to `POST /api/actions/evaluate` and parses `DecisionResponse`. They also use `POST /api/sandbox/run`. Do not remove or rename either endpoint.

---

## Hour 2 Target
`POST /api/actions/evaluate` returns correct `DecisionResponse` for all 5 scenario action types. All 26 tests pass.

## Hour 6 Target
Backend runs cleanly, CORS set, teacher model works, policies loaded. TM2 can connect their dashboard to your backend and see real data.

## Final Demo Target
Backend deployed to Render or running locally. All routes working. Snowflake/Wafer skip gracefully if not configured. TM3's sandbox sends events and they appear in the dashboard.

---

## Git Commands

```bash
git checkout backend-policy-comprehension
git pull origin main

# After your changes:
git add backend/
git commit --author="Farhat Hazara <fhazara05@gmail.com>" -m "feat: extend policy engine and teacher model"
git push origin backend-policy-comprehension
```

When ready to merge, open a PR on GitHub: `backend-policy-comprehension → main`
