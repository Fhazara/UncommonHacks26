import json
import pytest
from unittest.mock import MagicMock, patch
from app.services.nl_parser import parse_experiment_spec
from app.models import ParsedExperimentConfig


MOCK_RESPONSE = {
    "task_name": "Implement Fibonacci",
    "task_description": "Write a function that computes the nth Fibonacci number.",
    "judge_persona": "A Socratic mentor that asks probing questions.",
    "judge_system_prompt": "You are a Socratic judge. Ask the participant to predict outcomes before running code.",
    "end_conditions": {
        "time_limit_seconds": 1800,
        "task_completion": {
            "type": "tests_pass",
            "test_command": "pytest",
            "file_path": None,
            "required_pass_count": None,
        },
        "manual": True,
    },
    "active_interventions": {
        "prediction_questions_enabled": True,
        "bug_injection_enabled": False,
        "explanation_requests_enabled": True,
    },
}


@pytest.mark.asyncio
async def test_parse_experiment_spec_returns_parsed_config():
    mock_content = MagicMock()
    mock_content.text = json.dumps(MOCK_RESPONSE)

    mock_message = MagicMock()
    mock_message.content = [mock_content]

    mock_client = MagicMock()
    mock_client.messages.create.return_value = mock_message

    with patch("app.services.nl_parser.anthropic.Anthropic", return_value=mock_client):
        result = await parse_experiment_spec(
            "Build a Fibonacci experiment with tests and 30-minute limit.",
            api_key="sk-ant-test",
        )

    assert isinstance(result, ParsedExperimentConfig)
    assert result.task_name == "Implement Fibonacci"
    assert result.judge_persona == "A Socratic mentor that asks probing questions."
    assert result.end_conditions.time_limit_seconds == 1800
    assert result.end_conditions.task_completion is not None
    assert result.end_conditions.task_completion.type == "tests_pass"
    assert result.active_interventions["prediction_questions_enabled"] is True
