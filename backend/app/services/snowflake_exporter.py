import json
from app.config import settings


def export_to_snowflake(event: dict, decision: dict) -> bool:
    if not settings.snowflake_enabled:
        return False

    if not all([settings.snowflake_account, settings.snowflake_user, settings.snowflake_password]):
        print("[Snowflake] Missing credentials — skipping export")
        return False

    try:
        import snowflake.connector

        conn = snowflake.connector.connect(
            account=settings.snowflake_account,
            user=settings.snowflake_user,
            password=settings.snowflake_password,
            warehouse=settings.snowflake_warehouse,
            database=settings.snowflake_database,
            schema=settings.snowflake_schema,
        )
        cursor = conn.cursor()

        triggered = decision.get("triggered_rules", [])
        rule_ids = ",".join(
            [r.get("rule_id", "") if isinstance(r, dict) else str(r) for r in triggered]
        )

        teacher = decision.get("teacher_explanation", {})
        if isinstance(teacher, str):
            try:
                teacher = json.loads(teacher)
            except Exception:
                teacher = {}

        def _s(v) -> str:
            return str(v.value) if hasattr(v, "value") else str(v) if v is not None else ""

        def _i(v) -> int:
            try:
                return int(v) if v is not None else 0
            except (TypeError, ValueError):
                return 0

        cursor.execute(
            """
            INSERT INTO INTERACTION_EVENTS (
                event_id, session_id, timestamp, mode, action_type,
                command, file_path, user_skill_level, approval_time_ms,
                diff_viewed, explanation_viewed, fast_approvals_in_row,
                action_risk_score, cognitive_drift_score, intent_mismatch_score,
                intervention_score, decision, enforcement, severity,
                triggered_rule_ids, plain_english_summary, safer_alternative
            ) VALUES (
                %(event_id)s, %(session_id)s, %(timestamp)s, %(mode)s, %(action_type)s,
                %(command)s, %(file_path)s, %(user_skill_level)s, %(approval_time_ms)s,
                %(diff_viewed)s, %(explanation_viewed)s, %(fast_approvals_in_row)s,
                %(action_risk_score)s, %(cognitive_drift_score)s, %(intent_mismatch_score)s,
                %(intervention_score)s, %(decision)s, %(enforcement)s, %(severity)s,
                %(triggered_rule_ids)s, %(plain_english_summary)s, %(safer_alternative)s
            )
            """,
            {
                "event_id": _s(decision.get("action_id") or event.get("action_id", "")),
                "session_id": _s(event.get("session_id", "")),
                "timestamp": _s(decision.get("timestamp", "")),
                "mode": _s(event.get("mode", "")),
                "action_type": _s(event.get("action_type", "")),
                "command": _s(event.get("command", "")),
                "file_path": _s(event.get("file_path", "")),
                "user_skill_level": _s(event.get("user_skill_level", "")),
                "approval_time_ms": _i(event.get("approval_time_ms")),
                "diff_viewed": bool(event.get("diff_viewed", False)),
                "explanation_viewed": bool(event.get("explanation_viewed", False)),
                "fast_approvals_in_row": _i(event.get("fast_approvals_in_row")),
                "action_risk_score": _i(decision.get("action_risk_score")),
                "cognitive_drift_score": _i(decision.get("cognitive_drift_score")),
                "intent_mismatch_score": _i(decision.get("intent_mismatch_score")),
                "intervention_score": _i(decision.get("intervention_score")),
                "decision": _s(decision.get("decision", "")),
                "enforcement": _s(decision.get("enforcement", "")),
                "severity": _s(decision.get("severity", "")),
                "triggered_rule_ids": rule_ids,
                "plain_english_summary": _s(teacher.get("plain_english_summary", "")),
                "safer_alternative": _s(decision.get("safer_alternative") or teacher.get("safer_alternative", "")),
            },
        )
        conn.commit()
        cursor.close()
        conn.close()
        print(f"[Snowflake] exported event {decision.get('action_id', '')[:8]}")
        return True

    except Exception as e:
        print(f"[Snowflake] export error: {e}")
        return False
