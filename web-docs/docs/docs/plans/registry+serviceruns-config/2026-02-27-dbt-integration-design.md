# dbt Integration Design: Database Source Transform Options

## Goal

Borrow Mage AI's dbt execution layer (dbtRunner, DBTCli, profile interpolation, source generation) and integrate dbt commands as database source transform options in blockdata. dbt becomes a set of action types callable from both the Transform surface and Eternity Canvas.

---

## Architecture Overview

```
blockdata web app (React)
        |
        | HTTP (REST)
        v
blockdata-dbt-service (FastAPI, Python, Ubuntu box)
        |
        | Python API (dbtRunner.invoke())
        v
dbt-core (Python library)
        |
        | SQL (adapter)
        v
Target database (Postgres, BigQuery, DuckDB, etc.)
```

The dbt service runs on the Ubuntu machine alongside ArangoDB. The web frontend calls it via REST. dbt-core runs in-process via its Python API -- no subprocess shelling out.

---

## What We Borrow From Mage

### Extracted (adapt into standalone service)

| Mage Source File | What We Take | Adaptation |
|---|---|---|
| `dbt/dbt_cli.py` | DBTCli class wrapping `dbtRunner` with logging callbacks | Strip Mage logging, use stdlib `logging` |
| `dbt/block_sql.py` | CLI arg building (`--project-dir`, `--select`, `--vars`, `--target`, `--profiles-dir`) | Extract into pure functions, remove Mage block inheritance |
| `dbt/profiles.py` | Profile interpolation via Jinja2 + temp directory management | Same pattern, context manager for cleanup |
| `dbt/sources.py` | Auto-generated `mage_sources.yml` for upstream data | Rename to `blockdata_sources.yml`, use blockdata action IDs |
| `dbt/block.py` | `upstream_dbt_blocks()` -- `dbt list --output json` for DAG discovery | Feed into blockdata flow graph, not Mage pipeline |

### NOT Borrowed

- Mage's block system, variable store, pipeline model (blockdata has its own)
- Mage's frontend dbt components (we build our own)
- Mage's async file handling (`aiofiles` -- unnecessary complexity)
- Mage's `DBTBlockYAML` (we expose structured commands, not raw CLI strings)

---

## dbt Executor Service

### Project Structure

```
blockdata-dbt-service/
  app.py                     # FastAPI server entry point
  dbt_executor.py            # Core: dbtRunner wrapper (from Mage's DBTCli)
  profile_manager.py         # Profile interpolation (from Mage's Profiles)
  source_manager.py          # Auto-source generation (from Mage's Sources)
  project_registry.py        # Manages registered dbt projects
  result_parser.py           # Parses run_results.json, manifest.json
  models/
    commands.py              # Pydantic request/response models
    dbt_types.py             # dbt result type definitions
  requirements.txt           # dbt-core, dbt-postgres, fastapi, uvicorn, pydantic
```

### Core Executor (from Mage's DBTCli)

```python
from dbt.cli.main import dbtRunner, dbtRunnerResult

class DbtExecutor:
    def __init__(self):
        self._log_buffer: list[dict] = []

    def _log_callback(self, event):
        self._log_buffer.append({
            "level": event.info.level,
            "msg": event.info.msg,
            "ts": event.info.ts.isoformat() if event.info.ts else None,
        })

    def invoke(self, args: list[str]) -> DbtCommandResult:
        self._log_buffer = []
        runner = dbtRunner(callbacks=[self._log_callback])
        start = time.monotonic()
        result: dbtRunnerResult = runner.invoke(args)
        duration_ms = (time.monotonic() - start) * 1000

        return DbtCommandResult(
            success=result.success,
            exit_code=0 if result.success else 1,
            duration_ms=duration_ms,
            exception=str(result.exception) if result.exception else None,
            raw_result=result.result,
            logs=self._log_buffer,
        )
```

### API Endpoints

All endpoints accept JSON, return structured results.

#### Transform Commands (the "database source transform options")

