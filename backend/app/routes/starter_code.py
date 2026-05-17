import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter(prefix="/api/starter-code", tags=["starter-code"])

UPLOAD_DIR = Path("/tmp/hci-uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_starter_code(file: UploadFile = File(...)):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted")

    token = str(uuid.uuid4())
    dest = UPLOAD_DIR / f"{token}.zip"

    with open(dest, "wb") as f:
        content = await file.read()
        f.write(content)

    return {"upload_token": token, "filename": file.filename}
