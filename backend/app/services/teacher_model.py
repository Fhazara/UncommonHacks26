import json
from app.models import TeacherExplanation, PolicyMatch, CognitiveDriftResult, SeverityLevel
from app.config import settings

# Per-rule explanations override the generic critical_override template.
# Only the fields listed here replace the defaults; missing fields fall through.
_RULE_EXPLANATIONS: dict[str, dict] = {
    "RULE_ENV_READ": {
        "why_it_matters": ".env files store passwords, API keys, database credentials, and secret tokens in plain text.",
        "what_could_go_wrong": "Every secret in your .env file — database passwords, Stripe keys, JWT secrets — would be visible to whoever receives this output.",
    },
    "RULE_SSH_KEY_READ": {
        "why_it_matters": "SSH private keys prove your identity to servers. Whoever holds your private key can log in as you to any server that trusts it.",
        "what_could_go_wrong": "An attacker with your SSH private key gains persistent access to every server it is authorized on.",
    },
    "RULE_RM_RF": {
        "why_it_matters": "rm -rf deletes files immediately and permanently — no trash folder, no undo.",
        "what_could_go_wrong": "Entire directories, including source code, databases, and config files, can be deleted in under a second with no recovery option.",
    },
    "RULE_CURL_PIPE": {
        "why_it_matters": "Piping a URL directly into bash executes remote code on your machine without any inspection.",
        "what_could_go_wrong": "The remote script could install malware, create backdoors, steal credentials, or modify your codebase silently.",
    },
    "RULE_EXFIL_CURL": {
        "why_it_matters": "curl with -d can POST any file's contents to an attacker-controlled server over the internet.",
        "what_could_go_wrong": "All your secrets and config files would be sent to a server you do not control, permanently.",
    },
    "RULE_BASE64_EXFIL": {
        "why_it_matters": "Encoding data in base64 before sending it is a classic technique to evade simple pattern matching and make the exfiltration less obvious.",
        "what_could_go_wrong": "Your files are sent to an external server in obfuscated form, making it harder to notice the theft in logs.",
    },
    "RULE_CI_CD_EDIT": {
        "why_it_matters": "CI/CD pipelines run on every commit and have access to production secrets, deployment keys, and cloud credentials.",
        "what_could_go_wrong": "A malicious change to a workflow file can add a step that steals secrets from the CI environment or deploys backdoored code to production.",
    },
    "RULE_CLOUD_CREDENTIAL_READ": {
        "why_it_matters": "Cloud credentials (AWS, GCP, Azure) grant access to infrastructure, databases, storage, and billing — often with broad permissions.",
        "what_could_go_wrong": "Leaked cloud credentials can result in data theft, ransomware deployment, and thousands of dollars in unauthorized charges.",
    },
    "RULE_EVAL_EXEC": {
        "why_it_matters": "eval/exec with variable input turns untrusted strings into executable code, creating a code injection vulnerability.",
        "what_could_go_wrong": "An attacker who controls the input can execute arbitrary commands in your application or shell.",
    },
    "RULE_HISTORY_WIPE": {
        "why_it_matters": "Shell history is an audit trail of every command run. Clearing it is a well-known technique to hide malicious activity.",
        "what_could_go_wrong": "If something goes wrong, you will have no record of what commands were run, making forensics and recovery much harder.",
    },
    "RULE_PROMPT_INJECTION": {
        "why_it_matters": "Prompt injection means an attacker has embedded instructions inside content the agent read (a README, a code comment, a file), hijacking its behavior.",
        "what_could_go_wrong": "The agent may be acting on the attacker's instructions rather than yours — what appears to be a helpful action could be a deliberate attack.",
    },
    "RULE_TYPOSQUAT_NPM": {
        "why_it_matters": "Typosquatted packages have names nearly identical to popular ones (e.g. 'reacct' vs 'react') and run malicious install scripts.",
        "what_could_go_wrong": "The package's postinstall script can steal environment variables, modify source files, or install a persistent backdoor.",
    },
    "RULE_AUTH_FILE_EDIT": {
        "why_it_matters": "Authentication code controls who can access your application. Bugs here mean attackers can bypass login or escalate privileges.",
        "what_could_go_wrong": "A subtle logic error in auth code can make every user account vulnerable to takeover.",
    },
    "RULE_FORCE_PUSH": {
        "why_it_matters": "Force pushing rewrites shared git history, making it look like certain commits never happened.",
        "what_could_go_wrong": "Collaborators who have already pulled the old commits will have diverged history; commits can be permanently lost from the remote.",
    },
}

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
            template["risk_level"] = top.severity.value
            # Apply per-rule specific explanations when available
            rule_detail = _RULE_EXPLANATIONS.get(top.rule_id, {})
            template.update(rule_detail)
            # If multiple rules triggered, append each reason to what_could_go_wrong
            if len(matches) > 1 and "what_could_go_wrong" not in rule_detail:
                template["what_could_go_wrong"] = "; ".join(
                    m.reason for m in matches[:3]
                )
    else:
        template = dict(_TEMPLATES.get(action_type, _TEMPLATES["shell_command"]))

    return TeacherExplanation(**template)


