from fastapi import APIRouter
from app.services.policy_engine import get_all_policies, reload_policies

router = APIRouter()


@router.get("")
def list_policies():
    return {"policies": get_all_policies()}


@router.post("/reload")
def reload():
    count = reload_policies()
    return {"status": "reloaded", "policy_count": count}
