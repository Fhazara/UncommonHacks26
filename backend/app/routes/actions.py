from fastapi import APIRouter, HTTPException

from app.models import ActionEvent, DecisionResponse
from app.services.policy_engine import evaluate_action
from app.services.cognitive_drift import compute_drift
from app.services.teacher_model import generate_explanation
from app.services.intervention_engine import make_decision
from app.services.telemetry_router import route_telemetry
from app.database import save_event, get_recent_logs, get_log_by_id

router = APIRouter()


@router.post("/evaluate", response_model=DecisionResponse)
async def evaluate(event: ActionEvent):
    action_dict = event.model_dump()

    policy_matches = evaluate_action(action_dict)
    drift_result = compute_drift(action_dict)
    teacher_explanation = generate_explanation(action_dict, policy_matches, drift_result, sim=getattr(event, 'sim', False))
    decision = make_decision(action_dict, policy_matches, drift_result, teacher_explanation)

    decision_dict = decision.model_dump()
    # Serialise enums for JSON storage
    decision_dict["decision"] = decision_dict["decision"].value if hasattr(decision_dict["decision"], "value") else decision_dict["decision"]
    decision_dict["severity"] = decision_dict["severity"].value if hasattr(decision_dict["severity"], "value") else decision_dict["severity"]
    decision_dict["action_id"] = action_dict["id"]

    await save_event(action_dict, decision_dict)
    export_results = await route_telemetry(action_dict, decision_dict)

    # Patch export status back onto response
    decision.exports.local = export_results.get("local", True)
    decision.exports.snowflake = export_results.get("snowflake", False)
    decision.exports.wafer = export_results.get("wafer", False)

    return decision


@router.get("/logs")
async def get_logs(limit: int = 50):
    return await get_recent_logs(limit)


@router.get("/{action_id}")
async def get_action(action_id: str):
    result = await get_log_by_id(action_id)
    if not result:
        raise HTTPException(status_code=404, detail="Action not found")
    return result
