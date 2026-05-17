import json
import os
from app import database as db


def _get_connection():
    import snowflake.connector
    return snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        password=os.environ["SNOWFLAKE_PASSWORD"],
        warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"),
        database=os.environ.get("SNOWFLAKE_DATABASE", "HCI_EXPERIMENTS"),
        schema=os.environ.get("SNOWFLAKE_SCHEMA", "TELEMETRY"),
    )


async def export_experiment_to_snowflake(experiment_id: str) -> None:
    snowflake_enabled = os.environ.get("SNOWFLAKE_ENABLED", "false").lower() == "true"
    if not snowflake_enabled:
        return

    experiment = await db.get_experiment(experiment_id)
    if not experiment:
        return

    events = await db.get_telemetry_events(experiment_id)

    conn = _get_connection()
    try:
        cur = conn.cursor()

        parsed = json.loads(experiment["parsed_config"])
        cur.execute(
            """
            MERGE INTO HCI_EXPERIMENTS.TELEMETRY.EXPERIMENTS AS target
            USING (SELECT %s AS experiment_id) AS source
            ON target.experiment_id = source.experiment_id
            WHEN NOT MATCHED THEN INSERT (
                experiment_id, status, nl_description, task_name, task_description,
                judge_persona, model, starter_code_source, github_url,
                created_at, started_at, ended_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            WHEN MATCHED THEN UPDATE SET
                status = %s, ended_at = %s
            """,
            (
                experiment_id,
                experiment_id,
                experiment["status"],
                experiment["nl_description"],
                parsed.get("task_name", ""),
                parsed.get("task_description", ""),
                parsed.get("judge_persona", ""),
                experiment["model"],
                experiment["starter_code_source"],
                experiment.get("github_url"),
                experiment["created_at"],
                experiment.get("started_at"),
                experiment.get("ended_at"),
                experiment["status"],
                experiment.get("ended_at"),
            ),
        )

        if events:
            rows = [
                (
                    e["id"],
                    e["experiment_id"],
                    e["session_id"],
                    e["event_type"],
                    e["timestamp"],
                    e["data"] if isinstance(e["data"], str) else json.dumps(e["data"]),
                )
                for e in events
            ]
            cur.executemany(
                """
                INSERT INTO HCI_EXPERIMENTS.TELEMETRY.TELEMETRY_EVENTS
                    (event_id, experiment_id, session_id, event_type, occurred_at, raw_data)
                SELECT %s, %s, %s, %s, %s, PARSE_JSON(%s)
                """,
                rows,
            )

        conn.commit()
    finally:
        conn.close()
