# DLT Pipeline Assessment

**Date:** 2026-03-04
**Scope:** Evaluate DLT (data load tool) at `F:/dlt/` for extraction/loading patterns, Singer compatibility, and best approach for building our data pipeline layer.

---

## 1. What DLT Is

DLT is a Python-first data loading library (v1.22.2). No backend server required. It extracts, normalizes, and loads data into 22+ destinations using a decorator-based API.

**Core pipeline flow:**
```
Source (REST API, DB, Files)
  -> extract() -> temporary files
  -> normalize() -> validate schema, coerce types
  -> load() -> destination tables
```

Everything runs in-process. State persists to `.dlt/` on the filesystem.

---

## 2. Extraction Patterns

DLT uses two decorators to define data sources:

### @dlt.source
Groups multiple resources under one schema. Takes a function that returns `DltResource` objects.

### @dlt.resource
Wraps a Python generator into a data extraction unit. Supports:
- `write_disposition`: append / replace / merge
- `primary_key`, `merge_key`: dedup and merge control
- `incremental`: cursor-based incremental loading
- `columns`: explicit schema hints
- `table_name`: routing items to specific tables

### @dlt.transformer
Chains resources together with a pipe operator:
```python
source_data() | transform_data()
```

### Data yielding
Resources yield dicts, lists, DataFrames, or Arrow tables. DLT auto-detects the format.

### Incremental loading
Built-in `dlt.sources.incremental` tracks cursor values across runs. Persists state automatically.

---

## 3. Pre-built Sources

Three generic connectors ship with DLT:

| Source | Location | Purpose |
|--------|----------|---------|
| `rest_api` | `dlt/sources/rest_api/` | Any REST API with pagination, auth, incremental |
| `sql_database` | `dlt/sources/sql_database/` | Any SQL database via SQLAlchemy |
| `filesystem` | `dlt/sources/filesystem/` | S3, GCS, Azure Blob, local files |

The REST API source is the most relevant to us. It handles:
- Automatic pagination (cursor, offset, link headers)
- Auth (Bearer, OAuth2, API Key, HTTP Basic)
- Parent-child resource relationships
- Response extraction via JSONPath

5000+ additional sources available via DLTHub.

---

## 4. Loading Procedures

### Destinations (22 total)

**SQL:** Postgres, DuckDB, ClickHouse, MSSQL, Redshift, Athena, Synapse, Fabric, Dremio, SQLAlchemy (generic)
**Warehouses:** Snowflake, BigQuery, Databricks
**Vector DBs:** LanceDB, Qdrant, Weaviate
**Storage:** Filesystem (S3/GCS/Azure/local), MotherDuck, DuckLake
**Custom:** `@dlt.destination` decorator for DIY

### Loading methods
- **Direct:** INSERT/COPY into tables
- **Staging:** Load to staging area, then merge into final tables
- **File-based:** Write to cloud storage, destination reads from there

### Write dispositions
- `append` — add new rows
- `replace` — drop and recreate table
- `merge` — upsert based on primary/merge keys

---

## 5. Singer Protocol Support

**Status: Archived but functional.**

Located at `F:/dlt/docs/examples/archive/sources/singer_tap.py`.

### How it works
1. DLT creates a Python venv for the Singer tap
2. Runs the tap as a subprocess
3. Parses JSONL output (RECORD, STATE, SCHEMA messages)
4. Routes records to DLT resources by stream name
5. Persists Singer state for incremental runs

### Example
```python
from dlt.common.runners import Venv
from sources.singer_tap import tap

with Venv.create(tmpdir, ["git+https://github.com/MeltanoLabs/tap-csv.git"]) as venv:
    source = tap(venv, "tap-csv", config, catalog)
    pipeline = dlt.pipeline("csv_load", destination="postgres")
    pipeline.run(source)
```

### Assessment
- Works with any MeltanoLabs tap
- Archived, not actively maintained in DLT core
- Good proof-of-concept but not production-grade for us
- Better approach: use DLT's native `rest_api` source or write custom `@dlt.resource` wrappers that speak to Singer taps directly

---

## 6. Architecture Strengths

