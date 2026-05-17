import json
import pytest
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport

from main import app
from app import database as db

pytestmark = pytest.mark.asyncio


async def _seed_experiment(experiment_id: str) -> None:
    await db.init_db()
    await db.save_experiment({
        "experiment_id": experiment_id,
        "status": "running",
        "nl_description": "Test experiment",
        "parsed_config": json.dumps({
            "task_name": "Test",
            "task_description": "desc",
            "judge_persona": "persona",
            "judge_system_prompt": "sys",
            "end_conditions": {
                "time_limit_seconds": None,
                "task_completion": None,
                "manual": True,
            },
            "active_interventions": {},
        }),
        "anthropic_api_key": "sk-test",
        "model": "claude-sonnet-4-6",
        "starter_code_source": "none",
        "github_url": None,
        "container_id": None,
        "vscode_port": None,
        "workspace_path": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "started_at": None,
        "ended_at": None,
        "error": None,
    })


async def test_receive_telemetry_stores_events():
    experiment_id = "test-telemetry-exp-a"
    await _seed_experiment(experiment_id)

    payload = {
        "events": [
            {
                "event_type": "file_edit",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "session_id": "sess-001",
                "data": {"file": "main.py", "changes": 3},
            }
        ]
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            f"/api/experiments/{experiment_id}/telemetry", json=payload
        )

    assert response.status_code == 200
    assert response.json()["received"] == 1

    events = await db.get_telemetry_events(experiment_id)
    assert len(events) >= 1
    assert any(e["event_type"] == "file_edit" for e in events)
    assert any(e["session_id"] == "sess-001" for e in events)


async def test_get_telemetry_returns_events():
    experiment_id = "test-telemetry-exp-a"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(f"/api/experiments/{experiment_id}/telemetry")

    assert response.status_code == 200
    body = response.json()
    assert "events" in body
    assert isinstance(body["count"], int)


async def test_receive_telemetry_unknown_experiment():
    payload = {
        "events": [
            {
                "event_type": "focus_change",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "session_id": "sess-x",
                "data": {},
            }
        ]
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/experiments/nonexistent-id/telemetry", json=payload)

    assert response.status_code == 404
