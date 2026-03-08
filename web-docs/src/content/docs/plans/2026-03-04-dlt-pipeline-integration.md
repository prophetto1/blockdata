---
title: "DLT Pipeline Integration Plan"
description: "> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task."
---# DLT Pipeline Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a data pipeline layer using DLT for extraction/normalization with ArangoDB as the final destination, orchestrated by Kestra.

**Architecture:** DLT extracts from external sources (REST APIs, SQL databases, files), normalizes data with automatic schema inference, stages to local DuckDB/filesystem. A thin Python adapter transforms normalized rows into our document/block model and writes to ArangoDB. Kestra triggers pipeline runs.

**Tech Stack:** Python 3.11+, DLT v1.22+, python-arango, DuckDB (staging), Kestra (orchestration), ArangoDB (document store)

---

### Task 1: Project Scaffold

**Files:**
- Create: `pipeline/pyproject.toml`
- Create: `pipeline/src/blockdata_pipeline/__init__.py`
- Create: `pipeline/src/blockdata_pipeline/config.py`
- Create: `pipeline/.dlt/config.toml`
- Create: `pipeline/.dlt/secrets.toml`

**Step 1: Create pipeline project with uv**

```bash
cd e:/writing-system
mkdir -p pipeline/src/blockdata_pipeline
mkdir -p pipeline/.dlt
```

**Step 2: Write pyproject.toml**

```toml
[project]
name = "blockdata-pipeline"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "dlt[duckdb]>=1.22.0",
    "python-arango>=8.0.0",
]

[project.optional-dependencies]
dev = ["pytest>=8.0", "pytest-asyncio>=0.23"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

**Step 3: Write config scaffolding**

`pipeline/.dlt/config.toml`:
```toml
[runtime]
log_level = "INFO"

[destination.duckdb]
credentials = "pipeline/_storage/staging.duckdb"
```

`pipeline/.dlt/secrets.toml`:
```toml
[sources.rest_api]
# API keys go here per source

[destination.arango]
host = "http://localhost:8529"
username = "root"
password = "blockdata_dev"
database = "_system"
```

`pipeline/src/blockdata_pipeline/config.py`:
```python
from dataclasses import dataclass

@dataclass
class ArangoConfig:
    host: str = "http://localhost:8529"
    username: str = "root"
    password: str = "blockdata_dev"
    database: str = "_system"
```

**Step 4: Install dependencies**

```bash
cd pipeline && uv sync
```

**Step 5: Commit**

```bash
git add pipeline/
git commit -m "feat: scaffold DLT pipeline project"
```

---

### Task 2: ArangoDB Adapter

**Files:**
- Create: `pipeline/src/blockdata_pipeline/arango_adapter.py`
- Create: `pipeline/tests/test_arango_adapter.py`

**Step 1: Write the failing test**

```python
# pipeline/tests/test_arango_adapter.py
from blockdata_pipeline.arango_adapter import ArangoAdapter

def test_adapter_connects():
    adapter = ArangoAdapter(
        host="http://localhost:8529",
        username="root",
        password="blockdata_dev",
    )
    assert adapter.ping() is True

def test_adapter_upsert_document():
    adapter = ArangoAdapter(
        host="http://localhost:8529",
        username="root",
        password="blockdata_dev",
    )
    doc = {"_key": "test-1", "title": "Test", "blocks": []}
    result = adapter.upsert("documents", doc)
    assert result is not None

def test_adapter_upsert_block():
    adapter = ArangoAdapter(
        host="http://localhost:8529",
        username="root",
        password="blockdata_dev",
    )
    block = {"_key": "block-1", "type": "paragraph", "content": "Hello"}
    result = adapter.upsert("blocks", block)
    assert result is not None
```

**Step 2: Run test to verify it fails**

```bash
cd pipeline && uv run pytest tests/test_arango_adapter.py -v
```

Expected: FAIL (module not found)

**Step 3: Write the adapter**

```python
# pipeline/src/blockdata_pipeline/arango_adapter.py
from arango import ArangoClient

class ArangoAdapter:
    def __init__(self, host: str, username: str, password: str, database: str = "_system"):
        self.client = ArangoClient(hosts=host)
        self.db = self.client.db(database, username=username, password=password)

    def ping(self) -> bool:
        return self.db.has_database(self.db.name)

    def ensure_collection(self, name: str) -> None:
        if not self.db.has_collection(name):
            self.db.create_collection(name)

    def upsert(self, collection: str, document: dict) -> dict:
        self.ensure_collection(collection)
        col = self.db.collection(collection)
        if "_key" in document and col.has(document["_key"]):
            return col.update(document)
        return col.insert(document)

    def bulk_upsert(self, collection: str, documents: list[dict]) -> list:
        self.ensure_collection(collection)
        col = self.db.collection(collection)
        return col.import_bulk(documents, on_duplicate="update")
