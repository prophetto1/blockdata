"""Pipeline Worker — FastAPI app for blockdata plugin execution."""

import logging
import traceback
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import registry
from .routes.admin_services import router as admin_services_router
from .shared.base import PluginOutput
from .shared.context import ExecutionContext

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("pipeline-worker")


@asynccontextmanager
async def lifespan(app: FastAPI):
    registry.discover_plugins()
    count = len(registry.FUNCTION_NAME_MAP)
    logger.info(f"Discovered {count} functions ({len(registry.PLUGIN_REGISTRY)} task types)")
    yield


app = FastAPI(title="Pipeline Worker", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_services_router)


class PluginRequest(BaseModel):
    """Request body for all plugin endpoints."""
    params: dict[str, Any] = {}
    execution_id: str = ""
    task_run_id: str = ""
    variables: dict[str, Any] = {}


class PluginResponse(BaseModel):
    """Response envelope for all plugin endpoints."""
    function_name: str
    output: PluginOutput


@app.post("/{function_name}")
async def execute(function_name: str, request: PluginRequest) -> PluginResponse:
    """Execute a plugin by function name.

    URL convention: POST {base_url}/{function_name}
    e.g. POST http://localhost:8000/eyecite_clean

    The function_name matches service_functions.function_name in the database.
    The entrypoint column stores "/{function_name}".
    """
    task_type = registry.resolve_by_function_name(function_name)
    if not task_type:
        raise HTTPException(404, f"No handler for function: {function_name}")

    plugin = registry.resolve(task_type)
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


@app.get("/health")
async def health():
    return {"status": "ok", "functions": len(registry.FUNCTION_NAME_MAP)}


@app.get("/functions")
async def list_functions():
    """List all available functions with their routes and parameter schemas."""
    return [
        {
            "function_name": fn,
            "path": f"/{fn}",
            "method": "POST",
            "task_type": tt,
            "parameter_schema": registry.resolve(tt).parameter_schema() if registry.resolve(tt) else [],
        }
        for fn, tt in sorted(registry.FUNCTION_NAME_MAP.items())
    ]
