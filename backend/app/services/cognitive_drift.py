from app.models import CognitiveDriftResult


def compute_drift(action: dict) -> CognitiveDriftResult:
    score = 0
    flags: dict[str, str] = {}

    approval_ms = action.get("approval_time_ms", 5000)
    lines_changed = action.get("lines_changed", 0)
    diff_viewed = action.get("diff_viewed", False)
    explanation_viewed = action.get("explanation_viewed", False)
    fast_approvals = action.get("fast_approvals_in_row", 0)
    keystroke_count = action.get("keystroke_count", 0)
    scroll_depth = action.get("scroll_depth_percent", 0.0)
    skill_level = action.get("user_skill_level", "intermediate")

    # Very fast approval
    approval_speed_flag = False
    if approval_ms < 2000:
        score += 20
        approval_speed_flag = True
        flags["approval_speed"] = f"Approved in {approval_ms}ms (under 2 seconds)"

    # Large diff approved quickly
    diff_size_flag = False
    if lines_changed >= 100 and approval_ms < 5000:
        score += 25
        diff_size_flag = True
        flags["diff_size"] = f"Approved {lines_changed} changed lines in {approval_ms}ms"

    # Approved without viewing diff
    if not diff_viewed and lines_changed > 5:
        score += 30
        flags["no_diff"] = "Approved without opening the diff"

    # Approved without viewing explanation
    explanation_skipped_flag = False
    if not explanation_viewed:
        score += 15
        explanation_skipped_flag = True
        flags["no_explanation"] = "Skipped the teacher model explanation"

    # Repeated fast approvals
    repeated_approval_flag = False
    if fast_approvals >= 3:
        score += 20
        repeated_approval_flag = True
        flags["repeated_approval"] = f"{fast_approvals} consecutive fast approvals"

    # Minimal interaction
    low_engagement_flag = False
    if keystroke_count < 3 and scroll_depth < 20:
        score += 15
        low_engagement_flag = True
        flags["low_engagement"] = "Minimal keystroke and scroll activity"

    # Beginner with elevated drift
    if skill_level == "beginner" and score > 20:
        score += 15
        flags["skill_risk"] = "Beginner user with multiple drift signals"

    # Positive signals — reduce score
    if keystroke_count > 10:
        score = max(0, score - 15)
    if diff_viewed and scroll_depth > 80:
        score = max(0, score - 15)

    # Classify
    if score < 25:
        level = "engaged"
        intervention = "none"
    elif score < 50:
        level = "mild_drift"
        intervention = "hint"
    elif score < 75:
        level = "strong_drift"
        intervention = "reflect"
    else:
        level = "passive_approval"
        intervention = "reflect"

    reason = "; ".join(flags.values()) if flags else "User appears engaged with this action"

    return CognitiveDriftResult(
        drift_score=score,
        approval_speed_flag=approval_speed_flag,
        diff_size_flag=diff_size_flag,
        repeated_approval_flag=repeated_approval_flag,
        low_engagement_flag=low_engagement_flag,
        explanation_skipped_flag=explanation_skipped_flag,
        user_understanding_level=level,
        reason=reason,
        recommended_intervention=intervention,
    )
