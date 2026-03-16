"""FastAPI routes — HTTP layer on top of kt's execution engine.

Bridges:
  POST /{function_name} → execute_function(function_name, request) → ExecutionResult

This is what tr/ had that kt/ was missing.
"""
from __future__ import annotations

import logging
import traceback
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from blockdata.runtime.execution import ExecutionRequest, ExecutionResult, execute_function
from blockdata.runtime.registry import list_all

logger = logging.getLogger("blockdata.runtime")

router = APIRouter(tags=["plugins"])


class PluginRequest(BaseModel):
    params: dict[str, Any] = {}
    execution_id: str = ""
    task_run_id: str = ""
    user_id: str = ""
    variables: dict[str, Any] = {}


class PluginResponse(BaseModel):
    function_name: str
    task_type: str
    output: Any


@router.post("/{function_name}")
async def execute(function_name: str, request: PluginRequest) -> PluginResponse:
    """POST /{function_name} → resolve plugin → build task → run → output."""
    try:
        result: ExecutionResult = execute_function(
            function_name,
            ExecutionRequest(
                params=request.params,
                execution_id=request.execution_id,
                task_run_id=request.task_run_id,
                user_id=request.user_id,
                variables=request.variables,
            ),
        )
    except KeyError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        logger.error("Plugin %s failed: %s\n%s", function_name, e, traceback.format_exc())
        raise HTTPException(500, f"Plugin execution failed: {e}")

    return PluginResponse(
        function_name=result.function_name,
        task_type=result.task_type,
        output=result.output,
    )


@router.get("/")
async def list_plugins():
    """List all registered plugins and their function names."""
    return list_all()
