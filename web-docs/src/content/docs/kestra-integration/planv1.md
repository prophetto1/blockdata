---
title: planv1
---

---
title: "Maps \"io.kestra.plugin.core.log.Log\" → LogPlugin instance"
description: "Plan: Pipeline Worker — Kestra Plugin Runtime in Python"
---Plan: Pipeline Worker — Kestra Plugin Runtime in Python
Context
Kestra has 821 plugin types across 171 groups — the richest workflow plugin ecosystem available. But every plugin runs inside a JVM. The goal: translate Kestra's plugin functionality into a Python FastAPI service that executes the same tasks without Java. Kestra becomes the design spec and plugin catalog source; execution is 100% Python.

The existing repo already has services/conversion-service/ (Python FastAPI + Docker) and services/uppy-companion/ (Node.js). The new pipeline-worker follows the same pattern.

Structure

services/pipeline-worker/
├── Dockerfile
├── pyproject.toml
├── requirements.txt
├── app/
│   ├── main.py                  # FastAPI app, health check, dispatch router
│   ├── registry.py              # Auto-discovers plugins, maps io.kestra.plugin.* → handler
│   │
│   ├── plugins/                 # One module per family (NOT per plugin)
│   │   ├── __init__.py
│   │   ├── core.py              # Log, If, Switch, ForEach, Sleep, WorkingDirectory
│   │   ├── scripts.py           # Python, Shell, Node, R (subprocess execution)
│   │   ├── http.py              # HTTP Request, Download, SSE
│   │   ├── sql.py               # PostgreSQL, MySQL, BigQuery, Snowflake, DuckDB
│   │   ├── cloud_storage.py     # S3, GCS, Azure Blob
│   │   ├── messaging.py         # Slack, Email, Teams, Webhooks
│   │   ├── git.py               # Git clone, push, sync
│   │   └── transform.py         # dbt, dlt, file transforms
│   │
│   └── shared/
│       ├── base.py              # BasePlugin ABC (params in → outputs out)
│       ├── context.py           # ExecutionContext (replaces Kestra's RunContext)
│       ├── auth.py              # Credential resolution (Supabase vault)
│       ├── storage.py           # File I/O via Supabase Storage
│       ├── runner.py            # Subprocess/container isolation for scripts
│       └── output.py            # Standardized output format
│
└── tests/
    ├── test_core.py
    ├── test_scripts.py
    ├── test_http.py
    └── conftest.py
Step 1: Scaffold — Base Framework
Create the service skeleton with FastAPI app, BasePlugin contract, registry, and one working plugin (Log).

app/shared/base.py — Plugin Contract
Mirrors Kestra's RunnableTask<Output> interface:


from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Any

class PluginOutput(BaseModel):
    data: dict[str, Any] = {}
    state: str = "SUCCESS"  # SUCCESS | FAILED | WARNING
    logs: list[str] = []

class BasePlugin(ABC):
    """Every plugin implements this. Maps to Kestra's RunnableTask."""

    # Kestra type(s) this plugin handles
    task_types: list[str] = []

    @abstractmethod
    async def run(self, params: dict[str, Any], context: "ExecutionContext") -> PluginOutput:
        """Execute the plugin. Equivalent to Kestra's RunnableTask.run(RunContext)."""
        ...

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        """Return parameter definitions (matches service_functions.parameter_schema format)."""
        return []
app/shared/context.py — Execution Context
Replaces Kestra's RunContext:


class ExecutionContext:
    execution_id: str
    task_run_id: str
    variables: dict[str, Any]       # Template variables (inputs, upstream outputs)
    logger: logging.Logger
    supabase_url: str
    supabase_key: str               # service_role key for storage/vault access

    def render(self, template: str) -> str:
        """Render Kestra-style {{ expression }} templates."""
        ...

    async def get_secret(self, key: str) -> str:
        """Fetch from Supabase vault."""
        ...

    async def upload_file(self, path: str, content: bytes) -> str:
        """Upload to Supabase Storage, return URL."""
        ...
app/registry.py — Plugin Discovery
Auto-imports all modules in plugins/, collects task_types from each plugin class:


# Maps "io.kestra.plugin.core.log.Log" → LogPlugin instance
PLUGIN_REGISTRY: dict[str, BasePlugin] = {}

def discover_plugins():
    """Scan plugins/ directory, register all BasePlugin subclasses."""
    ...

def resolve(task_type: str) -> BasePlugin | None:
    return PLUGIN_REGISTRY.get(task_type)
app/main.py — FastAPI App

@app.post("/execute")
async def execute_task(request: TaskExecuteRequest) -> TaskExecuteResponse:
    plugin = registry.resolve(request.task_type)
    if not plugin:
        raise HTTPException(404, f"No handler for {request.task_type}")
    context = ExecutionContext(...)
    result = await plugin.run(request.params, context)
    return TaskExecuteResponse(output=result)

@app.get("/health")
async def health():
    return {"status": "ok", "plugins": len(registry.PLUGIN_REGISTRY)}

@app.get("/plugins")
async def list_plugins():
    """Return all registered plugins with their task_types and parameter schemas."""
    ...
app/plugins/core.py — First Plugin Family

class LogPlugin(BasePlugin):
    task_types = [
        "io.kestra.plugin.core.log.Log",
        "io.kestra.core.tasks.log.Log",  # legacy alias
    ]

    async def run(self, params, context):
        message = context.render(params.get("message", ""))
        level = params.get("level", "INFO")
        context.logger.log(getattr(logging, level), message)
        return PluginOutput(logs=[message])
Dockerfile
Follow conversion-service pattern (Python 3.11-slim, pip install, uvicorn).

pyproject.toml

[project]
name = "pipeline-worker"
dependencies = [
    "fastapi>=0.110",
    "uvicorn>=0.27",
    "pydantic>=2.6",
    "httpx>=0.26",
    "supabase>=2.0",
]
Step 2: Core Plugins (core.py)
Translate Kestra's 58 core plugin types. Priority implementations:

Kestra Type	Python Handler	Complexity
core.log.Log	Log message to execution logs	Trivial
core.flow.If	Evaluate condition, return branch decision	Simple
core.flow.Switch	Match value to cases, return branch	Simple
core.flow.ForEach	Return iteration plan (actual fan-out handled by orchestrator)	Medium
core.flow.Parallel	Return parallel plan	Medium
core.flow.Sequential	Return sequential plan	Simple
core.flow.Pause	Return PAUSED state	Trivial
core.flow.Sleep	asyncio.sleep	Trivial
core.http.Request	httpx request with auth support	Medium
core.http.Download	httpx download → Supabase Storage	Medium
core.storage.*	Supabase Storage CRUD	Simple
core.state.*	Supabase KV (key-value)	Simple
core.kv.*	Supabase KV operations	Simple
Note on FlowableTask translation: Kestra's If, Switch, ForEach are orchestration tasks — they don't execute work, they decide what runs next. In our architecture, the Deno edge function orchestrator calls the pipeline-worker to evaluate the condition, then the orchestrator handles branching. The plugin returns {"branch": "then"} or {"items": [...], "concurrency": 3}, not the actual child execution.

Step 3: Script Plugins (scripts.py)
Kestra's script plugins run code in Docker containers. Our equivalent uses subprocess (with optional container isolation via runner.py).

Kestra Type	Python Handler
plugin.scripts.python.Script	subprocess.run with venv
plugin.scripts.python.Commands	subprocess.run with commands list
plugin.scripts.shell.Script	subprocess.run with /bin/bash
plugin.scripts.shell.Commands	subprocess.run with commands list
plugin.scripts.node.Script	subprocess.run with node
plugin.scripts.r.Script	subprocess.run with Rscript
Pattern: all script plugins share the same base — configure interpreter, inject env vars, capture stdout/stderr, parse output files.

Step 4: HTTP Plugins (http.py)
Direct translation using httpx:

