from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/v1", tags=["crews"])


@router.get("/crews")
async def list_crews():
    return JSONResponse(status_code=501, content={"detail": "Not implemented"})
