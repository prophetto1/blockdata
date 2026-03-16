"""BlockData Connector Runtime — entry point.

Starts the execution runtime with all registered connector plugins.
Connectors are discovered via blockdata/runtime/registry.py.

Run:
  cd E:/writing-system/kt
  pip install fastapi uvicorn pymongo mongomock jinja2 httpx
  python main.py

Or:
  uvicorn main:app --reload --port 8100

Endpoints:
  GET  /health              → runtime status + registered plugin count
  GET  /plugins/            → list all registered plugins and function names
  POST /plugins/{function}  → execute a connector function by name
"""
from __future__ import annotations

import logging

import uvicorn
from fastapi import FastAPI

from blockdata.runtime.registry import register_all, list_all
from blockdata.runtime.routes import router

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("blockdata")

app = FastAPI(title="BlockData Connector Runtime", version="0.1.0")


@app.on_event("startup")
def startup():
    register_all()
    plugins = list_all()
    logger.info("Registered %d plugins:", len(plugins))
    for p in plugins:
        logger.info("  %s → %s (%s)", p["function_name"], p["class"], p["task_types"])


app.include_router(router, prefix="/plugins")


@app.get("/health")
def health():
    return {"status": "ok", "plugins": len(list_all())}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8100, reload=True)
