from fastapi import APIRouter
from app.models import ReflectionAnswer
from app.database import save_reflection

router = APIRouter()


@router.post("/answer")
async def submit_answer(payload: ReflectionAnswer):
    await save_reflection(payload.model_dump())
    return {"ok": True, "action_id": payload.action_id}
