from datetime import datetime, timezone

from app.models import (
    PolicyMatch,
    CognitiveDriftResult,
    TeacherExplanation,
    DecisionResponse,
    DecisionType,
    SeverityLevel,
    ExportStatus,
)
from app.services.risk_scoring import calculate_risk_score

WARN_THRESHOLD = 25
REFLECT_THRESHOLD = 60
BLOCK_THRESHOLD = 100


def _compute_intent_mismatch(action: dict) -> int:
    user_prompt = (action.get("user_prompt") or "").lower()
    command = (action.get("command") or "").lower()
    file_path = (action.get("file_path") or "").lower()

    if not user_prompt:
        return 0

    signals = [
        ("deploy" not in user_prompt and "push" not in user_prompt and "git push" in command),
        ("delete" not in user_prompt and "clean" not in user_prompt and "rm -rf" in command),
        (".env" in command and ".env" not in user_prompt and "secret" not in user_prompt and "env" not in user_prompt),
        ("curl" in command and ("api" not in user_prompt and "request" not in user_prompt and "fetch" not in user_prompt)),
        ("install" in command and "install" not in user_prompt and "package" not in user_prompt and "dependency" not in user_prompt),
    ]
    return min(sum(10 for s in signals if s), 30)


def make_decision(
    action: dict,
    matches: list[PolicyMatch],
    drift: CognitiveDriftResult,
    teacher: TeacherExplanation,
) -> DecisionResponse:
    mode = action.get("mode", "research")

    action_risk = calculate_risk_score(matches)
    drift_score = drift.drift_score
    intent_mismatch = _compute_intent_mismatch(action)
    intervention_score = action_risk + drift_score + intent_mismatch

    has_critical = any(m.severity == SeverityLevel.critical for m in matches)

    # Determine raw decision
    if has_critical or intervention_score >= BLOCK_THRESHOLD:
        raw_decision = DecisionType.block
        severity = SeverityLevel.critical
    elif intervention_score >= REFLECT_THRESHOLD:
        raw_decision = DecisionType.reflect
        severity = SeverityLevel.high
    elif intervention_score >= WARN_THRESHOLD:
        raw_decision = DecisionType.warn
        severity = SeverityLevel.medium
    else:
        raw_decision = DecisionType.allow
        severity = SeverityLevel.low

    # Override severity from policy matches if higher
    if matches:
        severity_order = ["low", "medium", "high", "critical"]
        highest = max(matches, key=lambda m: severity_order.index(m.severity.value))
        if severity_order.index(highest.severity.value) > severity_order.index(severity.value):
            severity = highest.severity

    # Map to enforcement string based on mode
    if mode == "research":
        enforcement_map = {
            DecisionType.allow: "allowed",
            DecisionType.warn: "would_warn",
            DecisionType.reflect: "would_reflect",
            DecisionType.block: "would_block",
        }
    else:
        enforcement_map = {
            DecisionType.allow: "allowed",
            DecisionType.warn: "warned",
            DecisionType.reflect: "reflection_required",
            DecisionType.block: "blocked",
        }

    enforcement = enforcement_map[raw_decision]

    reflection_question = (
        teacher.reflection_question
        if raw_decision in (DecisionType.reflect, DecisionType.block)
        else None
    )
    safer_alternative = (
        teacher.safer_alternative if raw_decision != DecisionType.allow else None
    )

    return DecisionResponse(
        action_id=action.get("id", ""),
        decision=raw_decision,
        mode=mode,
        enforcement=enforcement,
        action_risk_score=action_risk,
        cognitive_drift_score=drift_score,
        intent_mismatch_score=intent_mismatch,
        intervention_score=intervention_score,
        severity=severity,
        triggered_rules=matches,
        teacher_explanation=teacher,
        reflection_question=reflection_question,
        safer_alternative=safer_alternative,
        timestamp=datetime.now(timezone.utc).isoformat(),
        exports=ExportStatus(),
    )
