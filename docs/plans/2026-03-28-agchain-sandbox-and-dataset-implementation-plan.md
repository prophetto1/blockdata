# AGChain Sandbox Abstraction & Dataset Registry — Implementation Plan

**Goal:** Implement the first two foundation layers identified in the evaluation workspace direction: (1) a sandbox abstraction borrowed from Inspect's provider pattern, and (2) the dataset registry surface that becomes the object spine for experiments, playgrounds, and trace drilldown.

**Depends on:** `docs/plans/2026-03-28-agchain-evaluation-workspace-direction.md` (approved direction)

**Status:** Draft — discuss before execution

**Date:** 2026-03-28

---

## Part A — Sandbox Abstraction Layer

### Source Analysis Summary

Four Inspect sandbox repos were analyzed for pattern adoption:

| Repo | Type | Key Pattern | Adoption Level |
|---|---|---|---|
| `inspect_ai` (core) | ABC + Docker + Local | `SandboxEnvironment` contract, lifecycle, `ExecResult` | **Adopt directly** |
| `inspect_ec2_sandbox` | Remote VM provider | SSM + S3 file transfer, CDK IaC, presigned URL pattern | **Reference for Cloud Run variant** |
| `inspect_k8s_sandbox` | K8s provider | Helm chart + gVisor + Cilium, WebSocket exec, compose→Helm conversion | **Phase 2 reference** |
| `inspect_cyber` | Eval extension | YAML-driven task definition, checkpoint scoring, dynamic config resolution | **Adopt task definition pattern** |
| `inspect_evals` | Task library | `@task` + `eval.yaml` metadata, `TaskVersion`, test patterns | **Adopt metadata schema** |

### A.1 — AGChain Sandbox Contract

**New file:** `services/platform-api/app/domain/agchain/sandbox/environment.py`

Adapted from Inspect's `SandboxEnvironment` ABC at `_agchain/_reference/inspect_ai/src/inspect_ai/util/_sandbox/environment.py`.

```python
class AgchainSandboxEnvironment(ABC):
    """AGChain sandbox contract — Inspect-shaped, AGChain-owned."""

    # === Tool-facing API ===
    @abstractmethod
    async def exec(self, cmd: list[str], *, input: str | bytes | None = None,
                   cwd: str | None = None, env: dict[str, str] | None = None,
                   user: str | None = None, timeout: int | None = None) -> ExecResult: ...

    @abstractmethod
    async def write_file(self, file: str, contents: str | bytes) -> None: ...

    @abstractmethod
    async def read_file(self, file: str, text: bool = True) -> str | bytes: ...

    # === Lifecycle (classmethod) ===
    @classmethod
    async def task_init(cls, task_name: str, config: Any | None) -> None: ...

    @classmethod
    async def sample_init(cls, task_name: str, config: Any | None,
                          metadata: dict[str, str]) -> dict[str, "AgchainSandboxEnvironment"]: ...

    @classmethod
    async def sample_cleanup(cls, task_name: str, config: Any | None,
                             environments: dict[str, "AgchainSandboxEnvironment"],
                             interrupted: bool) -> None: ...

    @classmethod
    async def task_cleanup(cls, task_name: str, config: Any | None, cleanup: bool) -> None: ...
```

**New file:** `services/platform-api/app/domain/agchain/sandbox/exec_result.py`

```python
@dataclass(frozen=True)
class ExecResult:
    success: bool
    returncode: int
    stdout: str
    stderr: str
```

### A.2 — Local Sandbox (Phase 1)

**New file:** `services/platform-api/app/domain/agchain/sandbox/local.py`

Adapted from Inspect's `LocalSandboxEnvironment` at `_agchain/_reference/inspect_ai/src/inspect_ai/util/_sandbox/local.py`.

- Creates temp directory per sample
- `exec()` via `asyncio.create_subprocess_exec`
- `read_file()` / `write_file()` via local filesystem
- No containerization — for development and unit testing

### A.3 — Docker Sandbox (Phase 1)

**New file:** `services/platform-api/app/domain/agchain/sandbox/docker.py`

Adapted from Inspect's `DockerSandboxEnvironment` at `_agchain/_reference/inspect_ai/src/inspect_ai/util/_sandbox/docker/docker.py`.

