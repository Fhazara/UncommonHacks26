from app.models import PolicyMatch


def calculate_risk_score(matches: list[PolicyMatch]) -> int:
    if not matches:
        return 0
    return min(sum(m.risk_points for m in matches), 100)
