import asyncio
import uuid
from datetime import datetime, timezone

from app.models import ExperimentCreate, ParsedExperimentConfig, ExperimentStatus
from app.services.nl_parser import parse_experiment_spec
from app.services.judge_spec_builder import build_judge_spec, write_judge_spec
from app.services.docker_orchestrator import (
    provision_workspace,
    launch_container,
    stop_container,
    allocate_port,
    container_is_running,
)
from app.services.snowflake_exporter import export_experiment_to_snowflake
from app import database as db

_monitor_tasks: dict[str, asyncio.Task] = {}


async def create_experiment(spec: ExperimentCreate) -> str:
    experiment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    config = await parse_experiment_spec(spec.nl_description, spec.anthropic_api_key)

    await db.save_experiment({
        "experiment_id": experiment_id,
        "status": "created",
        "nl_description": spec.nl_description,
        "parsed_config": config.model_dump_json(),
        "anthropic_api_key": spec.anthropic_api_key,
        "model": spec.model,
        "starter_code_source": spec.starter_code_source,
        "github_url": spec.github_url,
        "container_id": None,
        "vscode_port": None,
        "workspace_path": None,
        "created_at": now,
        "started_at": None,
        "ended_at": None,
        "error": None,
    })

    return experiment_id


async def start_experiment(experiment_id: str, backend_url: str) -> ExperimentStatus:
    record = await db.get_experiment(experiment_id)
    if not record:
        raise ValueError(f"Experiment {experiment_id} not found")

    config = ParsedExperimentConfig.model_validate_json(record["parsed_config"])

    await db.update_experiment_status(experiment_id, status="provisioning")

    try:
        workspace_path = provision_workspace(
            experiment_id=experiment_id,
            starter_code_source=record["starter_code_source"],
            github_url=record.get("github_url"),
        )

        session_id = str(uuid.uuid4())
        spec = build_judge_spec(
            experiment_id=experiment_id,
            config=config,
            anthropic_api_key=record["anthropic_api_key"],
            model=record["model"],
            backend_url=backend_url,
            session_id=session_id,
        )
        write_judge_spec(workspace_path, spec)

        port = allocate_port()
        container_id = launch_container(experiment_id, workspace_path, port)

        now = datetime.now(timezone.utc).isoformat()
        await db.update_experiment_status(
            experiment_id,
            status="running",
            container_id=container_id,
            vscode_port=port,
            workspace_path=workspace_path,
            started_at=now,
        )

        task = asyncio.create_task(
            _monitor_experiment(experiment_id, config, container_id, workspace_path, port)
        )
        _monitor_tasks[experiment_id] = task

        return ExperimentStatus(
            experiment_id=experiment_id,
            status="running",
            container_id=container_id,
            vscode_port=port,
            vscode_url=f"http://localhost:{port}",
            started_at=datetime.fromisoformat(now),
        )

    except Exception as e:
        await db.update_experiment_status(experiment_id, status="failed", error=str(e))
        raise


async def stop_experiment(experiment_id: str) -> None:
    record = await db.get_experiment(experiment_id)
    if not record:
        raise ValueError(f"Experiment {experiment_id} not found")

    task = _monitor_tasks.pop(experiment_id, None)
    if task and not task.done():
        task.cancel()

    await db.update_experiment_status(experiment_id, status="stopping")

    if record.get("container_id"):
        stop_container(
            container_id=record["container_id"],
            workspace_path=record.get("workspace_path", ""),
            port=record.get("vscode_port", 0),
        )

    now = datetime.now(timezone.utc).isoformat()
    await db.update_experiment_status(experiment_id, status="completed", ended_at=now)

    await export_experiment_to_snowflake(experiment_id)


async def _monitor_experiment(
    experiment_id: str,
    config: ParsedExperimentConfig,
    container_id: str,
    workspace_path: str,
    port: int,
) -> None:
    end = config.end_conditions
    start_time = datetime.now(timezone.utc)

    try:
        while True:
            await asyncio.sleep(15)

            if not container_is_running(container_id):
                break

            if end.time_limit_seconds:
                elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
                if elapsed >= end.time_limit_seconds:
                    break

            if end.task_completion:
                events = await db.get_telemetry_events(
                    experiment_id, event_types=["task_completion_signal"]
                )
                if events:
                    break

    except asyncio.CancelledError:
        pass
    except Exception:
        pass
    else:
        await stop_experiment(experiment_id)