- Accepts `compose.yaml` or `ComposeConfig`
- Creates Docker Compose project per sample
- `exec()` via `docker compose exec`
- `read_file()` / `write_file()` via `docker compose cp`
- Default concurrency: `2 * cpu_count`

### A.4 — Sandbox Registry

**New file:** `services/platform-api/app/domain/agchain/sandbox/registry.py`

```python
_REGISTRY: dict[str, type[AgchainSandboxEnvironment]] = {}

def register_sandbox(name: str):
    """Decorator to register a sandbox type."""
    def decorator(cls):
        _REGISTRY[name] = cls
        return cls
    return decorator

def resolve_sandbox(name: str) -> type[AgchainSandboxEnvironment]:
    if name not in _REGISTRY:
        raise ValueError(f"Unknown sandbox type: {name}")
    return _REGISTRY[name]
```

### A.5 — AGChain-Owned Sandbox Extensions

These are NOT in Inspect and represent AGChain's semantic ownership:

**New file:** `services/platform-api/app/domain/agchain/sandbox/file_projection.py`

- `project_candidate_files(sample, step)` — which packet files are visible to the candidate model
- `project_judge_files(sample, step)` — which packet files are visible to the judge
- `project_step_state(sample, step, carry_forward)` — inter-step state visibility

This maps to the direction document's "admitted-payload visibility rules" and "candidate-visible vs judge-visible separation."

### A.6 — Integration with Existing Runner

The existing runner at `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py` currently executes without sandboxing. The `RuntimeConfig` already has `sandbox_mode: str` (currently blocked in validation). Integration path:

1. Unblock `sandbox_mode` validation in `runtime_config.py`
2. Add sandbox resolution: `RuntimeConfig.sandbox_mode` → `resolve_sandbox(mode)` → `AgchainSandboxEnvironment`
3. Wrap step execution: `sample_init()` before EU processing, `sample_cleanup()` after

### A.7 — Tests

**New files:**
- `services/platform-api/tests/test_sandbox_local.py`
- `services/platform-api/tests/test_sandbox_docker.py`
- `services/platform-api/tests/test_sandbox_registry.py`
- `services/platform-api/tests/test_sandbox_file_projection.py`

Test patterns borrowed from `inspect_evals`:
- `assert_sandbox_lifecycle()` — init → exec → read/write → cleanup
- Mock sandbox for unit tests (no Docker required)
- Docker tests marked with `@pytest.mark.docker`

### A.8 — File Inventory (Part A)

```
services/platform-api/app/domain/agchain/sandbox/
├── __init__.py
├── environment.py          # ABC
├── exec_result.py          # ExecResult dataclass
├── local.py                # LocalSandboxEnvironment
├── docker.py               # DockerSandboxEnvironment
├── registry.py             # register_sandbox / resolve_sandbox
└── file_projection.py      # AGChain-owned visibility rules

services/platform-api/tests/
├── test_sandbox_local.py
├── test_sandbox_docker.py
├── test_sandbox_registry.py
└── test_sandbox_file_projection.py
```

---

## Part B — Dataset Registry

### Design: Dual-Track Dataset Model

Inspect treats datasets as files (CSV, JSON, JSONL, HuggingFace, S3) loaded at runtime. That is the floor, not the ceiling. AGChain supports everything Inspect supports **plus** a structured registry that makes datasets first-class queryable objects.

**Track 1 — File-sourced (Inspect-compatible baseline):**
- Upload or reference a `.csv`, `.json`, `.jsonl`, HuggingFace ID, GCS URI
- Field mapping config (FieldSpec or custom record_to_sample)
- Parsed at runtime into Sample objects
- Dataset file is the source of truth
- Bulk ingest, no per-sample editing

**Track 2 — Registry-managed (AGChain extension):**
- Samples as rows in Postgres — queryable, filterable, individually editable
- Sample drilldown in the UI
- Per-sample metadata, attached files, sandbox hints
- Versioned snapshots (freeze a draft into a published version)
- Direct FK join target for experiment results and trace references

| Capability | Track 1 (file) | Track 2 (registry) |
|---|---|---|
| Source of truth | File in GCS/local | Postgres rows |
| Editable per-sample | No (re-upload) | Yes |
| Queryable in UI | Metadata only | Full drilldown |
| Bulk ingest | Native | Via file import |
| HuggingFace / S3 / GCS | Yes | Via import |
| Versioned snapshots | File hash | Row-level freeze |
| Join to sample results | By sample_id | Direct FK |
| Runtime Sample output | Yes | Yes |

