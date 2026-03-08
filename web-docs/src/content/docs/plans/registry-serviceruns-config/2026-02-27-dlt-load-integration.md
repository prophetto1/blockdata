---
title: "dlt Load Integration: ELT Load Tab + Advanced Config"
description: "Add a **Load** tab to the ELT page powered by dlt (data load tool). Users pick a source, configure it, and load data into a destination — no code required. An **Advanced Config** page exposes every dlt Python script as a callable function button with full parameter control."
---# dlt Load Integration: ELT Load Tab + Advanced Config

## Goal

Add a **Load** tab to the ELT page powered by dlt (data load tool). Users pick a source, configure it, and load data into a destination — no code required. An **Advanced Config** page exposes every dlt Python script as a callable function button with full parameter control.

dbt (Transform) is a separate page/concern. This doc covers **Load only**.

---

## Two Surfaces

### 1. Load Tab (ELT page)

Lives alongside existing tabs: **Files | Load | Preview | Canvas**

Guided, simple experience:
1. Pick a source type (card grid)
2. Configure it (auto-generated form)
3. Pick destination
4. Run
5. See results

### 2. Advanced Config Page

Separate page (e.g., `/app/elt/pipelines` or `/app/settings/pipelines`).

Shows ALL available dlt Python functions as a catalog:
- Built-in sources (filesystem, rest_api, sql_database)
- Installed verified sources (GitHub, Slack, Stripe, etc.)
- Custom user scripts (@dlt.source decorated)
- Each function = a card/button with parameter form
- Full control: write disposition, incremental config, schema hints, etc.
- Pipeline history and management

---

## Load Tab UX

