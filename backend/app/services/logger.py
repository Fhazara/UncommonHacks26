from app import database as db


async def log_telemetry_event(experiment_id: str, event: dict) -> None:
    await db.save_telemetry_event(experiment_id, event)