A file-sourced dataset can be **promoted** to registry-managed (parse and insert samples). A registry-managed dataset can be **exported** to file formats. Neither is subordinate.

### B.1 — Database Migration

**New file:** `supabase/migrations/2026032900001_agchain_datasets.sql`

```sql
-- Dataset registry (dual-track: file-sourced or registry-managed)
create table agchain_datasets (
    dataset_id          uuid primary key default gen_random_uuid(),
    dataset_slug        text not null unique,
    dataset_name        text not null,
    description         text,
    owner_user_id       uuid not null references auth.users(id),
    current_version_id  uuid,  -- FK added after version table

    -- Track 1: file-sourced datasets
    source_kind         text not null default 'registry'
                        check (source_kind in (
                            'registry',      -- Track 2: samples in Postgres
                            'file_upload',   -- uploaded CSV/JSON/JSONL in GCS
                            'huggingface',   -- HuggingFace dataset reference
                            'gcs',           -- GCS URI
                            's3'             -- S3 URI
                        )),
    source_ref          text,              -- storage_object_id, HF path, GCS/S3 URI
    source_format       text               -- 'csv', 'json', 'jsonl', null for registry
                        check (source_format in ('csv', 'json', 'jsonl', null)),
    field_mapping       jsonb,             -- FieldSpec config for file-sourced datasets

    sample_count        int not null default 0,
    archived_at         timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- Dataset versions (immutable snapshots)
create table agchain_dataset_versions (
    dataset_version_id  uuid primary key default gen_random_uuid(),
    dataset_id          uuid not null references agchain_datasets(dataset_id),
    version_label       text not null,
    version_status      text not null default 'draft'
                        check (version_status in ('draft', 'published', 'archived')),

    -- For file-sourced: frozen ref to the exact file snapshot
    source_snapshot_ref text,              -- GCS object version, commit hash, etc.

    sample_count        int not null default 0,
    created_by          uuid references auth.users(id),
    published_at        timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    unique (dataset_id, version_label)
);

-- Add FK for current_version_id
alter table agchain_datasets
    add constraint fk_current_version
    foreign key (current_version_id) references agchain_dataset_versions(dataset_version_id);

-- Dataset samples (Track 2 registry-managed, or materialized from Track 1 on promote)
create table agchain_dataset_samples (
    dataset_sample_id   uuid primary key default gen_random_uuid(),
    dataset_version_id  uuid not null references agchain_dataset_versions(dataset_version_id),
    sample_id           text not null,  -- stable external ID (Inspect-compatible)
    input               text not null,  -- prompt text (primary case for legal evals)
    input_messages      jsonb,          -- ChatMessage[] when multi-turn input is needed
    target              text,           -- expected answer / ideal output
    target_list         text[],         -- multiple targets (e.g. acceptable variants)
    choices             text[],         -- MCQ option list
    metadata            jsonb,          -- arbitrary key-value
    files               jsonb,          -- {sandbox_path: content_ref}
    setup               text,           -- bash setup script
    sort_order          int not null default 0,
    created_at          timestamptz not null default now(),
    unique (dataset_version_id, sample_id)
);

-- Indexes
create index idx_datasets_owner on agchain_datasets(owner_user_id);
create index idx_datasets_slug on agchain_datasets(dataset_slug);
create index idx_datasets_source on agchain_datasets(source_kind);
create index idx_dataset_versions_dataset on agchain_dataset_versions(dataset_id);
create index idx_dataset_samples_version on agchain_dataset_samples(dataset_version_id);
create index idx_dataset_samples_sample_id on agchain_dataset_samples(sample_id);

-- RLS
alter table agchain_datasets enable row level security;
alter table agchain_dataset_versions enable row level security;
alter table agchain_dataset_samples enable row level security;

-- Service role full access
create policy "service_role_datasets" on agchain_datasets for all
    using (true) with check (true);
create policy "service_role_dataset_versions" on agchain_dataset_versions for all
    using (true) with check (true);
create policy "service_role_dataset_samples" on agchain_dataset_samples for all
    using (true) with check (true);
```

### B.2 — Domain Layer

