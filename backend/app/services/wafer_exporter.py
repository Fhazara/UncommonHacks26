import httpx
from app.config import settings


async def export_to_wafer(event: dict, decision: dict) -> bool:
    if not settings.wafer_enabled:
        return False

    if not settings.wafer_endpoint:
        print("[Wafer] No endpoint configured — skipping export")
        return False

    payload = {
        "event_type": f"action_{decision.get('enforcement', 'evaluated')}",
        "session_id": event.get("session_id"),
        "user_prompt": event.get("user_prompt"),
        "agent_action": event.get("command") or event.get("file_path"),
        "action_type": event.get("action_type"),
        "action_risk_score": decision.get("action_risk_score"),
        "cognitive_drift_score": decision.get("cognitive_drift_score"),
        "intent_mismatch_score": decision.get("intent_mismatch_score"),
        "intervention_score": decision.get("intervention_score"),
        "decision": decision.get("decision"),
        "enforcement": decision.get("enforcement"),
        "mode": event.get("mode"),
        "severity": decision.get("severity"),
        "triggered_rules": [
            (r.get("rule_id") if isinstance(r, dict) else str(r))
            for r in decision.get("triggered_rules", [])
        ],
    }

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if settings.wafer_api_key:
        headers["Authorization"] = f"Bearer {settings.wafer_api_key}"

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(settings.wafer_endpoint, json=payload, headers=headers)
            return resp.status_code < 400
    except Exception as e:
        print(f"[Wafer] Export failed (non-critical): {e}")
        return False
