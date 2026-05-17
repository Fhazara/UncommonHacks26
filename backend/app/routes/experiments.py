import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from app.models import ExperimentCreate, ExperimentStatus, ExperimentSummary, TelemetryBatch
from app.services import experiment_manager
from app import database as db

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


def _backend_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


@router.post("", response_model=dict)
async def create_experiment(spec: ExperimentCreate, request: Request):
    experiment_id = await experiment_manager.create_experiment(spec)
    return {"experiment_id": experiment_id}


@router.get("", response_model=list[ExperimentSummary])
async def list_experiments():
    records = await db.list_experiments()
    result = []
    for r in records:
        config = json.loads(r["parsed_config"])
        result.append(ExperimentSummary(
            experiment_id=r["experiment_id"],
            task_name=config.get("task_name", ""),
            status=r["status"],
            created_at=datetime.fromisoformat(r["created_at"]),
            started_at=datetime.fromisoformat(r["started_at"]) if r.get("started_at") else None,
            ended_at=datetime.fromisoformat(r["ended_at"]) if r.get("ended_at") else None,
            nl_description=r["nl_description"],
        ))
    return result


@router.get("/{experiment_id}", response_model=dict)
async def get_experiment(experiment_id: str):
    record = await db.get_experiment(experiment_id)
    if not record:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return record


@router.post("/{experiment_id}/start", response_model=ExperimentStatus)
async def start_experiment(experiment_id: str, request: Request):
    record = await db.get_experiment(experiment_id)
    if not record:
        raise HTTPException(status_code=404, detail="Experiment not found")
    if record["status"] not in ("created",):
        raise HTTPException(status_code=409, detail=f"Experiment is already {record['status']}")

    return await experiment_manager.start_experiment(experiment_id, _backend_url(request))


@router.post("/{experiment_id}/stop")
async def stop_experiment(experiment_id: str):
    record = await db.get_experiment(experiment_id)
    if not record:
        raise HTTPException(status_code=404, detail="Experiment not found")
    if record["status"] not in ("running", "provisioning"):
        raise HTTPException(status_code=409, detail="Experiment is not running")

    await experiment_manager.stop_experiment(experiment_id)
    return {"status": "stopped"}


@router.post("/{experiment_id}/telemetry")
async def receive_telemetry(experiment_id: str, batch: TelemetryBatch):
    record = await db.get_experiment(experiment_id)
    if not record:
        raise HTTPException(status_code=404, detail="Experiment not found")

    for event in batch.events:
        await db.save_telemetry_event(experiment_id, {
            "id": str(uuid.uuid4()),
            "experiment_id": experiment_id,
            "session_id": event.session_id,
            "event_type": event.event_type,
            "timestamp": event.timestamp.isoformat(),
            "data": event.data,
        })

    return {"received": len(batch.events)}


@router.get("/{experiment_id}/telemetry")
async def get_telemetry(experiment_id: str, event_type: str = None):
    event_types = [event_type] if event_type else None
    events = await db.get_telemetry_events(experiment_id, event_types=event_types)
    return {"events": events, "count": len(events)}


@router.post("/{experiment_id}/complete")
async def signal_task_completion(experiment_id: str, request: Request):
    body = await request.json()
    await db.save_telemetry_event(experiment_id, {
        "id": str(uuid.uuid4()),
        "experiment_id": experiment_id,
        "session_id": body.get("session_id", ""),
        "event_type": "task_completion_signal",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": json.dumps(body),
    })
    return {"acknowledged": True}
