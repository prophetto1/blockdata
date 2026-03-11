from fastapi import APIRouter

from app.domain.plugins.registry import FUNCTION_NAME_MAP, resolve

router = APIRouter(tags=["functions"])


@router.get("/functions")
async def list_functions():
    return [
        {
            "function_name": fn,
            "path": f"/{fn}",
            "method": "POST",
            "task_type": tt,
            "parameter_schema": resolve(tt).parameter_schema() if resolve(tt) else [],
        }
        for fn, tt in sorted(FUNCTION_NAME_MAP.items())
    ]