**New file:** `services/platform-api/app/domain/agchain/dataset_registry.py`

Functions (mirrors benchmark_registry.py patterns):

**Registry operations (both tracks):**
- `list_datasets(user_id)` — owner-scoped list with version/sample counts, source_kind
- `create_dataset(user_id, payload)` — creates dataset + v0.1.0 draft version; payload includes source_kind
- `get_dataset_detail(user_id, dataset_slug)` — single dataset + version info + source metadata
- `publish_dataset_version(user_id, dataset_slug)` — freeze current draft (file-sourced: snapshot ref; registry: freeze rows)
- `delete_dataset(user_id, dataset_slug)` — archive dataset

**Track 1 — File-sourced operations:**
- `create_file_dataset(user_id, payload)` — register a file upload, HuggingFace ref, or GCS/S3 URI
- `get_dataset_samples_from_source(user_id, dataset_slug, *, limit, offset)` — parse source file at read time, return Sample objects
- `promote_to_registry(user_id, dataset_slug)` — parse file, insert all samples as rows, switch source_kind to 'registry'

**Track 2 — Registry-managed operations:**
- `get_dataset_samples(user_id, dataset_slug, *, limit, offset)` — paginated sample list from Postgres
- `get_dataset_sample(user_id, dataset_slug, sample_id)` — single sample drilldown
- `create_dataset_samples(user_id, dataset_slug, samples)` — bulk sample insert
- `update_dataset_sample(user_id, dataset_slug, sample_id, payload)` — single sample update
- `delete_dataset_sample(user_id, dataset_slug, sample_id)` — single sample delete
- `import_samples_from_file(user_id, dataset_slug, file_path, field_mapping)` — parse file and insert as registry rows

**Runtime loading (used by runner):**
- `load_dataset_samples(dataset_slug, version_label)` — returns list[Sample] regardless of track; file-sourced parses on demand, registry reads from Postgres

**New file:** `services/platform-api/app/domain/agchain/dataset_loader.py`

File parsing utilities (Inspect-compatible formats):
- `parse_csv_to_samples(file_path, field_mapping)` — CSV → Sample[]
- `parse_json_to_samples(file_path, field_mapping)` — JSON → Sample[]
- `parse_jsonl_to_samples(file_path, field_mapping)` — JSONL → Sample[]
- `apply_field_mapping(record, field_mapping)` — FieldSpec-style column mapping

### B.3 — API Routes

**New file:** `services/platform-api/app/api/routes/agchain_datasets.py`

**Registry endpoints (both tracks):**

| Method | Endpoint | Summary |
|---|---|---|
| GET | `/agchain/datasets` | List datasets (search, state, source_kind filters) |
| POST | `/agchain/datasets` | Create dataset (registry or file-sourced) |
| GET | `/agchain/datasets/{slug}` | Get dataset detail + source metadata |
| DELETE | `/agchain/datasets/{slug}` | Archive dataset |
| POST | `/agchain/datasets/{slug}/publish` | Publish current draft version |

**Sample endpoints (unified — delegates to file parser or Postgres based on source_kind):**

| Method | Endpoint | Summary |
|---|---|---|
| GET | `/agchain/datasets/{slug}/samples` | List samples (paginated, works for both tracks) |
| GET | `/agchain/datasets/{slug}/samples/{sample_id}` | Get single sample |
| POST | `/agchain/datasets/{slug}/samples` | Create samples (registry track only, bulk) |
| PATCH | `/agchain/datasets/{slug}/samples/{sample_id}` | Update sample (registry track only) |
| DELETE | `/agchain/datasets/{slug}/samples/{sample_id}` | Delete sample (registry track only) |

**Track management endpoints:**

| Method | Endpoint | Summary |
|---|---|---|
| POST | `/agchain/datasets/{slug}/promote` | Promote file-sourced → registry-managed |
| POST | `/agchain/datasets/{slug}/import` | Import samples from file into registry |
| GET | `/agchain/datasets/{slug}/export` | Export registry samples as JSON/CSV download |

### B.4 — Observability

Follow existing patterns from `agchain_benchmarks.py`:

- OTel spans: `agchain.datasets.*` operations
- Counters: `datasets.list`, `datasets.create`, `datasets.samples.get`, etc.
- Histograms: `datasets.list.duration_ms`, `datasets.samples.get.duration_ms`

