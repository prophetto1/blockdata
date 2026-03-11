from fastapi import APIRouter

from app.domain.plugins.registry import FUNCTION_NAME_MAP
from app.workers.conversion_pool import get_conversion_pool

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok", "functions": len(FUNCTION_NAME_MAP)}


@router.get("/health/live")
async def health_live():
    return {"status": "alive"}


@router.get("/health/ready")
async def health_ready():
    """Readiness probe — reports conversion pool saturation.

    Returns 200 always (Cloud Run uses this for routing, not rejection),
    but includes pool state so load balancers and monitoring can act on it.
    """
    pool = get_conversion_pool()
    pool_status = pool.status()
    return {
        "status": "ready" if not pool_status["saturated"] else "saturated",
        "conversion_pool": pool_status,
    }
