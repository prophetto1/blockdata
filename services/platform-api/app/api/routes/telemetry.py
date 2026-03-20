from fastapi import APIRouter, Depends

from app.auth.dependencies import require_superuser
from app.core.config import get_settings
from app.observability import get_telemetry_status

router = APIRouter(prefix="/observability", tags=["observability"])


@router.get("/telemetry-status")
async def telemetry_status(_=Depends(require_superuser)):
    return get_telemetry_status(get_settings())
