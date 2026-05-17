import anthropic
import json
from app.models import ParsedExperimentConfig, EndConditions, TaskCompletionCondition

SYSTEM_PROMPT = """
You are an experiment configuration parser for an HCI research platform studying human-AI complementarity in software development.

A researcher will describe their experiment in natural language. You must extract a structured configuration as JSON with exactly this schema:

{
  "task_name": "<short name for the experiment>",
  "task_description": "<detailed description of what the human participant must accomplish>",
  "judge_persona": "<one sentence description of the judge agent's personality and role>",
  "judge_system_prompt": "<full system prompt for the judge LLM that will run in the VS Code sidebar. It should describe the judge's persona, how it interacts with the human, what it should probe or challenge, and how it should behave during the experiment>",
  "end_conditions": {
    "time_limit_seconds": <integer or null>,
    "task_completion": {
      "type": "<tests_pass|file_exists|signal>",
      "test_command": "<shell command to run tests, or null>",
      "file_path": "<path to completion signal file, or null>",
      "required_pass_count": <integer or null>
    } or null,
    "manual": true
  },
  "active_interventions": {
    "prediction_questions_enabled": <boolean>,
    "bug_injection_enabled": <boolean>,
    "explanation_requests_enabled": <boolean>
  }
}

Respond with only the JSON object. No explanation, no markdown fences.
"""


async def parse_experiment_spec(nl_description: str, api_key: str) -> ParsedExperimentConfig:
    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": nl_description}],
    )

    raw = message.content[0].text.strip()
    parsed = json.loads(raw)

    end_conds_data = parsed.get("end_conditions", {})
    tc = end_conds_data.get("task_completion")
    task_completion = TaskCompletionCondition(**tc) if tc else None
    end_conditions = EndConditions(
        time_limit_seconds=end_conds_data.get("time_limit_seconds"),
        task_completion=task_completion,
        manual=end_conds_data.get("manual", True),
    )

    return ParsedExperimentConfig(
        task_name=parsed["task_name"],
        task_description=parsed["task_description"],
        judge_persona=parsed["judge_persona"],
        judge_system_prompt=parsed["judge_system_prompt"],
        end_conditions=end_conditions,
        active_interventions=parsed.get("active_interventions", {}),
    )
