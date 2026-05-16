from app.database import save_event, save_reflection


async def log_event(event_dict: dict, decision_dict: dict):
    await save_event(event_dict, decision_dict)


async def log_reflection(answer_dict: dict):
    await save_reflection(answer_dict)
