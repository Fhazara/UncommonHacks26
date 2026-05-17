import aiosqlite
import json
from pathlib import Path
from typing import Optional

DB_PATH = "data/experiments.db"

Path("data").mkdir(exist_ok=True)


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS experiments (
                experiment_id    TEXT PRIMARY KEY,
                status           TEXT NOT NULL DEFAULT 'created',
                nl_description   TEXT NOT NULL,
                parsed_config    TEXT NOT NULL,
                anthropic_api_key TEXT NOT NULL,
                model            TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
                starter_code_source TEXT NOT NULL DEFAULT 'none',
                github_url       TEXT,
                container_id     TEXT,
                vscode_port      INTEGER,
                workspace_path   TEXT,
                created_at       TEXT NOT NULL,
                started_at       TEXT,
                ended_at         TEXT,
                error            TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS telemetry_events (
                id               TEXT PRIMARY KEY,
                experiment_id    TEXT NOT NULL REFERENCES experiments(experiment_id),
                session_id       TEXT NOT NULL,
                event_type       TEXT NOT NULL,
                timestamp        TEXT NOT NULL,
                data             TEXT NOT NULL
            )
        """)
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_telemetry_experiment ON telemetry_events(experiment_id)"
        )
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_telemetry_session ON telemetry_events(session_id)"
        )
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry_events(event_type)"
        )
        await db.commit()


async def save_experiment(experiment: dict) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT OR REPLACE INTO experiments (
                experiment_id, status, nl_description, parsed_config,
                anthropic_api_key, model, starter_code_source, github_url,
                container_id, vscode_port, workspace_path,
                created_at, started_at, ended_at, error
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                experiment["experiment_id"],
                experiment["status"],
                experiment["nl_description"],
                experiment["parsed_config"],
                experiment["anthropic_api_key"],
                experiment["model"],
                experiment["starter_code_source"],
                experiment.get("github_url"),
                experiment.get("container_id"),
                experiment.get("vscode_port"),
                experiment.get("workspace_path"),
                experiment["created_at"],
                experiment.get("started_at"),
                experiment.get("ended_at"),
                experiment.get("error"),
            ),
        )
        await db.commit()


async def update_experiment_status(experiment_id: str, **fields) -> None:
    if not fields:
        return
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [experiment_id]
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            f"UPDATE experiments SET {set_clause} WHERE experiment_id = ?",
            values,
        )
        await db.commit()


async def get_experiment(experiment_id: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM experiments WHERE experiment_id = ?", (experiment_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None


async def list_experiments() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM experiments ORDER BY created_at DESC"
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def save_telemetry_event(experiment_id: str, event: dict) -> None:
    data = event["data"]
    if not isinstance(data, str):
        data = json.dumps(data)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO telemetry_events (id, experiment_id, session_id, event_type, timestamp, data)
               VALUES (?,?,?,?,?,?)""",
            (
                event["id"],
                experiment_id,
                event["session_id"],
                event["event_type"],
                event["timestamp"],
                data,
            ),
        )
        await db.commit()


async def get_telemetry_events(
    experiment_id: str, event_types: list[str] = None
) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        if event_types:
            placeholders = ",".join("?" * len(event_types))
            cursor = await db.execute(
                f"SELECT * FROM telemetry_events WHERE experiment_id = ? AND event_type IN ({placeholders}) ORDER BY timestamp ASC",
                [experiment_id] + list(event_types),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM telemetry_events WHERE experiment_id = ? ORDER BY timestamp ASC",
                (experiment_id,),
            )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
