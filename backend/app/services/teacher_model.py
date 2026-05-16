import json
from app.models import TeacherExplanation, PolicyMatch, CognitiveDriftResult, SeverityLevel
from app.config import settings

# Rule-based fallback templates keyed by action type
_TEMPLATES: dict[str, dict] = {
    "shell_command": {
        "plain_english_summary": "The agent wants to run a terminal command on your system.",
        "why_it_matters": "Terminal commands can read, modify, or delete files and system state.",
        "what_could_go_wrong": "An unsafe command can delete data, expose secrets, or harm your system.",
        "risk_level": "medium",
        "reflection_question": "Can you describe in your own words what this command does?",
        "safer_alternative": "Review each flag in the command before approving. Ask the agent to explain any unfamiliar syntax.",
        "should_pause_user": False,
    },
    "file_read": {
        "plain_english_summary": "The agent wants to read a file from your project.",
        "why_it_matters": "Some files contain passwords, API keys, or private credentials.",
        "what_could_go_wrong": "If the file contains secrets, they could appear in logs or be sent elsewhere.",
        "risk_level": "low",
        "reflection_question": "Does this file contain any sensitive information like passwords or API keys?",
        "safer_alternative": "Confirm the file does not contain secrets before allowing the read.",
        "should_pause_user": False,
    },
    "file_write": {
        "plain_english_summary": "The agent wants to modify or create a file in your project.",
        "why_it_matters": "Writing to critical files can break the application or introduce security vulnerabilities.",
        "what_could_go_wrong": "Incorrect changes to auth, config, or migration files can cause data loss or security issues.",
        "risk_level": "medium",
        "reflection_question": "Have you reviewed the diff to confirm this change matches what you originally asked for?",
        "safer_alternative": "Open the diff and scroll through the full change before approving.",
        "should_pause_user": False,
    },
    "dependency_install": {
        "plain_english_summary": "The agent wants to install a software package.",
        "why_it_matters": "Malicious packages can run code at install time and steal credentials or modify your project.",
        "what_could_go_wrong": "Typosquatted or malicious packages can compromise your entire project.",
        "risk_level": "medium",
        "reflection_question": "Have you verified that this exact package name is correct on npmjs.com or PyPI?",
        "safer_alternative": "Verify the exact package name and check the download count before installing.",
        "should_pause_user": True,
    },
    "network_request": {
        "plain_english_summary": "The agent wants to make a network request to an external service.",
        "why_it_matters": "Network requests can send data to external servers, including secrets or code.",
        "what_could_go_wrong": "Sensitive data could be sent to an attacker-controlled server.",
        "risk_level": "high",
        "reflection_question": "Do you recognize the URL this request is being sent to?",
        "safer_alternative": "Verify the destination URL and what data is being sent before approving.",
        "should_pause_user": True,
    },
    "git_operation": {
        "plain_english_summary": "The agent wants to perform a Git operation.",
        "why_it_matters": "Git pushes and force operations can overwrite history and affect collaborators.",
        "what_could_go_wrong": "Force pushing or pushing to the wrong remote can destroy shared history.",
        "risk_level": "medium",
        "reflection_question": "Do you know which branch and remote this operation targets?",
        "safer_alternative": "Always confirm the remote URL and branch name before pushing.",
        "should_pause_user": False,
    },
    "critical_override": {
        "plain_english_summary": "This action has been flagged as potentially dangerous by the safety system.",
        "why_it_matters": "The system detected a pattern that matches a known attack vector or high-risk operation.",
        "what_could_go_wrong": "Executing this could expose secrets, delete important data, or exfiltrate information to an attacker.",
        "risk_level": "critical",
        "reflection_question": "Does this action match what you originally asked the agent to do?",
        "safer_alternative": "Reject this action and ask the agent to provide a safer approach that does not access secrets or external services.",
        "should_pause_user": True,
    },
}


def _build_template(action: dict, matches: list[PolicyMatch]) -> TeacherExplanation:
    action_type = action.get("action_type", "shell_command")
    has_critical = any(m.severity == SeverityLevel.critical for m in matches)

    if has_critical or matches:
        template = dict(_TEMPLATES["critical_override"])
        if matches:
            top = matches[0]
            template["plain_english_summary"] = top.reason
            template["safer_alternative"] = top.safer_alternative
            if len(matches) > 1:
                template["what_could_go_wrong"] = "; ".join(
                    m.reason for m in matches[:3]
                )
            template["risk_level"] = top.severity.value
    else:
        template = dict(_TEMPLATES.get(action_type, _TEMPLATES["shell_command"]))

    return TeacherExplanation(**template)


def _call_openai(action: dict, matches: list[PolicyMatch], drift: CognitiveDriftResult) -> TeacherExplanation | None:
    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)

        system_prompt = (
            "You are a teacher and safety interpreter for AI coding-agent actions. "
            "Your job is to explain what the coding agent is trying to do, why it matters, "
            "what could go wrong, and what the user should understand before approving. "
            "Return JSON only. No markdown fences, no extra text outside the JSON object."
        )

        user_prompt = f"""
Original user request: {action.get("user_prompt", "unknown")}
Agent stated plan: {action.get("agent_stated_plan", "unknown")}
Proposed action: {json.dumps({k: action.get(k) for k in ["action_type", "command", "file_path", "lines_changed"]})}
Policy matches: {json.dumps([m.model_dump() for m in matches])}
Cognitive drift: drift_score={drift.drift_score}, level={drift.user_understanding_level}

Return exactly this JSON:
{{
  "plain_english_summary": "...",
  "why_it_matters": "...",
  "what_could_go_wrong": "...",
  "risk_level": "low|medium|high|critical",
  "reflection_question": "...",
  "safer_alternative": "...",
  "should_pause_user": true
}}
"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=500,
        )
        raw = response.choices[0].message.content.strip()
        data = json.loads(raw)
        return TeacherExplanation(**data)
    except Exception:
        return None


def generate_explanation(
    action: dict,
    matches: list[PolicyMatch],
    drift: CognitiveDriftResult,
) -> TeacherExplanation:
    if settings.allow_ai_evaluator and settings.openai_api_key:
        result = _call_openai(action, matches, drift)
        if result:
            return result
    return _build_template(action, matches)
