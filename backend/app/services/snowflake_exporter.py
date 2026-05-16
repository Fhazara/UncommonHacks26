import json
import uuid
from app.config import settings


def export_to_snowflake(event: dict, decision: dict) -> bool:
    if not settings.snowflake_enabled:
        return False

    if not all([
        settings.snowflake_account,
        settings.snowflake_user,
        settings.snowflake_password,
        settings.snowflake_database,
        settings.snowflake_schema,
    ]):
        print("[Snowflake] Missing credentials — skipping export")
        return False

    try:
        import snowflake.connector  # type: ignore

        conn = snowflake.connector.connect(
            account=settings.snowflake_account,
            user=settings.snowflake_user,
            password=settings.snowflake_password,
            warehouse=settings.snowflake_warehouse,
            database=settings.snowflake_database,
            schema=settings.snowflake_schema,
        )
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO interaction_events (
                event_id, session_id, timestamp, mode,
                user_prompt, latest_user_instruction, agent_stated_plan,
                agent_action_type, command, file_path,
                lines_changed, files_changed_count,
                approval_time_ms, diff_viewed, explanation_viewed,
                keystroke_count, scroll_depth_percent, user_skill_level,
                action_risk_score, cognitive_drift_score,
                intent_mismatch_score, intervention_score,
                triggered_rules, decision, intervention_type,
                reflection_question, safe_alternative, outcome
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                str(uuid.uuid4()),
                event.get("session_id"),
                decision.get("timestamp"),
                event.get("mode"),
                event.get("user_prompt"),
                event.get("latest_user_instruction"),
                event.get("agent_stated_plan"),
                event.get("action_type"),
                event.get("command"),
                event.get("file_path"),
                event.get("lines_changed"),
                event.get("files_changed_count"),
                event.get("approval_time_ms"),
                event.get("diff_viewed"),
                event.get("explanation_viewed"),
                event.get("keystroke_count"),
                event.get("scroll_depth_percent"),
                event.get("user_skill_level"),
                decision.get("action_risk_score"),
                decision.get("cognitive_drift_score"),
                decision.get("intent_mismatch_score"),
                decision.get("intervention_score"),
                json.dumps(decision.get("triggered_rules", [])),
                decision.get("decision"),
                decision.get("enforcement"),
                decision.get("reflection_question"),
                decision.get("safer_alternative"),
                decision.get("enforcement"),
            ),
        )
        conn.commit()
        cursor.close()
        conn.close()
        return True

    except Exception as e:
        print(f"[Snowflake] Export failed (non-critical): {e}")
        return False