def _call_wafer(action: dict, matches: list[PolicyMatch], drift: CognitiveDriftResult) -> TeacherExplanation | None:
    try:
        from openai import OpenAI

        client = OpenAI(
            api_key=settings.wafer_api_key,
            base_url="https://pass.wafer.ai/v1",
        )

        rules_summary = "; ".join(
            [f"{m.rule_id} ({m.severity}): {m.reason}" for m in matches[:3]]
        )
        drift_score = drift.drift_score if drift else 0

        prompt = f"""You are a security teacher explaining AI agent actions to a developer.

Action type: {action.get('action_type')}
Command: {action.get('command', 'N/A')}
File: {action.get('file_path', 'N/A')}
User prompt: {action.get('user_prompt', 'N/A')}
Agent plan: {action.get('agent_stated_plan', 'N/A')}
Policy violations: {rules_summary if rules_summary else 'none'}
Cognitive drift score: {drift_score}/100 (high = user is passively approving without reading)

Return ONLY a JSON object, no markdown, no explanation outside the JSON:
{{
  "plain_english_summary": "one sentence what the agent is trying to do",
  "why_it_matters": "one sentence why this is dangerous",
  "what_could_go_wrong": "one sentence worst case outcome",
  "risk_level": "low|medium|high|critical",
  "reflection_question": "one question to make the user think before approving",
  "safer_alternative": "one sentence safer way to accomplish the goal",
  "should_pause_user": true
}}"""

        response = client.chat.completions.create(
            model="Qwen3.5-397B-A17B",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.3,
        )

        raw_content = response.choices[0].message.content
        if not raw_content:
            return None
        text = raw_content.strip()
        text = text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)

        return TeacherExplanation(
            plain_english_summary=data.get("plain_english_summary", ""),
            why_it_matters=data.get("why_it_matters", ""),
            what_could_go_wrong=data.get("what_could_go_wrong", ""),
            risk_level=data.get("risk_level", "high"),
            reflection_question=data.get("reflection_question", ""),
            safer_alternative=data.get("safer_alternative", ""),
            should_pause_user=data.get("should_pause_user", True),
        )
    except Exception as e:
        print(f"[Wafer] teacher model error: {e}")
        return None


def _call_gemini(action: dict, matches: list[PolicyMatch], drift: CognitiveDriftResult) -> TeacherExplanation | None:
    try:
        from google import genai

        client = genai.Client(api_key=settings.gemini_api_key)

        prompt = f"""You are a teacher and safety interpreter for AI coding-agent actions.
Your job is to explain what the coding agent is trying to do, why it matters,
what could go wrong, and what the user should understand before approving.
Return JSON only. No markdown fences, no extra text outside the JSON object.

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
}}"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw.strip())
        return TeacherExplanation(**data)
    except Exception:
        return None


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
    sim: bool = False,
) -> TeacherExplanation:
    if sim:
        return _build_template(action, matches)
    if settings.wafer_enabled and settings.wafer_api_key:
        result = _call_wafer(action, matches, drift)
        if result:
            return result
    if settings.allow_ai_evaluator:
        if settings.gemini_api_key:
            result = _call_gemini(action, matches, drift)
            if result:
                return result
        if settings.openai_api_key:
            result = _call_openai(action, matches, drift)
            if result:
                return result
    return _build_template(action, matches)