```
POST /dbt/run
  { project_dir, select?, exclude?, target?, vars?, full_refresh? }
  -> DbtCommandResult with per-model status

POST /dbt/test
  { project_dir, select?, exclude?, target?, vars? }
  -> DbtCommandResult with per-test pass/fail

POST /dbt/build
  { project_dir, select?, exclude?, target?, vars?, full_refresh? }
  -> DbtCommandResult (run + test + snapshot + seed in DAG order)

POST /dbt/show
  { project_dir, select, target?, vars?, limit? }
  -> DbtCommandResult with preview_data (list[dict] rows)

POST /dbt/compile
  { project_dir, select?, target?, vars? }
  -> DbtCommandResult with compiled_sql per model

POST /dbt/seed
  { project_dir, select?, target?, full_refresh? }
  -> DbtCommandResult

POST /dbt/snapshot
  { project_dir, select?, target?, vars? }
  -> DbtCommandResult

POST /dbt/source-freshness
  { project_dir, select?, target? }
  -> DbtCommandResult with freshness status per source
```

#### Utility Commands

```
POST /dbt/list
  { project_dir, select?, resource_type?, output_keys? }
  -> list of dbt resources (models, tests, sources, etc.)

POST /dbt/parse
  { project_dir }
  -> manifest summary (nodes, sources, macros, DAG edges)

POST /dbt/deps
  { project_dir }
  -> package install result

POST /dbt/run-operation
  { project_dir, macro, target?, args? }
  -> macro execution result
```

#### Project Management

```
GET  /dbt/projects                -> list registered projects
POST /dbt/projects                -> register { name, path, default_target }
GET  /dbt/projects/:id/profiles   -> available targets for project
PUT  /dbt/projects/:id/profiles   -> update profile variables
GET  /dbt/projects/:id/manifest   -> parsed manifest (models, DAG)
```

### Result Contract

```python
class DbtCommandResult(BaseModel):
    success: bool
    command: str                              # "run", "test", "build", etc.
    exit_code: int
    duration_ms: float
    results: list[DbtNodeResult]              # per-model/test results
    logs: list[DbtLogEntry]                   # structured log lines
    compiled_sql: str | None = None           # if compile/show
    preview_data: list[dict] | None = None    # if show command
    manifest_summary: ManifestSummary | None = None
    exception: str | None = None

class DbtNodeResult(BaseModel):
    unique_id: str                            # model.project.model_name
    name: str
    resource_type: str                        # model, test, seed, snapshot
    status: str                               # success, error, skipped, pass, fail
    execution_time_ms: float
    rows_affected: int | None = None
    message: str | None = None
    compiled_sql: str | None = None

class DbtLogEntry(BaseModel):
    level: str                                # info, warn, error, debug
    msg: str
    ts: str | None = None

class ManifestSummary(BaseModel):
    nodes: list[ManifestNode]
    edges: list[tuple[str, str]]              # (upstream_id, downstream_id)

class ManifestNode(BaseModel):
    unique_id: str
    name: str
    resource_type: str
    file_path: str
    depends_on: list[str]
```

---

## Bidirectional Data Flow

### Inbound: blockdata action output -> dbt source

When an upstream action (ingest, parse, extract) produces tabular output, the dbt service materializes it as a dbt source:

1. Upstream action writes result to a staging table or CSV
2. dbt service auto-generates `blockdata_sources.yml`:
   ```yaml
   version: 2
   sources:
     - name: blockdata_pipeline
       schema: blockdata_staging
       tables:
         - name: action_<action_id>_output
           meta:
             flow_id: <flow_id>
             action_id: <action_id>
   ```
3. dbt models reference: `{{ source('blockdata_pipeline', 'action_<action_id>_output') }}`

Pattern borrowed directly from Mage's `Sources` class.

### Outbound: dbt result -> downstream blockdata action

1. `dbt run` completes -> service parses `run_results.json` -> returns `DbtNodeResult[]`
2. `dbt show` completes -> service returns `preview_data` as `list[dict]` (JSON rows)
3. Results stored in blockdata's run tracking system
4. Downstream actions receive results as input via the standard action contract

---

## DAG Discovery

