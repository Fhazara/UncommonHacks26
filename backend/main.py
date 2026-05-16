from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routes import actions, policies, sandbox, reports, reflection, telemetry

app = FastAPI(
    title="Claude Code on a Leash",
    description="AI agent safety, comprehension, and telemetry firewall",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(actions.router, prefix="/api/actions", tags=["actions"])
app.include_router(policies.router, prefix="/api/policies", tags=["policies"])
app.include_router(sandbox.router, prefix="/api/sandbox", tags=["sandbox"])
app.include_router(reports.router, prefix="/api/report", tags=["reports"])
app.include_router(reflection.router, prefix="/api/reflection", tags=["reflection"])
app.include_router(telemetry.router, prefix="/api/telemetry", tags=["telemetry"])


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "mode": settings.firewall_mode,
        "ai_evaluator": settings.allow_ai_evaluator,
        "snowflake": settings.snowflake_enabled,
        "wafer": settings.wafer_enabled,
        "version": "1.0.0",
    }
