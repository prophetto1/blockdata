"""Pipeline Worker — FastAPI app for executing Kestra-compatible plugins."""

import logging
import traceback
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from . import registry
from .shared.base import PluginOutput
from .shared.context import ExecutionContext

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("pipeline-worker")


@asynccontextmanager
async def lifespan(app: FastAPI):
    registry.discover_plugins()
    count = len(registry.PLUGIN_REGISTRY)
    logger.info(f"Discovered {count} task types across plugins")
    yield


app = FastAPI(title="Pipeline Worker", lifespan=lifespan)


class TaskExecuteRequest(BaseModel):
    task_type: str
    params: dict[str, Any] = {}
    execution_id: str = ""
    task_run_id: str = ""
    variables: dict[str, Any] = {}


class TaskExecuteResponse(BaseModel):
    task_type: str
    output: PluginOutput


@app.post("/execute")
async def execute_task(request: TaskExecuteRequest) -> TaskExecuteResponse:
    plugin = registry.resolve(request.task_type)
    if not plugin:
        raise HTTPException(404, f"No handler for task type: {request.task_type}")

    context = ExecutionContext(
        execution_id=request.execution_id,
        task_run_id=request.task_run_id,
        variables=request.variables,
    )

    try:
        result = await plugin.run(request.params, context)
    except Exception as e:
        logger.error(f"Plugin {request.task_type} failed: {e}\n{traceback.format_exc()}")
        result = PluginOutput(state="FAILED", logs=[str(e)])

    return TaskExecuteResponse(task_type=request.task_type, output=result)


@app.get("/health")
async def health():
    return {"status": "ok", "plugins": len(registry.PLUGIN_REGISTRY)}


@app.get("/plugins")
async def list_plugins():
    return registry.list_all()
