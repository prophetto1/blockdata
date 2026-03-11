import logging
import traceback
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import require_auth
from app.auth.principals import AuthPrincipal
from app.domain.plugins.models import PluginOutput, ExecutionContext
from app.domain.plugins.registry import resolve, resolve_by_function_name

logger = logging.getLogger("platform-api")

router = APIRouter(tags=["plugins"])


class PluginRequest(BaseModel):
    params: dict[str, Any] = {}
    execution_id: str = ""
    task_run_id: str = ""
    variables: dict[str, Any] = {}


class PluginResponse(BaseModel):
    function_name: str
    output: PluginOutput


@router.post("/{function_name}")
async def execute(
    function_name: str,
    request: PluginRequest,
    auth: AuthPrincipal = Depends(require_auth),
) -> PluginResponse:
    task_type = resolve_by_function_name(function_name)
    if not task_type:
        raise HTTPException(404, f"No handler for function: {function_name}")

    plugin = resolve(task_type)
    if not plugin:
        raise HTTPException(404, f"No handler for task type: {task_type}")

    context = ExecutionContext(
        execution_id=request.execution_id,
        task_run_id=request.task_run_id,
        variables=request.variables,
    )

    try:
        result = await plugin.run(request.params, context)
    except Exception as e:
        logger.error(f"Plugin {function_name} failed: {e}\n{traceback.format_exc()}")
        result = PluginOutput(state="FAILED", logs=[str(e)])

    return PluginResponse(function_name=function_name, output=result)
