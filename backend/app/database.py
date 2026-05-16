import aiosqlite
import json
from datetime import datetime
from pathlib import Path

DB_PATH = "data/firewall.db"
JSONL_PATH = "data/action_logs.jsonl"

Path("data").mkdir(exist_ok=True)


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS action_events (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                timestamp TEXT,
                mode TEXT,
                action_type TEXT,
                command TEXT,
                file_path TEXT,
                action_risk_score INTEGER,
                cognitive_drift_score INTEGER,
                intervention_score INTEGER,
                decision TEXT,
                enforcement TEXT,
                severity TEXT,
                triggered_rules TEXT,
                teacher_explanation TEXT,
                full_payload TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS reflection_answers (
                id TEXT PRIMARY KEY,
                action_id TEXT,
                session_id TEXT,
                answer TEXT,
                user_confidence INTEGER,
                timestamp TEXT
            )
        """)
        await db.commit()


async def save_event(event_dict: dict, decision_dict: dict):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT OR REPLACE INTO action_events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                decision_dict.get("action_id", ""),
                event_dict.get("session_id"),
                decision_dict.get("timestamp"),
                event_dict.get("mode"),
                event_dict.get("action_type"),
                event_dict.get("command"),
                event_dict.get("file_path"),
                decision_dict.get("action_risk_score"),
                decision_dict.get("cognitive_drift_score"),
                decision_dict.get("intervention_score"),
                decision_dict.get("decision"),
                decision_dict.get("enforcement"),
                decision_dict.get("severity"),
                json.dumps(decision_dict.get("triggered_rules", [])),
                json.dumps(decision_dict.get("teacher_explanation", {})),
                json.dumps({"event": event_dict, "decision": decision_dict}),
            ),
        )
        await db.commit()

    with open(JSONL_PATH, "a") as f:
        f.write(
            json.dumps(
                {
                    "event": event_dict,
                    "decision": decision_dict,
                    "logged_at": datetime.utcnow().isoformat(),
                }
            )
            + "\n"
        )


async def save_reflection(answer_dict: dict):
    import uuid as _uuid
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO reflection_answers VALUES (?,?,?,?,?,?)",
            (
                str(_uuid.uuid4()),
                answer_dict.get("action_id"),
                answer_dict.get("session_id"),
                answer_dict.get("answer"),
                answer_dict.get("user_confidence"),
                datetime.utcnow().isoformat(),
            ),
        )
        await db.commit()


async def get_recent_logs(limit: int = 50):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM action_events ORDER BY timestamp DESC LIMIT ?", (limit,)
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def get_log_by_id(action_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT full_payload FROM action_events WHERE id=?", (action_id,)
        )
        row = await cursor.fetchone()
        if row:
            return json.loads(row["full_payload"])
        return None


async def get_session_logs(session_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT full_payload FROM action_events WHERE session_id=? ORDER BY timestamp ASC",
            (session_id,),
        )
        rows = await cursor.fetchall()
        return [json.loads(r["full_payload"]) for r in rows]
