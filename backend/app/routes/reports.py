from fastapi import APIRouter, HTTPException
from app.database import get_session_logs, get_log_by_id

router = APIRouter()


@router.get("/generate")
async def generate_report(session_id: str):
    logs = await get_session_logs(session_id)
    if not logs:
        raise HTTPException(status_code=404, detail="No events found for session")

    decisions = [e.get("decision", {}) for e in logs]

    def _count(key, val):
        return sum(1 for d in decisions if d.get(key) == val)

    return {
        "session_id": session_id,
        "total_actions": len(logs),
        "allowed": _count("enforcement", "allowed"),
        "warned": _count("enforcement", "warned") + _count("enforcement", "would_warn"),
        "reflected": _count("enforcement", "reflection_required") + _count("enforcement", "would_reflect"),
        "blocked": _count("enforcement", "blocked") + _count("enforcement", "would_block"),
        "avg_risk_score": (
            sum(d.get("action_risk_score", 0) for d in decisions) // max(len(decisions), 1)
        ),
        "avg_drift_score": (
            sum(d.get("cognitive_drift_score", 0) for d in decisions) // max(len(decisions), 1)
        ),
        "events": logs,
    }
