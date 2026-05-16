"""Generate session-level summary reports from logged events."""
from app.database import get_session_logs


async def generate_session_report(session_id: str) -> dict:
    logs = await get_session_logs(session_id)
    if not logs:
        return {"session_id": session_id, "total_actions": 0}

    decisions = [e.get("decision", {}) for e in logs]
    enforcements = [d.get("enforcement", "") for d in decisions]

    return {
        "session_id": session_id,
        "total_actions": len(logs),
        "allowed": enforcements.count("allowed"),
        "warned": enforcements.count("warned") + enforcements.count("would_warn"),
        "reflected": enforcements.count("reflection_required") + enforcements.count("would_reflect"),
        "blocked": enforcements.count("blocked") + enforcements.count("would_block"),
        "avg_risk": sum(d.get("action_risk_score", 0) for d in decisions) // max(len(decisions), 1),
        "avg_drift": sum(d.get("cognitive_drift_score", 0) for d in decisions) // max(len(decisions), 1),
        "events": logs,
    }