```

**Step 4: Run test to verify it passes**

```bash
cd pipeline && uv run pytest tests/test_arango_adapter.py -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add pipeline/src/blockdata_pipeline/arango_adapter.py pipeline/tests/
git commit -m "feat: add ArangoDB adapter with upsert and bulk operations"
```

---

### Task 3: First DLT Pipeline (REST API Source)

**Files:**
- Create: `pipeline/src/blockdata_pipeline/sources/sample_api.py`
- Create: `pipeline/src/blockdata_pipeline/pipelines/sample_pipeline.py`
- Create: `pipeline/tests/test_sample_pipeline.py`

**Step 1: Write a sample REST API source**

```python
# pipeline/src/blockdata_pipeline/sources/sample_api.py
import dlt
from dlt.sources.rest_api import rest_api

@dlt.source
def sample_api():
    return rest_api(
        client={"base_url": "https://jsonplaceholder.typicode.com"},
        resources=[
            {
                "name": "posts",
                "endpoint": {"path": "posts"},
                "primary_key": "id",
                "write_disposition": "merge",
            },
        ],
    )
```

**Step 2: Write the pipeline**

```python
# pipeline/src/blockdata_pipeline/pipelines/sample_pipeline.py
import dlt
from blockdata_pipeline.sources.sample_api import sample_api

def run():
    pipeline = dlt.pipeline(
        pipeline_name="sample",
        destination="duckdb",
        dataset_name="staging",
    )
    info = pipeline.run(sample_api())
    print(info)
    return info
```

**Step 3: Write the test**

```python
# pipeline/tests/test_sample_pipeline.py
from blockdata_pipeline.pipelines.sample_pipeline import run

def test_sample_pipeline_runs():
    info = run()
    assert info.loads_count > 0
```

**Step 4: Run and verify**

```bash
cd pipeline && uv run pytest tests/test_sample_pipeline.py -v
```

**Step 5: Commit**

```bash
git add pipeline/src/blockdata_pipeline/sources/ pipeline/src/blockdata_pipeline/pipelines/ pipeline/tests/
git commit -m "feat: add sample REST API pipeline with DLT"
```

---

### Task 4: DLT-to-Arango Loader

**Files:**
- Create: `pipeline/src/blockdata_pipeline/loaders/arango_loader.py`
- Create: `pipeline/tests/test_arango_loader.py`

**Step 1: Write the failing test**

```python
# pipeline/tests/test_arango_loader.py
from blockdata_pipeline.loaders.arango_loader import load_staged_to_arango

def test_load_staged_posts_to_arango():
    # Run sample pipeline first to stage data
    from blockdata_pipeline.pipelines.sample_pipeline import run
    run()

    # Then load staged data to Arango
    result = load_staged_to_arango(
        pipeline_name="sample",
        table_name="posts",
        arango_collection="posts",
    )
    assert result["imported"] > 0
```

**Step 2: Write the loader**

```python
# pipeline/src/blockdata_pipeline/loaders/arango_loader.py
import dlt
from blockdata_pipeline.arango_adapter import ArangoAdapter
from blockdata_pipeline.config import ArangoConfig

def load_staged_to_arango(
    pipeline_name: str,
    table_name: str,
    arango_collection: str,
    config: ArangoConfig | None = None,
) -> dict:
    config = config or ArangoConfig()
    adapter = ArangoAdapter(
        host=config.host,
        username=config.username,
        password=config.password,
        database=config.database,
    )

    pipeline = dlt.attach(pipeline_name)
    dataset = pipeline.dataset()
    rows = list(dataset[table_name].fetchall())

    documents = [dict(row._mapping) for row in rows]
    result = adapter.bulk_upsert(arango_collection, documents)
    return {"imported": len(documents), "result": result}
```

**Step 3: Run and verify**

```bash
cd pipeline && uv run pytest tests/test_arango_loader.py -v
```

**Step 4: Commit**

```bash
git add pipeline/src/blockdata_pipeline/loaders/ pipeline/tests/
git commit -m "feat: add staged-to-Arango loader"
```

---

### Task 5: Singer Tap Wrapper

**Files:**
- Create: `pipeline/src/blockdata_pipeline/sources/singer_wrapper.py`
- Create: `pipeline/tests/test_singer_wrapper.py`

**Step 1: Write the Singer wrapper resource**

```python
# pipeline/src/blockdata_pipeline/sources/singer_wrapper.py
import json
import subprocess
from typing import Iterator
import dlt