Using `dbt list` (borrowed from Mage's `upstream_dbt_blocks()`):

```python
result = executor.invoke([
    "list",
    "--project-dir", project_dir,
    "--select", f"+{model_name}",     # model + all upstream
    "--output", "json",
    "--output-keys", "unique_id original_file_path depends_on",
    "--resource-type", "model",
    "--resource-type", "snapshot",
])
```

This returns the dbt DAG as JSON nodes with `depends_on` edges. The frontend merges these into:
- **Transform surface**: ordered step list (topological sort)
- **Eternity Canvas**: graph nodes with edges wired to `@xyflow/react`

---

## Blockdata Action Type Mapping

Each dbt command becomes an action type in blockdata's uniform action contract:

| Action Type | dbt Command | Transform Surface Label | Eternity Canvas Node |
|---|---|---|---|
| `dbt_run` | `dbt run` | Run Model | "dbt Run" node |
| `dbt_test` | `dbt test` | Test Data Quality | "dbt Test" node |
| `dbt_build` | `dbt build` | Build (Run + Test) | "dbt Build" node |
| `dbt_show` | `dbt show` | Preview Transform | "dbt Preview" node |
| `dbt_compile` | `dbt compile` | View Compiled SQL | "dbt Compile" node |
| `dbt_seed` | `dbt seed` | Load Seed Data | "dbt Seed" node |
| `dbt_snapshot` | `dbt snapshot` | Snapshot (SCD) | "dbt Snapshot" node |
| `dbt_freshness` | `dbt source freshness` | Check Freshness | "dbt Freshness" node |
| `dbt_run_operation` | `dbt run-operation` | Run Macro | "dbt Macro" node |

Each action follows blockdata's existing contract:
```typescript
{
  id: string,
  type: "dbt_run" | "dbt_test" | ...,
  label: string,
  config: {
    project_id: string,       // registered dbt project
    select?: string,          // model selector
    exclude?: string,
    target?: string,          // profile target
    vars?: Record<string, unknown>,
    full_refresh?: boolean,
  },
  preconditions: string[],    // upstream action IDs
  execute: () => Promise<DbtCommandResult>,
  result: DbtCommandResult | null,
  error: string | null,
}
```

---

## Profile Management (from Mage's Profiles class)

Runtime variable interpolation into `profiles.yml`:

```python
class ProfileManager:
    def __init__(self, project_dir: str):
        self.project_dir = project_dir
        self._temp_dir: str | None = None

    def interpolated_profiles_dir(self, variables: dict) -> str:
        """Create temp profiles.yml with variables interpolated via Jinja2."""
        original = Path(self.project_dir) / "profiles.yml"
        content = original.read_text()
        rendered = jinja2.Template(content).render(**variables)

        self._temp_dir = tempfile.mkdtemp(prefix="blockdata_dbt_profiles_")
        (Path(self._temp_dir) / "profiles.yml").write_text(rendered)
        return self._temp_dir

    def cleanup(self):
        if self._temp_dir and Path(self._temp_dir).exists():
            shutil.rmtree(self._temp_dir)
```

This allows blockdata to inject runtime config (database credentials, schema names, environment flags) without modifying the user's original profiles.yml.

---

## Implementation Phases

### Phase 1: dbt Executor Service
- Extract DBTCli wrapper from Mage codebase
- Build FastAPI service with core command endpoints (run, test, build, show, compile)
- Profile management with interpolation
- Project registry (SQLite or JSON file on disk)
- Result parsing from run_results.json
- Deploy on Ubuntu box via Docker or systemd

### Phase 2: Blockdata Action Integration
- Define dbt action types in blockdata's action module system
- Frontend calls dbt service via HTTP from flow execution
- Results stored in blockdata's runs table
- Action config UI in Transform surface (model selector, target picker, vars editor)

### Phase 3: Source Materialization
- Upstream action outputs -> staging tables
- Auto-generate blockdata_sources.yml
- dbt models can reference upstream blockdata data

### Phase 4: DAG Discovery + Canvas Integration
- `dbt list/parse` -> manifest -> graph nodes
- Merge dbt model DAG into Eternity Canvas
- Show dbt dependencies alongside other action nodes

### Phase 5: Advanced Features
- Streaming logs via SSE during long dbt runs
- dbt docs generate -> embedded documentation viewer
- Model lineage overlay on database schema page
- Source freshness monitoring as scheduled checks
