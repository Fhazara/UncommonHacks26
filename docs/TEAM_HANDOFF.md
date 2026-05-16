# Team Handoff — Claude Code on a Leash

## Structure

| Person | Role | Branch |
|--------|------|--------|
| TM1 | Backend / Policy + Comprehension Engine Lead | `backend-policy-comprehension` |
| TM2 | Frontend / Dashboard + Reflection UX Lead | `frontend-dashboard-reflection` |
| TM3 | Sandbox / Telemetry + Demo Integration Lead | `sandbox-telemetry-demo` |

## File Ownership

| Folder/File | Owner |
|---|---|
| `backend/app/services/` | TM1 |
| `backend/app/routes/` | TM1 |
| `backend/app/models.py` | TM1 |
| `backend/app/database.py` | TM1 |
| `backend/app/policies/` | TM1 |
| `frontend/` | TM2 |
| `sandbox/` | TM3 |
| `scripts/` | TM3 |
| `docs/` | TM3 |
| `backend/app/services/snowflake_exporter.py` | TM3 |
| `backend/app/services/wafer_exporter.py` | TM3 |
| `backend/app/services/telemetry_router.py` | TM3 |
| `shared/` | TM1 (schema) + TM3 (examples) |

## API Contracts (TM2 depends on these)

Backend must return `DecisionResponse` from `POST /api/actions/evaluate`:
```json
{
  "action_id": "string",
  "decision": "allow|warn|reflect|block",
  "mode": "research|use",
  "enforcement": "allowed|warned|would_warn|reflection_required|would_reflect|blocked|would_block",
  "action_risk_score": 0,
  "cognitive_drift_score": 0,
  "intent_mismatch_score": 0,
  "intervention_score": 0,
  "severity": "low|medium|high|critical",
  "triggered_rules": [],
  "teacher_explanation": {...},
  "reflection_question": null,
  "safer_alternative": null,
  "timestamp": "ISO8601",
  "exports": {"local": true, "snowflake": false, "wafer": false}
}
```

`GET /api/actions/logs` returns list of DB rows — same shape as `action_events` table.

## Git Workflow

```bash
# Each teammate
git checkout <your-branch>
git pull origin main

# Do your work
git add <your files only>
git commit -m "feat: describe what you built"
git push origin <your-branch>

# When ready to merge — create PR on GitHub
```

## Merge Order

1. TM1 backend merged first (TM2 and TM3 depend on working API)
2. TM3 sandbox merged after backend is up
3. TM2 frontend merged last
4. Final merge to main

## Do Not Touch

- TM1: Do not edit `frontend/` or `sandbox/`
- TM2: Do not edit `backend/services/` or `backend/models.py`
- TM3: Do not edit `frontend/components/` or `backend/routes/`
- Anyone editing `shared/` must tell all teammates immediately

## Communication

If you add a field to `DecisionResponse`, tell TM2.
If you change a route path, tell TM2 and TM3.
If backend is down, TM2 falls back to `frontend/lib/mockData.ts`.
