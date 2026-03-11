from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/v1", tags=["embeddings"])


@router.get("/embeddings")
async def list_embeddings():
    return JSONResponse(status_code=501, content={"detail": "Not implemented"})
