"""Optional AI-based secondary evaluator. Stub for future LLM-based policy evaluation."""
from app.models import ActionEvent


async def evaluate_with_ai(event: ActionEvent) -> dict | None:
    """Call an LLM for secondary opinion on edge-case actions (optional, not used in MVP)."""
    return None