@dlt.resource
def singer_tap(
    tap_command: list[str],
    config_path: str | None = None,
    catalog_path: str | None = None,
    state_path: str | None = None,
) -> Iterator[dict]:
    """Run a Singer tap and yield its RECORD messages as DLT items."""
    cmd = list(tap_command)
    if config_path:
        cmd.extend(["--config", config_path])
    if catalog_path:
        cmd.extend(["--catalog", catalog_path])
    if state_path:
        cmd.extend(["--state", state_path])

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, text=True)

    for line in proc.stdout:
        line = line.strip()
        if not line:
            continue
        msg = json.loads(line)
        if msg["type"] == "RECORD":
            yield dlt.mark.with_table_name(
                msg["record"],
                msg["stream"],
            )
        elif msg["type"] == "STATE":
            dlt.current.resource_state()["singer_state"] = msg["value"]

    proc.wait()
    if proc.returncode != 0:
        raise RuntimeError(f"Singer tap exited with code {proc.returncode}")
```

**Step 2: Write a test with a mock tap**

```python
# pipeline/tests/test_singer_wrapper.py
import json
import tempfile
from pathlib import Path
from blockdata_pipeline.sources.singer_wrapper import singer_tap

def test_singer_wrapper_parses_records():
    # Create a fake tap script that outputs Singer messages
    script = tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False)
    script.write("""
import json
msgs = [
    {"type": "SCHEMA", "stream": "users", "schema": {"properties": {"id": {"type": "integer"}}}},
    {"type": "RECORD", "stream": "users", "record": {"id": 1, "name": "Alice"}},
    {"type": "RECORD", "stream": "users", "record": {"id": 2, "name": "Bob"}},
    {"type": "STATE", "value": {"position": 2}},
]
for m in msgs:
    print(json.dumps(m))
""")
    script.close()

    records = list(singer_tap(tap_command=["python", script.name]))
    assert len(records) == 2
    assert records[0]["name"] == "Alice"
```

**Step 3: Run and verify**

```bash
cd pipeline && uv run pytest tests/test_singer_wrapper.py -v
```

**Step 4: Commit**

```bash
git add pipeline/src/blockdata_pipeline/sources/singer_wrapper.py pipeline/tests/
git commit -m "feat: add Singer tap wrapper for DLT"
```

---

### Task 6: Kestra Flow Definition

**Files:**
- Create: `pipeline/flows/blockdata_extract.yml`

**Step 1: Write the Kestra flow**

```yaml
id: blockdata_extract
namespace: blockdata.pipelines
description: Extract data from sources using DLT and load to ArangoDB

tasks:
  - id: run_pipeline
    type: io.kestra.plugin.scripts.python.Script
    taskRunner:
      type: io.kestra.plugin.scripts.runner.docker.Docker
      image: python:3.11-slim
    beforeCommands:
      - pip install dlt[duckdb] python-arango
    script: |
      import dlt
      from blockdata_pipeline.pipelines.sample_pipeline import run
      from blockdata_pipeline.loaders.arango_loader import load_staged_to_arango

      # Extract + normalize + stage
      info = run()
      print(f"Extracted: {info}")

      # Load staged data to ArangoDB
      result = load_staged_to_arango(
          pipeline_name="sample",
          table_name="posts",
          arango_collection="posts",
      )
      print(f"Loaded to Arango: {result}")

triggers:
  - id: daily_schedule
    type: io.kestra.core.models.triggers.types.Schedule
    cron: "0 6 * * *"
```

**Step 2: Commit**

```bash
git add pipeline/flows/
git commit -m "feat: add Kestra flow for DLT pipeline orchestration"
```

---

## Execution Order

1. **Task 1** — Project scaffold (no dependencies)
2. **Task 2** — ArangoDB adapter (needs Arango running at localhost:8529)
3. **Task 3** — Sample DLT pipeline (needs DLT installed)
4. **Task 4** — Staged-to-Arango loader (needs Tasks 2 + 3)
5. **Task 5** — Singer wrapper (independent, can run in parallel with 3-4)
6. **Task 6** — Kestra flow (needs all above working)

---

Plan complete and saved to `docs/plans/2026-03-04-dlt-pipeline-integration.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
