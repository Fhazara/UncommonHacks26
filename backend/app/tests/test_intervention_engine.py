import pytest
from app.models import PolicyMatch, SeverityLevel, CognitiveDriftResult, TeacherExplanation
from app.services.intervention_engine import make_decision


def _drift(score=10):
    return CognitiveDriftResult(
        drift_score=score,
        approval_speed_flag=False,
        diff_size_flag=False,
        repeated_approval_flag=False,
        low_engagement_flag=False,
        explanation_skipped_flag=False,
        user_understanding_level="engaged",
        reason="test",
        recommended_intervention="none",
    )


def _teacher():
    return TeacherExplanation(
        plain_english_summary="Test",
        why_it_matters="Test",
        what_could_go_wrong="Test",
        risk_level="low",
        reflection_question="Test?",
        safer_alternative="Test alt",
        should_pause_user=False,
    )


def _critical_match():
    return PolicyMatch(
        rule_id="RULE_RM_RF",
        rule_name="Recursive Delete",
        severity=SeverityLevel.critical,
        reason="rm -rf detected",
        evidence="rm -rf",
        safer_alternative="Use named paths",
        risk_points=60,
    )


def _medium_match():
    return PolicyMatch(
        rule_id="RULE_SUDO",
        rule_name="Sudo",
        severity=SeverityLevel.high,
        reason="sudo detected",
        evidence="sudo",
        safer_alternative="Avoid sudo",
        risk_points=35,
    )


def test_allow_decision():
    action = {"mode": "use", "id": "test1", "user_prompt": "", "command": ""}
    decision = make_decision(action, [], _drift(5), _teacher())
    assert decision.decision.value == "allow"
    assert decision.enforcement == "allowed"


def test_warn_decision():
    action = {"mode": "use", "id": "test2", "user_prompt": "", "command": ""}
    decision = make_decision(action, [_medium_match()], _drift(0), _teacher())
    assert decision.enforcement in ("warned", "would_warn", "reflection_required")


def test_block_on_critical():
    action = {"mode": "use", "id": "test3", "user_prompt": "", "command": ""}
    decision = make_decision(action, [_critical_match()], _drift(10), _teacher())
    assert decision.enforcement == "blocked"
    assert decision.decision.value == "block"


def test_research_mode_never_blocks():
    action = {"mode": "research", "id": "test4", "user_prompt": "", "command": ""}
    decision = make_decision(action, [_critical_match()], _drift(80), _teacher())
    assert decision.enforcement == "would_block"
    assert decision.decision.value == "block"


def test_reflect_on_high_drift():
    action = {"mode": "use", "id": "test5", "user_prompt": "", "command": ""}
    drift = _drift(70)
    decision = make_decision(action, [], drift, _teacher())
    assert decision.enforcement in ("reflection_required", "warned")


def test_intervention_score_sum():
    action = {"mode": "use", "id": "test6", "user_prompt": "", "command": ""}
    decision = make_decision(action, [_medium_match()], _drift(30), _teacher())
    assert decision.intervention_score == decision.action_risk_score + decision.cognitive_drift_score + decision.intent_mismatch_score
