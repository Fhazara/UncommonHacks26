#!/usr/bin/env python3
"""
Batch export local JSONL action logs to Snowflake.
Run this after collecting research session data.

Usage:
  python3 export_snowflake.py --logs ../backend/data/action_logs.jsonl
"""
import argparse
import json
import os
import sys

try:
    from dotenv import load_dotenv
    load_dotenv("../backend/.env")
except ImportError:
    pass


def export(log_path: str):
    if not os.path.exists(log_path):
        print(f"Log file not found: {log_path}")
        sys.exit(1)

    if not os.getenv("SNOWFLAKE_ENABLED", "false").lower() == "true":
        print("Snowflake not enabled. Set SNOWFLAKE_ENABLED=true in backend/.env")
        sys.exit(0)

    try:
        import snowflake.connector  # type: ignore
    except ImportError:
        print("pip install snowflake-connector-python")
        sys.exit(1)

    conn = snowflake.connector.connect(
        account=os.getenv("SNOWFLAKE_ACCOUNT"),
        user=os.getenv("SNOWFLAKE_USER"),
        password=os.getenv("SNOWFLAKE_PASSWORD"),
        warehouse=os.getenv("SNOWFLAKE_WAREHOUSE"),
        database=os.getenv("SNOWFLAKE_DATABASE"),
        schema=os.getenv("SNOWFLAKE_SCHEMA"),
    )
    cursor = conn.cursor()

    with open(log_path) as f:
        lines = [l.strip() for l in f if l.strip()]

    print(f"Exporting {len(lines)} events to Snowflake...")
    exported = 0

    for line in lines:
        try:
            record = json.loads(line)
            event = record.get("event", {})
            decision = record.get("decision", {})

            import uuid as _uuid
            cursor.execute(
                """
                INSERT INTO interaction_events (
                    event_id, session_id, timestamp, mode,
                    user_prompt, agent_stated_plan, agent_action_type,
                    command, file_path, lines_changed,
                    approval_time_ms, diff_viewed, explanation_viewed,
                    action_risk_score, cognitive_drift_score,
                    intervention_score, decision, outcome
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    str(_uuid.uuid4()),
                    event.get("session_id"),
                    decision.get("timestamp"),
                    event.get("mode"),
                    event.get("user_prompt"),
                    event.get("agent_stated_plan"),
                    event.get("action_type"),
                    event.get("command"),
                    event.get("file_path"),
                    event.get("lines_changed"),
                    event.get("approval_time_ms"),
                    event.get("diff_viewed"),
                    event.get("explanation_viewed"),
                    decision.get("action_risk_score"),
                    decision.get("cognitive_drift_score"),
                    decision.get("intervention_score"),
                    decision.get("decision"),
                    decision.get("enforcement"),
                ),
            )
            exported += 1
        except Exception as e:
            print(f"  Skipped record: {e}")

    conn.commit()
    cursor.close()
    conn.close()
    print(f"Exported {exported}/{len(lines)} records to Snowflake.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--logs", default="../backend/data/action_logs.jsonl")
    args = parser.parse_args()
    export(args.logs)
