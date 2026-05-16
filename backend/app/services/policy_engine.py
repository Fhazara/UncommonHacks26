import re
import yaml
from pathlib import Path

from app.models import PolicyMatch, SeverityLevel

POLICIES_PATH = Path(__file__).parent.parent / "policies" / "default_policies.yaml"


def load_policies() -> list:
    with open(POLICIES_PATH) as f:
        data = yaml.safe_load(f)
    return data.get("policies", [])


_policies: list = load_policies()


def reload_policies():
    global _policies
    _policies = load_policies()
    return len(_policies)


def get_all_policies() -> list:
    return _policies


def evaluate_action(action: dict) -> list[PolicyMatch]:
    matches: list[PolicyMatch] = []
    action_type = action.get("action_type", "")
    command = (action.get("command") or "").lower()
    file_path = (action.get("file_path") or "").lower()
    agent_plan = (action.get("agent_stated_plan") or "").lower()
    agent_explanation = (action.get("agent_explanation") or "").lower()
    package_name = (action.get("package_name") or "").lower()

    full_text = f"{command} {file_path} {agent_plan} {agent_explanation} {package_name}"

    for policy in _policies:
        allowed_types = policy.get("matches", {}).get("action_types", [])
        if allowed_types and action_type not in allowed_types:
            continue

        matched = False
        evidence = ""

        for pattern in policy.get("matches", {}).get("patterns", []):
            p = pattern.lower()
            if p in full_text:
                matched = True
                evidence = pattern
                break

        if not matched:
            for fp in policy.get("matches", {}).get("file_paths", []):
                if fp.lower() in file_path or (fp.lower() in command):
                    matched = True
                    evidence = fp
                    break

        if not matched:
            for pp in policy.get("matches", {}).get("prompt_patterns", []):
                if pp.lower() in full_text:
                    matched = True
                    evidence = pp
                    break

        if matched:
            matches.append(
                PolicyMatch(
                    rule_id=policy["id"],
                    rule_name=policy["name"],
                    severity=SeverityLevel(policy["severity"]),
                    reason=policy["reason"],
                    evidence=evidence,
                    safer_alternative=policy["safer_alternative"],
                    risk_points=policy["risk_points"],
                )
            )

    return matches