1. **No infrastructure.** Pure Python, no server, no scheduler. Runs anywhere Python runs.
2. **Schema inference.** Auto-discovers column types from data. Schema evolution handled automatically.
3. **Incremental by default.** Cursor tracking, state persistence, dedup built in.
4. **Composable.** Resources pipe into transformers. Sources compose into pipelines.
5. **Destination-agnostic.** Same source code loads to any of 22 destinations.
6. **Observable.** Execution traces, progress tracking, error reporting.

---

## 7. Architecture Gaps (For Our Use Case)

1. **No native ArangoDB destination.** We'd need a custom `@dlt.destination` implementation or use the SQLAlchemy generic + ArangoDB's SQL compatibility layer (limited).
2. **No real-time/streaming.** DLT is batch-oriented. For real-time mutations we need a separate strategy.
3. **No built-in scheduler.** DLT doesn't schedule itself. Needs Kestra, Airflow, cron, or similar.
4. **Singer support is archived.** If we want Singer taps, we're better off wrapping them ourselves or using Meltano as the orchestrator layer.
5. **No document-level block model.** DLT thinks in tables and rows, not documents and blocks. Our document->block->mutation model needs a translation layer.

---

## 8. Recommended Approach

### Option A: DLT as extraction + normalization layer (Recommended)

Use DLT for what it's good at:
- Extract data from external APIs via `rest_api` source
- Extract data from SQL databases via `sql_database` source
- Extract files from cloud storage via `filesystem` source
- Normalize and validate schemas automatically
- Load into a staging area (DuckDB or filesystem)

Then write a thin adapter layer that:
- Reads from DLT's staging output
- Transforms rows into our document/block model
- Writes to ArangoDB via python-arango

**Why:** DLT handles the hard parts (pagination, auth, incremental, schema inference). We handle the domain-specific part (document model).

### Option B: DLT with custom ArangoDB destination

Implement `@dlt.destination` for ArangoDB. DLT sends normalized data directly to Arango.

**Why not (yet):** More upfront work. The custom destination API is simple but we need to map DLT's relational schema model to Arango's document/graph model. Better to validate the pipeline end-to-end with Option A first.

### Option C: Skip DLT, use Singer/Meltano directly

Run Meltano with Singer taps, write custom targets for ArangoDB.

**Why not:** More moving parts. Meltano requires its own project structure, config, and scheduler. DLT is lighter and more Pythonic.

### Singer integration path

If specific Singer taps are needed that DLT doesn't cover natively:
1. Use DLT's archived `singer_tap.py` as a starting point
2. Wrap the tap in a `@dlt.resource` that runs it in a subprocess
3. Parse Singer protocol messages into DLT items
4. Let DLT handle normalization and loading from there

This gives us Singer compatibility without taking on Meltano as a dependency.

---

## 9. Key Files Reference

| File | Purpose |
|------|---------|
| `F:/dlt/dlt/extract/decorators.py` | `@dlt.source`, `@dlt.resource`, `@dlt.transformer` |
| `F:/dlt/dlt/extract/source.py` | DltSource class |
| `F:/dlt/dlt/extract/resource.py` | DltResource class |
| `F:/dlt/dlt/extract/incremental/` | Cursor-based incremental extraction |
| `F:/dlt/dlt/sources/rest_api/` | Generic REST API connector |
| `F:/dlt/dlt/sources/sql_database/` | SQL database connector |
| `F:/dlt/dlt/sources/filesystem/` | Cloud storage connector |
| `F:/dlt/dlt/normalize/normalize.py` | Normalization orchestrator |
| `F:/dlt/dlt/load/load.py` | Load orchestrator |
| `F:/dlt/dlt/destinations/impl/` | All 22 destination implementations |
| `F:/dlt/dlt/pipeline/pipeline.py` | Main Pipeline class |
| `F:/dlt/docs/examples/archive/sources/singer_tap.py` | Singer tap adapter |
| `F:/dlt/pyproject.toml` | Dependencies and entry points |

---

## 10. Next Steps

1. **Decide on Option A vs B** for the initial pipeline architecture
2. **Identify first data sources** — which external APIs or databases do we need to extract from?
3. **Prototype the ArangoDB adapter** — either as a DLT custom destination or as a post-load transformer
4. **Wire Kestra as the scheduler** — Kestra triggers DLT pipeline runs on schedule or event
5. **Build the document/block translation layer** — map DLT's normalized rows to our Arango document model
