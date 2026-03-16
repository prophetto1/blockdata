"""Traced from Kestra's execution chain — the path from HTTP request to plugin.run():

  Kestra:
    HTTP POST /api/v1/executions → ExecutionController
      → ExecutorService.process() [JdbcExecutor.java:641]
        → workerJobQueue.emit() [JdbcExecutor.java:670]
          → DefaultWorker.handleTask() [DefaultWorker.java:369]
            → DefaultWorker.run() [DefaultWorker.java:645]
              → runAttempt() [DefaultWorker.java:893]
                → WorkerTaskCallable.doCall() [WorkerTaskCallable.java:57]
                  → task.run(runContext) ← THIS IS WHERE THE PLUGIN RUNS

  BD:
    HTTP POST /{function_name} → execute()
      → resolve_by_function_name() → resolve() → plugin
        → plugin.run(params, context)

Same chain, fewer hops. Kestra needs Executor→Queue→Worker because it
supports distributed workers. BD runs the plugin in the HTTP request handler.

Also traced from BD's existing:
  app/api/routes/plugin_execution.py → execute()
"""
from __future__ import annotations

import logging
import traceback
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .models import ExecutionContext, PluginOutput
from .registry import resolve, resolve_by_function_name

logger = logging.getLogger("tr")

router = APIRouter(tags=["plugins"])


class PluginRequest(BaseModel):
    params: dict[str, Any] = {}
    execution_id: str = ""
    task_run_id: str = ""
    user_id: str = ""
    variables: dict[str, Any] = {}


class PluginResponse(BaseModel):
    function_name: str
    output: PluginOutput


@router.post("/{function_name}")
async def execute(function_name: str, request: PluginRequest) -> PluginResponse:
    """POST /{function_name} → resolve plugin → plugin.run(params, context) → output.

    This is the BD equivalent of Kestra's full chain:
      Executor → Queue → Worker → RunContext → task.run(runContext) → Output
    """
    task_type = resolve_by_function_name(function_name)
    if not task_type:
        raise HTTPException(404, f"No handler for function: {function_name}")

    plugin = resolve(task_type)
    if not plugin:
        raise HTTPException(404, f"No handler for task type: {task_type}")

    context = ExecutionContext(
        execution_id=request.execution_id,
        task_run_id=request.task_run_id,
        user_id=request.user_id,
        variables=request.variables,
    )

    try:
        result = await plugin.run(request.params, context)
    except Exception as e:
        logger.error(f"Plugin {function_name} failed: {e}\n{traceback.format_exc()}")
        result = PluginOutput(state="FAILED", logs=[str(e)])
    finally:
        context.cleanup()

    return PluginResponse(function_name=function_name, output=result)


@router.get("/")
async def list_plugins():
    """List all registered plugins."""
    from .registry import list_all
    return list_all()
