"""Entry point — starts the server with all MongoDB plugins registered.

Run: cd E:/writing-system && python -m tr.main
Or:  cd E:/writing-system/tr && uvicorn main:app --reload --port 8100

Requires: pip install fastapi uvicorn pymongo jinja2 httpx
"""
from __future__ import annotations

import logging

import uvicorn
from fastapi import FastAPI

from .registry import discover_plugins, list_all
from .routes import router

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("tr")

app = FastAPI(title="BlockData MongoDB Plugin Chain", version="0.1.0")

# --- Startup: discover all plugins (like Kestra's PluginScanner) ---

@app.on_event("startup")
def startup():
    discover_plugins()
    plugins = list_all()
    logger.info("Registered %d plugin classes:", len(plugins))
    for p in plugins:
        logger.info("  %s → %s", p["class"], p["task_types"])


# --- Mount the plugin execution routes ---

app.include_router(router, prefix="/plugins")


# --- Health check ---

@app.get("/health")
def health():
    return {"status": "ok", "plugins": len(list_all())}


if __name__ == "__main__":
    uvicorn.run("tr.main:app", host="0.0.0.0", port=8100, reload=True)
