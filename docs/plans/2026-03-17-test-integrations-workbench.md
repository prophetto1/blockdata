# Test-Integrations Workbench

## What This Is

A browser-based workbench for developing, testing, and tracking the status of kt/blockdata connector functions. It connects to the kt FastAPI service, understands the plugin structure through a curated manifest, and lets you run named test cases against configurable backends — seeing immediately what works, what fails, and what needs refactoring.

## Why It Exists

The kt/ directory translates Kestra's Java plugin engine into Python. It has:
- **Core/runtime files** — shared infrastructure every connector uses (RunContext, Task, Storage, FileSerde, etc.)
- **Plugin folders** — one per connector family (mongodb/, and eventually postgresql/, gcs/, aws/, etc.), each containing multiple function files (find.py, aggregate.py, load.py, etc.)

Today, testing these functions requires running pytest from the terminal and reading console output. There's no central view of: which plugins exist, which functions are implemented, which ones pass, which ones need work. This workbench fixes that.

## What It Does

**1. Shows what exists** — Catalog view driven by a server-side manifest that knows which plugins are registered, which functions each plugin exposes, and which source files are relevant (core, runtime, and connector-specific). You can browse the source for any file the manifest includes.

**2. Tests each function** — Each registered function has named test cases (e.g., "find with filter", "find with store=true"). You pick a test case, choose a backend profile (mock, dev-db, real), and run it. The server executes against that profile and returns full execution metadata.

**3. Tracks status** — Dashboard view of all registered functions across all plugins showing the last verified result for each test case. Status comes from explicit verification runs, not from auto-executing on page load.

## Architecture

```
Browser (React)                         Server (FastAPI)
┌─────────────────────┐                ┌─────────────────────┐
│  Test-Integrations   │                │  kt/blockdata       │
│  Workbench           │                │                     │
│                      │   HTTP         │                     │
│  Catalog ────────────┼──────────────► │  GET /manifest      │
│  Code Viewer ────────┼──────────────► │  GET /source/{path} │
│  Test Runner ────────┼──────────────► │  POST /test/{func}  │
│  Status Dashboard ───┼──────────────► │  GET /status        │
│                      │                │                     │
└─────────────────────┘                └─────────────────────┘
```

### Backend Endpoints (kt/ FastAPI — routes.py)

**Already exists:**
- `GET /` — lists all registered plugins and function names
- `POST /{function_name}` — executes a function with params

**New endpoints:**

`GET /manifest` — Returns the curated plugin catalog:
```json
{
  "plugins": [
    {
      "name": "mongodb",
      "path": "connectors/mongodb",
      "functions": [
        {
          "name": "mongodb_find",
          "task_type": "blockdata.mongodb.find",
          "file": "connectors/mongodb/find.py",
          "runnable": true
        },
        {
          "name": "mongodb_trigger",
          "task_type": "blockdata.mongodb.trigger",
          "file": "connectors/mongodb/trigger.py",
          "runnable": false
        }
      ],
      "support_files": [
        "connectors/mongodb/abstract_task.py",
        "connectors/mongodb/mongodb_connection.py",
        "connectors/mongodb/mongodb_service.py",
        "connectors/mongodb/write_models.py"
      ]
    }
  ],
  "core_files": [
    "core/models/flows/state.py",
    "core/models/tasks/task.py",
    "core/models/tasks/output.py",
    "core/runners/run_context.py",
    "core/serializers/file_serde.py",
    "core/storages/storage.py",
    "worker/runner.py",
    "worker/worker_task_callable.py",
    "runtime/execution.py",
    "runtime/registry.py"
  ]
}
```

The manifest is built from the registry — not by scanning the filesystem. It knows which functions are runnable (have a `run()` method) vs. non-runnable (trigger.py uses `evaluate()`). Support files and core files are curated lists, not directory walks.

`GET /source/{path}` — Returns the source content for a file listed in the manifest. Rejects paths not in the manifest (no arbitrary file access).
```json
{
  "path": "connectors/mongodb/find.py",
  "content": "from __future__ import annotations\n...",
  "lines": 63
}
```

`POST /test/{function_name}` — Executes a function with richer response than the current `POST /{function_name}`:
```json
{
  "function_name": "mongodb_find",
  "task_type": "blockdata.mongodb.find",
  "state": "SUCCESS",
  "output": { "rows": [...], "size": 3 },
  "metrics": { "records": 3 },
  "duration_ms": 42,
  "error": null,
  "backend_profile": "mock"
}
```

This wraps the existing execution path but exposes the WorkerTaskResult fields (state, metrics, duration_ms, error) that `execution.py` currently discards.

