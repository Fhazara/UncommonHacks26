from fastapi import APIRouter
from app.database import get_session_logs, get_recent_logs

router = APIRouter()


@router.get("/session/{session_id}")
async def session_telemetry(session_id: str):
    logs = await get_session_logs(session_id)
    return {"session_id": session_id, "events": logs, "count": len(logs)}


@router.post("/export")
async def trigger_export():
    """Manually trigger local→Snowflake/Wafer export for recent events."""
    from app.config import settings
    return {
        "snowflake_enabled": settings.snowflake_enabled,
        "wafer_enabled": settings.wafer_enabled,
        "message": "Use scripts/export_snowflake.py for batch export",
    }
