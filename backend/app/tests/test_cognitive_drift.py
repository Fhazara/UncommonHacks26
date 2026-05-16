import pytest
from app.services.cognitive_drift import compute_drift


def _action(**kwargs):
    defaults = {
        "approval_time_ms": 5000,
        "lines_changed": 0,
        "diff_viewed": True,
        "explanation_viewed": True,
        "fast_approvals_in_row": 0,
        "keystroke_count": 10,
        "scroll_depth_percent": 90.0,
        "user_skill_level": "intermediate",
    }
    defaults.update(kwargs)
    return defaults


def test_engaged_user():
    result = compute_drift(_action())
    assert result.drift_score < 25
    assert result.user_understanding_level == "engaged"


def test_very_fast_approval():
    result = compute_drift(_action(approval_time_ms=1000, keystroke_count=0, scroll_depth_percent=0))
    assert result.approval_speed_flag is True
    assert result.drift_score >= 20


def test_large_diff_fast_approval():
    result = compute_drift(_action(lines_changed=200, approval_time_ms=2000, diff_viewed=False))
    assert result.diff_size_flag is True
    assert result.drift_score >= 25


def test_no_diff_viewed():
    result = compute_drift(_action(diff_viewed=False, lines_changed=50, keystroke_count=0, scroll_depth_percent=0))
    assert result.drift_score >= 30


def test_repeated_approvals():
    result = compute_drift(_action(fast_approvals_in_row=5, keystroke_count=0, scroll_depth_percent=0))
    assert result.repeated_approval_flag is True


def test_beginner_with_drift():
    result = compute_drift(_action(
        user_skill_level="beginner",
        approval_time_ms=1000,
        diff_viewed=False,
        explanation_viewed=False,
        keystroke_count=0,
        scroll_depth_percent=0,
    ))
    assert result.drift_score >= 50
    assert result.user_understanding_level in ("strong_drift", "passive_approval")


def test_passive_approval_classification():
    result = compute_drift(_action(
        approval_time_ms=500,
        lines_changed=300,
        diff_viewed=False,
        explanation_viewed=False,
        fast_approvals_in_row=5,
        keystroke_count=0,
        scroll_depth_percent=0,
        user_skill_level="beginner",
    ))
    assert result.drift_score >= 75
    assert result.user_understanding_level == "passive_approval"