`GET /status` — Returns the last verified result for each function (persisted in memory or a simple JSON file):
```json
{
  "mongodb_find": { "state": "SUCCESS", "last_run": "2026-03-17T10:30:00Z", "backend": "mock" },
  "mongodb_aggregate": { "state": "WARNING", "last_run": "2026-03-17T10:30:05Z", "note": "maxTimeMs not enforced" },
  "mongodb_trigger": { "state": "SKIPPED", "reason": "not runnable" }
}
```

### Backend Profiles

The browser doesn't run test backends — the server does. The frontend picks a profile, the server executes against it:

| Profile | What it does | When to use |
|---|---|---|
| `mock` | mongomock / sqlite in-memory / fake backends | Default for dev. Fast, no infrastructure. |
| `dev` | Real service at a dev endpoint | Integration testing against actual databases. |
| `real` | Production credentials via connection.py | Final verification only. |

The profile is passed as a query param or request body field. The server resolves credentials and client creation accordingly.

### Test Cases

Functions aren't tested by blindly executing with empty params. Each function has **named test cases** — saved parameter sets with expected outcomes:

```json
{
  "function": "mongodb_find",
  "cases": [
    {
      "name": "find all",
      "params": { "database": "demo", "collection": "books", "filter": {} },
      "expect": { "min_size": 0 }
    },
    {
      "name": "find with store",
      "params": { "database": "demo", "collection": "books", "filter": {}, "store": true },
      "expect": { "has_uri": true }
    }
  ]
}
```

Test cases live on the server (in a JSON file or derived from the existing pytest fixtures). The browser displays them, lets you edit params, and runs them. Results are stored as the "last verified" status.

## Three-Panel Layout

**Left — Plugin Catalog + File Tree**
- Top: plugin selector (MongoDB, PostgreSQL, etc.)
- Below: file tree showing core files + selected plugin's files
- Files from the manifest only — no arbitrary filesystem browsing
- Selecting a file shows its source in the code panel
- Function files are visually distinguished from support files

**Center — Test Runner**
- Shows test cases for the selected function
- Backend profile selector (mock / dev / real)
- Parameter editor (JSON) — pre-filled from test case, editable
- Run button → calls `POST /test/{function_name}`
- Response panel: state badge, output, metrics, duration, error
- Only activates for runnable functions (not helpers like mongodb_service.py)

**Right — Code Viewer**
- Read-only code display (CodeMirror or Monaco) with Python syntax highlighting
- Shows the selected file's source
- Read-only in v1 — editing is a separate capability for later

## Status Dashboard

The dashboard is a top-level view (toggle between dashboard and workbench modes):

```
MongoDB Plugin (8 functions)
  ✓ find          — passing (mock, 42ms, 3/17 10:30)
  ✓ insert_one    — passing (mock, 15ms, 3/17 10:30)
  ✓ delete        — passing (mock, 12ms, 3/17 10:30)
  ✓ update        — passing (mock, 18ms, 3/17 10:30)
  ✓ load          — passing (mock, 85ms, 3/17 10:31)
  ⚠ aggregate     — partial (mock, 38ms, "maxTimeMs not enforced")
  ⚠ bulk          — partial (mock, 65ms, "missing bypassDocumentValidation")
  ○ trigger       — skipped (not runnable)

PostgreSQL Plugin (0 functions)
  — not started
```

Status comes from explicit "Run All" or individual test case runs. Never auto-executes on page load — mutating functions (insert, delete, update) must be explicitly triggered.

## What It Uses

- **FastAPI** — backend communication (already in kt/)
- **React + Workbench component** — frontend layout (already in web/)
- **CodeMirror or Monaco** — code viewing (pick whichever is already in the project)
- **mongomock** — mock backend for MongoDB (already a dependency in kt/)
- **JSON editor component** — parameter input for function calls

## Build Order

1. **Manifest endpoint** — `GET /manifest` built from registry + curated file lists
2. **Source endpoint** — `GET /source/{path}` with manifest-gated access
3. **Test endpoint** — `POST /test/{function_name}` wrapping execution with full WorkerTaskResult metadata
4. **Status endpoint** — `GET /status` with in-memory result storage
5. **Frontend: file tree** — fetches manifest, renders tree, selects files
6. **Frontend: code viewer** — fetches source, renders with syntax highlighting
7. **Frontend: test runner** — test case selector, param editor, run button, result display
8. **Frontend: status dashboard** — aggregated pass/fail view
9. **Wire into Test-Integrations nav item** (already created at `/app/test-integrations`)