from app.services.snowflake_exporter import export_to_snowflake
from app.services.wafer_exporter import export_to_wafer
from app.config import settings


async def route_telemetry(event: dict, decision: dict) -> dict:
    results = {"local": True, "snowflake": False, "wafer": False}

    if settings.snowflake_enabled:
        try:
            results["snowflake"] = export_to_snowflake(event, decision)
        except Exception:
            results["snowflake"] = False

    if settings.wafer_enabled:
        try:
            results["wafer"] = await export_to_wafer(event, decision)
        except Exception:
            results["wafer"] = False

    return results