```
┌─────────────────────────────────────────────────────┐
│ Files | [Load] | Preview | Canvas                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Source Type                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ 📁 Files │ │ 🌐 API  │ │ 🗄 DB   │            │
│  │          │ │          │ │          │            │
│  │ CSV/JSON │ │ REST API │ │ Postgres │            │
│  │ Parquet  │ │ GraphQL  │ │ MySQL    │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                      │
│  ─── Configure Source ────────────────────           │
│  Path: [/data/courtlistener/         ]               │
│  File pattern: [*.csv.bz2            ]               │
│  Format: [CSV ▾]                                     │
│                                                      │
│  ─── Destination ─────────────────────               │
│  [Supabase (default) ▾]                              │
│  Table name: [opinion_clusters       ]               │
│                                                      │
│  ─── Options ─────────────────────────               │
│  Write mode: [● Replace ○ Append ○ Merge]            │
│  Primary key: [id                    ]               │
│                                                      │
│  [Run Load]                         [Advanced →]     │
│                                                      │
│  ─── Recent Loads ────────────────────               │
│  ✓ opinion_clusters  2.1M rows  3m ago               │
│  ✓ citations         5.7M rows  8m ago               │
│  ✗ opinions          timeout    1h ago               │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Source Cards

| Card | dlt Source | Config Fields |
|------|-----------|---------------|
| Files | `filesystem` | path/bucket_url, file_glob, format (csv/json/parquet) |
| REST API | `rest_api` | base_url, auth type + credentials, paginator, endpoints[] |
| Database | `sql_database` | connection_string, schema, tables[] |
| GitHub | `github` (verified) | repo, token, resources (issues/PRs/commits) |
| Slack | `slack` (verified) | token, channels |
| Google Sheets | `google_sheets` (verified) | spreadsheet_id, credentials |
| Custom | user script | auto-detected from function signature |

Clicking "Advanced →" navigates to the full pipeline config page.

---

## Advanced Config Page

Route: `/app/elt/pipelines`

```
┌─────────────────────────────────────────────────────┐
│ Pipeline Functions                                    │
├──────────────┬──────────────────────────────────────┤
│              │                                       │
│ BUILT-IN     │  rest_api                             │
│ ┌──────────┐ │  ─────────────────────────────────    │
│ │filesystem│ │  Base URL: [https://api.example.com]  │
│ │ rest_api │ │  Auth: [Bearer Token ▾]               │
│ │ sql_db   │ │  Token: [••••••••••]                  │
│ └──────────┘ │                                       │
│              │  Endpoints:                            │
│ VERIFIED     │  ┌─────────────────────────────────┐  │
│ ┌──────────┐ │  │ /users  primary_key=id          │  │
│ │ github   │ │  │ /posts  primary_key=id  incr    │  │
│ │ slack    │ │  │ [+ Add endpoint]                │  │
│ │ stripe   │ │  └─────────────────────────────────┘  │
│ │ notion   │ │                                       │
│ │ hubspot  │ │  Destination: [Supabase ▾]            │
│ └──────────┘ │  Dataset: [raw_api_data]              │
│              │  Write: [Merge ▾]  PK: [id]           │
│ CUSTOM       │                                       │
│ ┌──────────┐ │  Incremental:                         │
│ │ my_scrip │ │  ☑ Enabled  Field: [updated_at]      │
│ │ legal_lo │ │  Last value: 2026-02-26T00:00:00     │
│ └──────────┘ │                                       │
│              │  [View Python Code]  [Run Pipeline]   │
│ [+ Upload]   │                                       │
├──────────────┴──────────────────────────────────────┤
│ Pipeline History                                      │
│ ┌───────────────────────────────────────────────────┐│
│ │ #12  rest_api → supabase  ✓ 1,204 rows  2m 14s  ││
│ │ #11  rest_api → supabase  ✓ 89 rows     0m 3s   ││
│ │ #10  filesystem → supabase ✗ Error: timeout      ││
│ └───────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### Function Button Behavior

Each source in the left sidebar is a **function button**:
- Click → loads its parameter form on the right
- Parameters auto-generated from the dlt source's function signature
- "View Python Code" shows the actual `@dlt.source` decorated script
- "Run Pipeline" executes it via the backend service
- Custom scripts can be uploaded or pasted

### Parameter Schema Discovery

The backend introspects each dlt source to extract its config:

```python
import inspect

def get_source_schema(source_func):
    sig = inspect.signature(source_func)
    params = []
    for name, param in sig.parameters.items():
        annotation = param.annotation
        default = param.default if param.default != inspect.Parameter.empty else None
        required = param.default == inspect.Parameter.empty

        # Map dlt types to form field types
        field_type = "string"
        if annotation == dlt.TSecretStrValue:
            field_type = "secret"
        elif annotation == int:
            field_type = "number"
        elif annotation == bool:
            field_type = "boolean"
        elif annotation == dict or annotation == list:
            field_type = "json"

        params.append({
            "name": name,
            "type": field_type,
            "required": required,
            "default": default,
        })
    return params
```

This drives the auto-generated forms — no manual form definitions needed per source.

---

## Backend Service (Python, Ubuntu box)

Same FastAPI service as dbt. Shared process, separate route groups.

```
blockdata-pipeline-service/
├── app.py                          # FastAPI entry
├── routes/
│   ├── dlt_routes.py               # dlt endpoints
│   └── dbt_routes.py               # dbt endpoints (from dbt design doc)
├── dlt/
│   ├── executor.py                 # wraps dlt.pipeline()
│   ├── source_registry.py          # discovers + introspects available sources
│   ├── pipeline_store.py           # persists pipeline configs (SQLite)
│   └── custom_sources/             # user-uploaded @dlt.source scripts
│       └── *.py
├── dbt/
│   ├── dbt_executor.py
│   └── ...
├── shared/
│   ├── credentials.py              # credential storage (encrypted)
│   └── run_tracker.py              # run history for both dlt and dbt
└── requirements.txt
```

### API Endpoints

#### Source Registry

```
GET  /dlt/sources
  → [{ type, label, description, parameters[], installed }]

GET  /dlt/sources/:type
  → { type, label, parameters[], code }

GET  /dlt/sources/:type/code
  → raw Python source text

POST /dlt/sources/custom
  → upload a custom @dlt.source Python script
  Body: { name, code }
```

#### Pipelines

```
POST /dlt/pipelines
  → create pipeline config
  Body: {
    name: string,
    source_type: string,
    source_config: { ...params },
    destination_type: string,        # "postgres", "bigquery", "duckdb"
    destination_config: { ...conn },
    dataset_name: string,
    table_name?: string,
    write_disposition: "replace" | "append" | "merge",
    primary_key?: string | string[],
    incremental?: { cursor_field: string },
  }

GET  /dlt/pipelines
  → list all saved pipelines

GET  /dlt/pipelines/:id
  → pipeline config + last run status + schema

POST /dlt/pipelines/:id/run
  → execute pipeline, returns run_id
  Response: { run_id, status: "started" }

GET  /dlt/pipelines/:id/runs
  → run history for this pipeline

DELETE /dlt/pipelines/:id
  → remove pipeline config
```

#### Runs

```
GET  /dlt/runs/:id
  → { status, started_at, completed_at, rows_loaded, duration_ms,
      schema_changes, errors[], logs[] }

GET  /dlt/runs/:id/logs
  → SSE stream of log lines during execution

GET  /dlt/runs/:id/schema
  → inferred schema (table names, column types, relationships)
```

#### Destinations

```
GET  /dlt/destinations
  → list configured destinations

POST /dlt/destinations
  → register { type, name, connection_config }

POST /dlt/destinations/:id/test
  → test connection, returns { ok, error? }
```

### Core Executor

```python
import dlt
from dlt.sources.filesystem import filesystem, read_csv, read_jsonl, read_parquet
from dlt.sources.rest_api import rest_api
from dlt.sources.sql_database import sql_database

class DltExecutor:
    def run_pipeline(self, config: PipelineConfig) -> RunResult:
        pipeline = dlt.pipeline(
            pipeline_name=config.name,
            destination=config.destination_type,
            dataset_name=config.dataset_name,
            credentials=config.destination_config,
        )

        source = self._build_source(config)

        if config.primary_key:
            source.apply_hints(primary_key=config.primary_key)
        if config.write_disposition:
            source.apply_hints(write_disposition=config.write_disposition)

        load_info = pipeline.run(
            source,
            table_name=config.table_name,
        )

        return RunResult(
            success=load_info.has_failed_jobs == False,
            rows_loaded=sum(p.jobs_count for p in load_info.load_packages),
            duration_ms=...,
            schema=pipeline.default_schema.to_dict(),
            errors=[str(j) for j in load_info.get_failed_jobs()],
        )

    def _build_source(self, config: PipelineConfig):
        if config.source_type == "filesystem":
            reader = {
                "csv": read_csv,
                "jsonl": read_jsonl,
                "parquet": read_parquet,
            }[config.source_config.get("format", "csv")]
            return filesystem(
                bucket_url=config.source_config["path"],
                file_glob=config.source_config.get("file_glob", "*"),
            ) | reader()

        elif config.source_type == "rest_api":
            return rest_api(
                client=config.source_config.get("client", {}),
                resources=config.source_config.get("resources", []),
            )

        elif config.source_type == "sql_database":
            return sql_database(
                credentials=config.source_config["connection_string"],
                schema=config.source_config.get("schema"),
                table_names=config.source_config.get("tables"),
            )

        elif config.source_type == "custom":
            # Load user's custom @dlt.source script
            return self._load_custom_source(config)
```

---

## What dlt Gives You For Free

Things you do NOT need to build:

| Feature | dlt handles it |
|---------|----------------|
| Schema inference | Auto-detects types from data |
| Nested JSON flattening | Creates child tables with foreign keys |
| Incremental loading | Cursor-based state tracking per resource |
| Deduplication | Merge write disposition with primary key |
| Compressed files | Reads .csv.bz2, .gz, .parquet natively |
| Pagination | Built-in paginators for REST APIs |
| Retry/backoff | Configurable retry on transient errors |
| Schema evolution | Handles new columns, type changes |
| State management | Persists pipeline state to destination |

---

## CourtListener Example (Practical)

Using the Load tab to ingest CourtListener bulk data:

1. Click **Files** source card
2. Path: `/data/courtlistener/`
3. Pattern: `opinion-clusters*.csv.bz2`
4. Format: CSV
5. Destination: Supabase (default)
6. Table: `opinion_clusters`
7. Write mode: Replace
8. Primary key: `id`
9. Click **Run Load**

Behind the scenes:
```python
source = filesystem(
    bucket_url="/data/courtlistener/",
    file_glob="opinion-clusters*.csv.bz2"
) | read_csv()
source.apply_hints(primary_key="id", write_disposition="replace")

pipeline = dlt.pipeline("courtlistener", destination="postgres")
pipeline.run(source, table_name="opinion_clusters")
```

Repeat for `citation-map*.csv.bz2` → `citations` table.

---

## Implementation Phases

### Phase 1: Backend Service + Filesystem Source
- FastAPI service on Ubuntu with dlt installed
- Source registry (filesystem, rest_api, sql_database)
- Pipeline CRUD endpoints
- Run execution + status tracking
- Filesystem source working end-to-end (CSV, JSON, Parquet, compressed)

### Phase 2: Load Tab in ELT Page
- Add "Load" tab to DocumentTest.tsx (ELT page)
- Source card grid (3 built-in)
- Config form (hardcoded per source type initially)
- Destination picker (Supabase default)
- Run button → calls backend
- Run status + history display

### Phase 3: Advanced Config Page
- New route `/app/elt/pipelines`
- Left sidebar: source catalog (function buttons)
- Right panel: auto-generated parameter form from source schema
- "View Python Code" button
- Pipeline save/edit/delete
- Full run history with logs

### Phase 4: Verified Sources
- Install popular dlt verified sources (GitHub, Slack, Stripe, etc.)
- Auto-discover and register in source catalog
- Each appears as a function button

### Phase 5: Custom Sources
- Upload custom @dlt.source Python scripts
- Service validates, introspects parameters, registers
- Appears in "Custom" section of source catalog

### Phase 6: Incremental + Scheduling
- Incremental config UI (cursor field, initial value)
- Scheduled runs (cron-like, via backend scheduler)
- Run diff view (what changed since last load)