### B.5 — Tests

**New files:**
- `services/platform-api/tests/test_agchain_datasets.py` — route tests
- `services/platform-api/tests/test_dataset_registry.py` — domain tests

### B.6 — Frontend Surface

**New files:**
- `web/src/pages/agchain/AgchainDatasetsPage.tsx` — dataset registry table
- `web/src/pages/agchain/AgchainDatasetDetailPage.tsx` — dataset detail + sample table
- `web/src/hooks/agchain/useAgchainDatasets.ts` — data fetching hooks
- `web/src/lib/agchainDatasets.ts` — API client functions

**Modify:**
- `web/src/router.tsx` — add dataset routes
- `web/src/components/layout/AgchainShellLayout.tsx` — add Datasets nav item

### B.7 — File Inventory (Part B)

```
supabase/migrations/
└── 2026032900001_agchain_datasets.sql

services/platform-api/app/
├── api/routes/agchain_datasets.py
├── domain/agchain/dataset_registry.py
└── domain/agchain/dataset_loader.py       # file parsing: CSV, JSON, JSONL, field mapping

services/platform-api/tests/
├── test_agchain_datasets.py
├── test_dataset_registry.py
└── test_dataset_loader.py                 # file format parsing tests

web/src/
├── pages/agchain/
│   ├── AgchainDatasetsPage.tsx
│   └── AgchainDatasetDetailPage.tsx
├── hooks/agchain/useAgchainDatasets.ts
└── lib/agchainDatasets.ts
```

---

## Execution Order

### Phase 1a — Sandbox Foundation (no Docker dependency for tests)
1. Write `ExecResult` dataclass
2. Write `AgchainSandboxEnvironment` ABC
3. Write sandbox registry
4. Write `LocalSandboxEnvironment` with tests
5. Write `file_projection.py` with tests

### Phase 1b — Docker Sandbox
6. Write `DockerSandboxEnvironment` with compose support
7. Docker-marked integration tests

### Phase 1c — Dataset Registry (backend)
8. Write and apply dataset migration
9. Write `dataset_registry.py` domain layer with tests
10. Write `agchain_datasets.py` routes with tests

### Phase 1d — Dataset Registry (frontend)
11. API client + hooks
12. Dataset registry page
13. Dataset detail + sample table page
14. Router + shell nav updates

### Phase 1e — Runner Integration
15. Unblock `sandbox_mode` in `RuntimeConfig`
16. Wire sandbox lifecycle into `run_3s.py`
17. End-to-end test: local sandbox + legal-10 benchmark

---

## Future Phases (out of scope for this plan)

- **Cloud Run Sandbox** — borrow EC2 sandbox lifecycle for GCP (GCS + Cloud Run Jobs)
- **K8s Sandbox** — borrow inspect_k8s_sandbox Helm pattern for GKE
- **Experiments surface** — comparison spine binding benchmark + dataset + runtime profile
- **Run orchestration** — queue-based submission with sandbox selection
- **Observe surface** — trace drilldown with sandbox event logging

---

## Locked Decisions

1. AGChain owns the sandbox ABC — does not import `inspect_ai.util._sandbox` at runtime
2. Local and Docker are Phase 1 sandbox types; Cloud Run and K8s are Phase 2
3. Dataset model is dual-track: file-sourced (Inspect-compatible baseline) + registry-managed (AGChain extension)
4. Dataset samples use `text` for input/target, `text[]` for choices/target_list, `jsonb` only for metadata/files/input_messages
5. File-sourced datasets can be promoted to registry-managed; registry datasets can be exported to file formats
6. File projection (candidate-visible vs judge-visible) is AGChain-owned, not sandbox-owned
7. Sandbox registry uses decorator-based registration (same pattern as Inspect, independent implementation)
8. Runtime `load_dataset_samples()` returns the same Sample shape regardless of which track the dataset uses
9. Inspect file formats (CSV, JSON, JSONL) are supported at minimum; HuggingFace and GCS/S3 refs are supported as source_kind

## Approval Criteria

This plan is approved when:

1. Sandbox ABC + local provider + registry + file projection are accepted as the foundation layer
2. Dataset migration schema is accepted
3. Dataset route contract is accepted
4. Execution order is accepted
5. Runner integration approach (unblock sandbox_mode) is accepted