Feature	Kestra (Java)	Pipeline Worker (Python)
HTTP methods	OkHttp client	httpx.AsyncClient
Auth	BASIC, DIGEST, BEARER	httpx auth handlers
Templated URI	RunContext.render()	ExecutionContext.render()
Response handling	MaxBodySize, streaming	httpx streaming, size limits
Form data	MultipartBody	httpx multipart
Step 5: SQL Plugins (sql.py)
Database query execution. Each DB is a thin wrapper around the same pattern: connect → execute → return rows.

Kestra Type	Python Driver
JDBC PostgreSQL	asyncpg
JDBC MySQL	aiomysql
BigQuery	google-cloud-bigquery
Snowflake	snowflake-connector-python
DuckDB	duckdb
Pattern: BaseSqlPlugin with connection factory. Subclasses provide driver config. All return {"rows": [...], "row_count": N}.

Step 6: Remaining Families
Build as needed — each follows the same BasePlugin contract:

cloud_storage.py — boto3 (S3), google-cloud-storage (GCS), azure-storage-blob
messaging.py — httpx for webhooks (Slack, Teams), smtplib for email
git.py — subprocess calls to git CLI
transform.py — subprocess calls to dbt-core CLI, dlt CLI
Step 7: Wire to Execution Engine
Connect the pipeline-worker to the Phase 2 execution engine:

Register pipeline-worker in service_registry: base_url = http://pipeline-worker:8000 (or LAN IP for dev)
Bulk-create service_functions rows from the worker's /plugins endpoint — each task_type becomes a function
Phase 2b task dispatcher (Deno edge function) resolves task_type → pipeline-worker endpoint, sends HTTP POST to /execute
Callback: worker POST result back to Supabase transition_task_run_state() via service_role API
Files Created
File	Description
services/pipeline-worker/Dockerfile	Python 3.11 slim + system deps
services/pipeline-worker/pyproject.toml	Project config + dependencies
services/pipeline-worker/requirements.txt	Pinned deps
services/pipeline-worker/app/main.py	FastAPI app with /execute, /health, /plugins
services/pipeline-worker/app/registry.py	Plugin auto-discovery + task_type → handler mapping
services/pipeline-worker/app/plugins/__init__.py	Package init
services/pipeline-worker/app/plugins/core.py	Core plugins (Log, If, Switch, ForEach, Sleep, etc.)
services/pipeline-worker/app/plugins/scripts.py	Script execution (Python, Shell, Node, R)
services/pipeline-worker/app/plugins/http.py	HTTP Request, Download
services/pipeline-worker/app/shared/__init__.py	Package init
services/pipeline-worker/app/shared/base.py	BasePlugin ABC + PluginOutput
services/pipeline-worker/app/shared/context.py	ExecutionContext (RunContext equivalent)
services/pipeline-worker/app/shared/auth.py	Credential resolution
services/pipeline-worker/app/shared/storage.py	Supabase Storage helpers
services/pipeline-worker/app/shared/runner.py	Subprocess/container runner
services/pipeline-worker/app/shared/output.py	Output formatting
services/pipeline-worker/tests/conftest.py	Test fixtures
services/pipeline-worker/tests/test_core.py	Core plugin tests
Implementation Order
Scaffold — base.py, context.py, output.py, registry.py, main.py, Dockerfile (get /health responding)
core.py — Log, Sleep, Pause first (trivial), then If/Switch/ForEach (flow control)
http.py — Request + Download (validates the full plugin lifecycle end-to-end)
scripts.py — Python + Shell script execution
Tests — for each family as it's built
Wire up — register in service_registry, connect to execution engine
Verification
docker build -t pipeline-worker services/pipeline-worker/ succeeds
GET /health returns {"status": "ok", "plugins": N}
GET /plugins returns all registered task_types with parameter schemas
POST /execute with {"task_type": "io.kestra.plugin.core.log.Log", "params": {"message": "hello"}} returns {"state": "SUCCESS", "logs": ["hello"]}
POST /execute with {"task_type": "io.kestra.plugin.core.http.Request", "params": {"uri": "https://httpbin.org/get"}} returns HTTP response data
POST /execute with unknown task_type returns 404
Tests pass: cd services/pipeline-worker && python -m pytest
User approved the plan
