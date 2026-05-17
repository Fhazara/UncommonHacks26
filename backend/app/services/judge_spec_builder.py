import json
from pathlib import Path
from app.models import ParsedExperimentConfig


def build_judge_spec(
    experiment_id: str,
    config: ParsedExperimentConfig,
    anthropic_api_key: str,
    model: str,
    backend_url: str,
    session_id: str,
) -> dict:
    return {
        "experimentId": experiment_id,
        "sessionId": session_id,
        "taskName": config.task_name,
        "taskDescription": config.task_description,
        "judgePersona": config.judge_persona,
        "judgeSystemPrompt": config.judge_system_prompt,
        "anthropicApiKey": anthropic_api_key,
        "model": model,
        "endConditions": config.end_conditions.model_dump(),
        "activeInterventions": config.active_interventions,
        "telemetryEndpoint": f"{backend_url}/api/experiments/{experiment_id}/telemetry",
        "completionSignalEndpoint": f"{backend_url}/api/experiments/{experiment_id}/complete",
    }


def write_judge_spec(workspace_path: str, spec: dict) -> None:
    judge_dir = Path(workspace_path) / ".judge"
    judge_dir.mkdir(parents=True, exist_ok=True)
    spec_path = judge_dir / "judge-spec.json"
    spec_path.write_text(json.dumps(spec, indent=2))
