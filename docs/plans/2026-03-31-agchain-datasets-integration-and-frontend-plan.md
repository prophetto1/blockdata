# AGChain Datasets: Inspect AI Integration and Frontend Implementation Plan

**Goal:** Port Inspect AI's dataset module into the codebase as owned, modifiable code — not a black-box dependency — then build the full product surface: a database-backed dataset registry, platform-api endpoints with OpenTelemetry instrumentation, and a master-detail frontend page for managing evaluation datasets and browsing samples within the AGChain workspace.

**Architecture:** The ported Inspect AI code becomes a server-side loader library at `services/platform-api/app/domain/agchain/dataset_loader/`. It is called by the `dataset_registry` domain module when a user imports a file (CSV, JSON, JSONL) or fetches from HuggingFace Hub. Parsed samples are persisted to `agchain_datasets` and `agchain_dataset_samples` tables in Supabase Postgres via service_role access. The frontend reads from platform-api endpoints — it never touches loader code directly. The datasets page follows the established master-detail pattern (DatasetsTable + DatasetInspector) already proven on the Models page. File upload uses FastAPI's native `UploadFile` with multipart form, not the legacy Supabase ingest path or edge functions.

**Tech Stack:** Supabase Postgres migrations, FastAPI, Pydantic, Python `csv`/`json`/`jsonlines` stdlib + one package, React + TypeScript, OpenTelemetry, pytest, Vitest.

**Status:** Draft
**Author:** Claude (investigating-and-writing-plan skill)
**Date:** 2026-03-31

---

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The ported Inspect AI code is owned source, not a pip dependency. We copy, simplify, and modify it freely.
2. Sandbox-related functionality (`SandboxEnvironmentSpec`, `setup`, `files` on samples) is dropped entirely for this phase. We are building a dataset registry, not a sandbox execution environment.
3. The dataset registry is benchmark-scoped: each dataset belongs to a specific benchmark project via `benchmark_id`.
4. File parsing runs server-side in platform-api. The frontend uploads raw files; the backend parses them using the ported loader code.
5. The datasets page lives at `/app/agchain/datasets` and replaces the current placeholder. It follows the Models page master-detail pattern.
6. HuggingFace Hub import is included in the loader port but the frontend HF import UI is deferred to a follow-up. Phase 1 frontend supports file upload (CSV/JSON/JSONL) only.
7. All dataset writes require `require_superuser`. All reads require `require_user_auth`.
8. No edge functions created or modified.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. A superuser can upload a CSV file with columns `input`, `target`, `choices` and see a parsed preview of 5 samples.
2. After confirming the import, the dataset appears in the datasets table with correct sample count.
3. Clicking the dataset row opens the inspector showing dataset metadata and a paginated sample list.
4. A JSONL file with chat-message-format inputs (list of `{role, content}` objects) imports correctly and displays structured input in the sample viewer.
5. The field mapping form allows remapping column names (e.g., `question` → `input`, `answer` → `target`) and the preview updates accordingly.
6. All platform-api dataset endpoints emit the declared OTel traces, metrics, and structured logs.
7. All tests pass: pytest for backend, Vitest for frontend.

---

## Part 1: Inspect AI Code Integration Strategy

### What We Are Porting

The Inspect AI dataset module at `_agchain/_reference/inspect_ai/src/inspect_ai/dataset/` contains 10 source files implementing a dataset loading library. We port the core abstractions and file loaders, simplified for our use case.

### Source Files and Disposition

| Source File | Lines | Disposition | Reason |
|---|---|---|---|
| `_dataset.py` | 280 | **PORT with modifications** | Core types: `Sample`, `Dataset`, `FieldSpec`, `MemoryDataset`. Remove `sandbox`, `setup`, `files` fields from `Sample`. Remove `SandboxEnvironmentSpec` dependency. |
| `_util.py` | 250 | **PORT with modifications** | Record-to-sample conversion. Remove `read_sandbox`, `read_files`, `read_setup`. Simplify `read_input` to handle `str` and `list[dict]` without full `ChatMessage` type system. |
| `_sources/csv.py` | 80 | **PORT simplified** | CSV loader. Replace `file()` context manager with stdlib `open()` / `io.TextIOWrapper`. Drop S3/HTTPS support (local and upload streams only). Drop `fs_options`. |
| `_sources/json.py` | 90 | **PORT simplified** | JSON/JSONL loader. Same simplifications as CSV. Keep `jsonlines` dependency. |
| `_sources/hf.py` | 110 | **PORT simplified** | HuggingFace loader. Replace `mm3_hash` with `hashlib.sha256`. Replace `inspect_cache_dir` with configurable cache path. Replace `verify_required_version` with inline check. Keep lazy `datasets` import. |
| `_sources/file.py` | 30 | **PORT as-is** | Extension dispatcher. Trivial, no changes needed. |
| `_sources/example.py` | 40 | **DROP** | Loads bundled example files. Not needed — we have our own example management. |
| `_sources/util.py` | 70 | **DROP** | Resolves relative file paths in samples. Not needed — we persist parsed text, not file references. |
| `_examples/*.jsonl` | 5 files | **DROP** | Bundled example data. Not needed. |

### Internal Dependency Disposition

| Dependency | Used By | Disposition | Replacement |
|---|---|---|---|
| `_util.answer` (`answer_character`, `answer_index`) | Choice shuffling in `MemoryDataset` | **REPLACE** | Inline 10-line pure functions: `chr(65 + i)` and `ord(c) - 65` |
| `_util.metadata` (`MT`, `metadata_as`) | `Sample.metadata_as()` | **REPLACE** | Inline 15-line Pydantic validation helper |
| `_util.asyncfiles` (`is_s3_filename`) | CSV/JSON loaders | **DROP** | S3 support removed. Delete the check entirely. |
| `_util.file` (`file`, `filesystem`, `safe_filename`) | All file loaders | **REPLACE** | Use stdlib `open()` and `io.StringIO` for uploaded file streams. `safe_filename` inlined as 5-line slugify. |
| `_util.appdirs` (`inspect_cache_dir`) | HF loader | **REPLACE** | `pathlib.Path(tempfile.gettempdir()) / "agchain-datasets"` |
| `_util.error` (`pip_dependency_error`) | HF loader | **REPLACE** | Plain `ImportError("pip install datasets>=2.16.0")` |
| `_util.hash` (`mm3_hash`) | HF cache key | **REPLACE** | `hashlib.sha256(msg.encode()).hexdigest()[:32]` |
| `_util.version` (`verify_required_version`) | HF loader | **REPLACE** | 5-line `importlib.metadata.version()` + `packaging.version.Version` check |
| `_util.content` (`Content*` types) | Sample file resolution | **DROP** | File resolution dropped; multimodal content types not needed for phase 1 |
| `inspect_ai.model` (`ChatMessage*`) | `Sample.input` typing, `read_input` | **REPLACE** | Simplified: `Sample.input` is `str | list[dict[str, Any]]`. Chat messages stored as plain dicts with `role`/`content` keys. No Pydantic ChatMessage class hierarchy. |
| `inspect_ai.util` (`SandboxEnvironmentSpec`) | `Sample.sandbox` | **DROP** | Sandbox field removed from `Sample` |

### Third-Party Dependencies

| Package | Status | Notes |
|---|---|---|
| `pydantic` | Already in requirements | Used for `Sample`, `FieldSpec` models |
| `jsonlines` | **Add to requirements** | For JSONL file reading. Lightweight, pure Python. |
| `datasets` | **Optional, lazy-imported** | Only needed when `hf_dataset()` is called. Not required for CSV/JSON. |

### Target File Structure

```
services/platform-api/app/domain/agchain/dataset_loader/
├── __init__.py          # Public API: Sample, Dataset, FieldSpec, MemoryDataset,
│                        #   RecordToSample, csv_dataset, json_dataset, hf_dataset, file_dataset
├── _types.py            # Sample (no sandbox/files/setup), Dataset ABC, FieldSpec,
│                        #   MemoryDataset, RecordToSample, DatasetRecord
├── _util.py             # record_to_sample_fn, data_to_samples, read_input, read_target,
│                        #   read_choices, read_metadata, answer_character, answer_index
├── csv.py               # csv_dataset() — local files and IO streams
├── json.py              # json_dataset() — local files and IO streams, JSONL support
├── hf.py                # hf_dataset() — HuggingFace Hub with local cache
└── file.py              # file_dataset() — extension-based dispatcher
```

### Key Modifications From Inspect AI Original

1. **`Sample` model simplified:** Remove `sandbox: SandboxEnvironmentSpec | None`, `files: dict[str, str] | None`, `setup: str | None`. Keep `input`, `choices`, `target`, `id`, `metadata`. Input type becomes `str | list[dict[str, Any]]` (plain dicts, not ChatMessage classes).

2. **Loaders accept IO streams:** In addition to file paths, `csv_dataset()` and `json_dataset()` accept `io.TextIOWrapper` / `io.BytesIO` streams. This allows platform-api to pass `UploadFile.file` directly to the loader without writing to disk.

3. **No remote filesystem support:** No S3, Azure, or HTTPS URL reading. All file access uses stdlib `open()` or passed-in streams. Remote support can be added later by swapping back to `fsspec`.

4. **HuggingFace cache uses sha256:** Replace `mmh3` with `hashlib.sha256` for cache key generation. Avoids the `mmh3` C-extension dependency.

5. **No file path resolution pass:** `resolve_sample_files()` is dropped. Parsed samples contain text content only, not file references. The dataset registry stores parsed text in the database.

---

## Part 2: Full-Stack Implementation

### Manifest

#### Platform API

| Verb | Path | Action | Auth | Status |
|------|------|--------|------|--------|
| GET | `/agchain/datasets` | List datasets for the current user's benchmarks | `require_user_auth` | New |
| POST | `/agchain/datasets` | Create empty dataset (metadata only, no samples) | `require_superuser` | New |
| GET | `/agchain/datasets/{dataset_id}` | Dataset detail with sample stats | `require_user_auth` | New |
| PATCH | `/agchain/datasets/{dataset_id}` | Update dataset metadata | `require_superuser` | New |
| DELETE | `/agchain/datasets/{dataset_id}` | Delete dataset and all its samples | `require_superuser` | New |
| POST | `/agchain/datasets/import/preview` | Parse uploaded file, return sample preview (no persistence) | `require_superuser` | New |
| POST | `/agchain/datasets/import` | Parse uploaded file, create dataset + persist all samples | `require_superuser` | New |
| GET | `/agchain/datasets/{dataset_id}/samples` | Paginated sample list | `require_user_auth` | New |
| GET | `/agchain/datasets/{dataset_id}/samples/{sample_id}` | Single sample detail | `require_user_auth` | New |

#### New Endpoint Contracts

`GET /agchain/datasets`

- Auth: `require_user_auth`
- Query params: `benchmark_id` (optional UUID filter), `search` (optional text), `limit` (int, default 50), `offset` (int, default 0)
- Request: no body
- Success response: `{"items": [...], "total": int, "limit": int, "offset": int}`
- Touches: `agchain_datasets` (SELECT)

`POST /agchain/datasets`

- Auth: `require_superuser`
- Request body: `{"name": str, "slug": str, "benchmark_id": UUID, "description": str | null, "source_type": str}`
- Success response: `{"ok": true, "dataset_id": UUID}`
- Touches: `agchain_datasets` (INSERT)

`GET /agchain/datasets/{dataset_id}`

- Auth: `require_user_auth`
- Request: no body
- Success response: `{"dataset_id": UUID, "name": str, "slug": str, "benchmark_id": UUID, "description": str | null, "source_type": str, "sample_count": int, "field_spec": dict | null, "version_label": str, "status": str, "created_at": str, "updated_at": str, "stats": {"input_type_distribution": {"text": int, "chat": int}, "has_choices_count": int, "has_metadata_count": int}}`
- Touches: `agchain_datasets` (SELECT), `agchain_dataset_samples` (aggregate SELECT)

`PATCH /agchain/datasets/{dataset_id}`

- Auth: `require_superuser`
- Request body: all fields optional: `{"name": str | null, "description": str | null, "version_label": str | null, "status": str | null}`
- Success response: `{"ok": true, "dataset_id": UUID}`
- Touches: `agchain_datasets` (UPDATE)

`DELETE /agchain/datasets/{dataset_id}`

- Auth: `require_superuser`
- Request: no body
- Success response: `{"ok": true, "dataset_id": UUID}`
- Touches: `agchain_datasets` (DELETE CASCADE to `agchain_dataset_samples`)

`POST /agchain/datasets/import/preview`

- Auth: `require_superuser`
- Request: multipart form — `file` (UploadFile, required), `source_type` (str: csv/json/jsonl, required), `field_spec_json` (str, optional JSON-encoded FieldSpec overrides), `limit` (int, default 10)
- Success response: `{"preview_samples": [{"input": str | list, "target": str, "choices": list | null, "id": str | null, "metadata": dict | null}], "total_parsed": int, "detected_columns": [str], "source_type": str}`
- Touches: no database — in-memory parse only
- Note: Uses ported `csv_dataset` / `json_dataset` with IO stream passed from `UploadFile.file`

`POST /agchain/datasets/import`

- Auth: `require_superuser`
- Request: multipart form — `file` (UploadFile, required), `source_type` (str, required), `name` (str, required), `slug` (str, required), `benchmark_id` (UUID, required), `description` (str, optional), `field_spec_json` (str, optional), `auto_id` (bool, default false)
- Success response: `{"ok": true, "dataset_id": UUID, "sample_count": int}`
- Touches: `agchain_datasets` (INSERT), `agchain_dataset_samples` (batch INSERT)

`GET /agchain/datasets/{dataset_id}/samples`

- Auth: `require_user_auth`
- Query params: `limit` (int, default 50), `offset` (int, default 0), `search` (optional, matches against `input_text`)
- Success response: `{"items": [...], "total": int, "limit": int, "offset": int}`
- Touches: `agchain_dataset_samples` (SELECT with pagination)

`GET /agchain/datasets/{dataset_id}/samples/{sample_id}`

- Auth: `require_user_auth`
- Request: no body
- Success response: full sample record
- Touches: `agchain_dataset_samples` (SELECT)

#### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `agchain.datasets.list` | `agchain_datasets.py:list_datasets_route` | Measure list latency and result counts |
| Trace span | `agchain.datasets.create` | `agchain_datasets.py:create_dataset_route` | Track dataset creation |
| Trace span | `agchain.datasets.detail` | `agchain_datasets.py:get_dataset_route` | Measure detail fetch with stats aggregation |
| Trace span | `agchain.datasets.update` | `agchain_datasets.py:update_dataset_route` | Track metadata updates |
| Trace span | `agchain.datasets.delete` | `agchain_datasets.py:delete_dataset_route` | Track dataset deletion |
| Trace span | `agchain.datasets.import.preview` | `agchain_datasets.py:preview_import_route` | Measure file parse latency for preview |
| Trace span | `agchain.datasets.import` | `agchain_datasets.py:import_dataset_route` | Measure full import (parse + persist) |
| Trace span | `agchain.datasets.samples.list` | `agchain_datasets.py:list_samples_route` | Measure paginated sample fetch |
| Trace span | `agchain.datasets.samples.detail` | `agchain_datasets.py:get_sample_route` | Measure single sample fetch |
| Counter | `platform.agchain.datasets.list.count` | `agchain_datasets.py` | Count list requests |
| Counter | `platform.agchain.datasets.create.count` | `agchain_datasets.py` | Count dataset creations |
| Counter | `platform.agchain.datasets.import.count` | `agchain_datasets.py` | Count successful imports |
| Counter | `platform.agchain.datasets.import.preview.count` | `agchain_datasets.py` | Count preview requests |
| Counter | `platform.agchain.datasets.delete.count` | `agchain_datasets.py` | Count deletions |
| Counter | `platform.agchain.datasets.samples.list.count` | `agchain_datasets.py` | Count sample list requests |
| Histogram | `platform.agchain.datasets.list.duration_ms` | `agchain_datasets.py` | List latency distribution |
| Histogram | `platform.agchain.datasets.import.duration_ms` | `agchain_datasets.py` | Import latency (parse + persist) |
| Histogram | `platform.agchain.datasets.import.sample_count` | `agchain_datasets.py` | Samples-per-import distribution |
| Histogram | `platform.agchain.datasets.samples.list.duration_ms` | `agchain_datasets.py` | Sample list latency distribution |
| Structured log | `agchain.datasets.created` | `dataset_registry.py` | Audit: name, slug, benchmark_id, source_type |
| Structured log | `agchain.datasets.imported` | `dataset_registry.py` | Audit: name, source_type, sample_count, parse_duration_ms |
| Structured log | `agchain.datasets.deleted` | `dataset_registry.py` | Audit: dataset_id, name |
| Structured log | `agchain.datasets.import.preview.completed` | `dataset_registry.py` | Audit: source_type, preview_count, parse_duration_ms |

Observability attribute rules:

- Allowed attributes: `source_type`, `sample_count`, `row_count`, `total_parsed`, `preview_count`, `parse_duration_ms`, `latency_ms`, `benchmark_id`, `status`, `http.status_code`, `limit`, `offset`
- Forbidden in trace or metric attributes: `user_id`, `email`, `dataset_id`, `sample_id`, raw filenames, file content, input text, target text

#### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260331120000_agchain_datasets.sql` | Creates `agchain_datasets` and `agchain_dataset_samples` tables. See schema contract below. | No — new tables only |

##### Migration Schema Contract: `20260331120000_agchain_datasets.sql`

**Table: `agchain_datasets`**

| Column | Type | Nullable | Default | Constraint |
|--------|------|:--------:|---------|------------|
| `dataset_id` | `UUID` | NOT NULL | `gen_random_uuid()` | PRIMARY KEY |
| `benchmark_id` | `UUID` | NOT NULL | — | FK → `agchain_benchmarks(benchmark_id)` ON DELETE CASCADE |
| `name` | `TEXT` | NOT NULL | — | — |
| `slug` | `TEXT` | NOT NULL | — | — |
| `description` | `TEXT` | NULL | — | — |
| `source_type` | `TEXT` | NOT NULL | — | CHECK (`source_type IN ('csv', 'json', 'jsonl', 'huggingface', 'manual')`) |
| `sample_count` | `INTEGER` | NOT NULL | `0` | — |
| `field_spec` | `JSONB` | NULL | — | — |
| `version_label` | `TEXT` | NOT NULL | `'1.0'` | — |
| `status` | `TEXT` | NOT NULL | `'active'` | CHECK (`status IN ('active', 'archived')`) |
| `owner_user_id` | `UUID` | NOT NULL | — | FK → `auth.users(id)` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | — |

Named constraints:
- `CONSTRAINT agchain_datasets_benchmark_slug_unique UNIQUE (benchmark_id, slug)`
- `CONSTRAINT agchain_datasets_source_type_check CHECK (source_type IN ('csv', 'json', 'jsonl', 'huggingface', 'manual'))`
- `CONSTRAINT agchain_datasets_status_check CHECK (status IN ('active', 'archived'))`

**Table: `agchain_dataset_samples`**

| Column | Type | Nullable | Default | Constraint |
|--------|------|:--------:|---------|------------|
| `sample_id` | `UUID` | NOT NULL | `gen_random_uuid()` | PRIMARY KEY |
| `dataset_id` | `UUID` | NOT NULL | — | FK → `agchain_datasets(dataset_id)` ON DELETE CASCADE |
| `sample_index` | `INTEGER` | NOT NULL | — | — |
| `external_id` | `TEXT` | NULL | — | — |
| `input_text` | `TEXT` | NULL | — | — |
| `input_messages` | `JSONB` | NULL | — | — |
| `target` | `TEXT` | NULL | — | — |
| `choices` | `JSONB` | NULL | — | — |
| `metadata` | `JSONB` | NULL | — | — |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | — |

Named constraints:
- `CONSTRAINT agchain_dataset_samples_dataset_index_unique UNIQUE (dataset_id, sample_index)`

Indexes:
- `CREATE INDEX agchain_datasets_benchmark_id_idx ON agchain_datasets (benchmark_id)` — for benchmark-scoped list queries
- `CREATE INDEX agchain_dataset_samples_dataset_id_idx ON agchain_dataset_samples (dataset_id)` — for sample list queries
- `CREATE INDEX agchain_dataset_samples_input_text_gin_idx ON agchain_dataset_samples USING GIN (to_tsvector('english', coalesce(input_text, '')))` — for full-text sample search

RLS:
- Both tables: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- `service_role`: full `SELECT, INSERT, UPDATE, DELETE`
- `authenticated`: no direct access — all reads go through platform-api service_role client
- No `CREATE POLICY` for `authenticated` (unlike `agchain_model_targets` which grants column-level SELECT)

#### Edge Functions

No edge functions created or modified. File upload goes directly to platform-api via `POST /agchain/datasets/import`. This follows the locked product decision to keep all dataset logic in platform-api.

#### Frontend Surface Area

**New pages:** `0`

**New components:** `4`

| Component | File | Used by |
|-----------|------|---------|
| `AgchainDatasetsTable` | `web/src/components/agchain/datasets/AgchainDatasetsTable.tsx` | `AgchainDatasetsPage.tsx` |
| `AgchainDatasetInspector` | `web/src/components/agchain/datasets/AgchainDatasetInspector.tsx` | `AgchainDatasetsPage.tsx` |
| `AgchainDatasetsToolbar` | `web/src/components/agchain/datasets/AgchainDatasetsToolbar.tsx` | `AgchainDatasetsPage.tsx` |
| `AgchainDatasetSampleCard` | `web/src/components/agchain/datasets/AgchainDatasetSampleCard.tsx` | `AgchainDatasetInspector.tsx` |

**New hooks:** `1`

| Hook | File | Purpose |
|------|------|---------|
| `useAgchainDatasets` | `web/src/hooks/agchain/useAgchainDatasets.ts` | Full CRUD + import + sample fetching for datasets |

**New lib files:** `1`

| File | Purpose |
|------|---------|
| `web/src/lib/agchainDatasets.ts` | Types + API functions for datasets and samples |

**Modified pages:** `1`

| Page | File | What changes |
|------|------|--------------|
| `AgchainDatasetsPage` | `web/src/pages/agchain/AgchainDatasetsPage.tsx` | Replace placeholder with live master-detail page (hero section, toolbar, two-column grid with table + inspector) |

**New test files:** `4`

| File | Tests |
|------|-------|
| `services/platform-api/tests/test_agchain_datasets_routes.py` | Route handler tests for all 9 endpoints |
| `services/platform-api/tests/test_dataset_loader.py` | Unit tests for ported loader code (CSV, JSON, JSONL, FieldSpec mapping) |
| `web/src/pages/agchain/AgchainDatasetsPage.test.tsx` | Page-level render and interaction tests |
| `web/src/hooks/agchain/useAgchainDatasets.test.ts` | Hook unit tests with mocked API |

### Frontend Visual Design

The information architecture of this page derives from the Inspect AI dataset substrate, not from the Models page. The central entities are: a **Dataset** (a named, versioned collection of evaluation samples), a **Sample** (the atomic unit with `input`, `target`, `choices`, and `metadata`), and a **FieldSpec** (the column-mapping contract used to parse the source file). These three concepts drive every section in the inspector, every column in the table, and the entire import flow. The master-detail layout and AGChain card/badge/eyebrow tokens are a shell choice — they are the established way the AGChain workspace presents any registried entity. The semantics are dataset-first; the shell reuses the established pattern.

Every surface uses the same card, badge, eyebrow, and table patterns already in production.

#### Page Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [Eyebrow: "Selected AGChain project"]                           │
│  [H1: "Datasets"]                                                │
│  [Description paragraph scoped to focused benchmark]             │
│  [Hero card: rounded-3xl border bg-card/70 shadow-sm]            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  [Toolbar: Search input  |  "Import Dataset" button → opens sheet│
│   rounded-3xl border bg-card/70]                                 │
└──────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────┬──────────────────────────────┐
│  DatasetsTable                    │  DatasetInspector             │
│  ┌─────────────────────────────┐  │  ┌────────────────────────┐  │
│  │ Name | Source | Samples |   │  │  │ [Dataset name]         │  │
│  │      | Type   | Count   |   │  │  │ [Source badge]         │  │
│  │------|--------|---------|   │  │  │ [Description]          │  │
│  │ row  │ CSV    │ 1,204   │◄─┤  │  ├────────────────────────┤  │
│  │ row  │ JSONL  │ 500     │  │  │  │ Stats                  │  │
│  │ row  │ JSON   │ 89      │  │  │  │ • 1,204 samples        │  │
│  │      │        │         │  │  │  │ • 1,180 text / 24 chat │  │
│  │      │        │         │  │  │  │ • 890 with choices     │  │
│  └─────────────────────────────┘  │  ├────────────────────────┤  │
│  [xl:grid-cols-[minmax(0,1.55fr)  │  │ Field Mapping          │  │
│   _minmax(24rem,0.95fr)]]         │  │ input → "question"     │  │
│                                   │  │ target → "answer"      │  │
│                                   │  ├────────────────────────┤  │
│                                   │  │ Sample Preview (3)     │  │
│                                   │  │ ┌──────────────────┐   │  │
│                                   │  │ │ SampleCard #1    │   │  │
│                                   │  │ │ Input: "What..." │   │  │
│                                   │  │ │ Target: "Paris"  │   │  │
│                                   │  │ │ Choices: A,B,C,D │   │  │
│                                   │  │ └──────────────────┘   │  │
│                                   │  │ [Browse all samples →] │  │
│                                   │  ├────────────────────────┤  │
│                                   │  │ [Edit] [Delete]        │  │
│                                   │  └────────────────────────┘  │
└───────────────────────────────────┴──────────────────────────────┘
```

#### DatasetsTable Columns

| Column | Type | Sortable | Notes |
|--------|------|----------|-------|
| Name | text | yes | Dataset name, primary identifier |
| Source | badge | no | `CSV` / `JSON` / `JSONL` / `HuggingFace` — colored badge chip |
| Samples | number | yes | Sample count, right-aligned |
| Version | text | no | Version label (e.g. "1.0") |
| Status | badge | no | `active` (green) / `archived` (gray) |
| Created | relative time | yes | "2 hours ago" format |

Row click selects for inspector. Selected row gets `bg-accent/50` highlight (same as Models table).

#### DatasetInspector Sections

1. **Header:** Dataset name (h2), source type badge, description text
2. **Stats card:** Sample count, input type distribution (text vs chat message), samples with choices, samples with metadata
3. **Field mapping:** If a custom FieldSpec was used, display the column mapping. If defaults, show "Default mapping"
4. **Sample preview:** First 3 samples rendered as compact `AgchainDatasetSampleCard` components. Each card shows truncated input (2 lines), target, choice count badge
5. **Actions:** "Browse all samples" link (opens expanded sample list in inspector), "Edit" button (opens edit sheet), "Delete" button (confirmation dialog)

#### Import Dataset Sheet

Right-side slide-over panel (same pattern as Models "Add Model Target" sheet):

```
┌─ Import Dataset ─────────────────────────┐
│                                           │
│  Source Type: [CSV ▾]                     │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │         Drag & drop file here       │  │
│  │     or click to browse              │  │
│  │     CSV, JSON, JSONL up to 50MB     │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  ── Field Mapping ──────────────────────  │
│  Input column:   [input       ]           │
│  Target column:  [target      ]           │
│  Choices column: [choices     ]           │
│  ID column:      [id          ]           │
│  Metadata fields:[             ] (CSV)    │
│                                           │
│  ── Dataset Info ───────────────────────  │
│  Name:           [                 ]      │
│  Slug:           [                 ]      │
│  Description:    [                 ]      │
│                                           │
│  [Preview]                                │
│  ┌─────────────────────────────────────┐  │
│  │ Parsed 1,204 samples               │  │
│  │ Detected columns: question, answer, │  │
│  │   option_a, option_b, option_c      │  │
│  │                                     │  │
│  │ Sample 1: "What is the capital..."  │  │
│  │ Sample 2: "Which element has..."    │  │
│  │ Sample 3: "In what year did..."     │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  [Cancel]              [Import Dataset]   │
└───────────────────────────────────────────┘
```

#### Sample Browser (Inspector Expanded View)

When "Browse all samples" is clicked, the inspector switches to a full sample list view:

- Paginated table: Index, Input (truncated), Target, Choices (count badge), ID
- Click a sample row to expand inline with full content
- Search input for filtering by input text
- "Back to overview" link to return to the inspector summary
- Pagination controls: prev/next, page size selector (25/50/100)

### Locked Inventory Counts

#### Database

- New migrations: `1`
- New tables: `2` (`agchain_datasets`, `agchain_dataset_samples`)
- Modified existing migrations: `0`

#### Backend

- New backend source files: `9` total
  - Route file: `1` (`agchain_datasets.py`)
  - Domain registry: `1` (`dataset_registry.py`)
  - Loader package: `7` (`__init__.py`, `_types.py`, `_util.py`, `csv.py`, `json.py`, `hf.py`, `file.py`)
- Modified existing files: `2` (`main.py` router registration, `domain/agchain/__init__.py` exports)

#### Frontend

- New top-level pages/routes: `0`
- Modified existing pages: `1` (`AgchainDatasetsPage.tsx`)
- New visual components: `4`
- New hooks: `1`
- New lib files: `1`

#### Tests

- New backend test modules: `2`
- New frontend test modules: `2`
- Modified existing test modules: `0`

### Locked File Inventory

#### New files

**Backend — Ported loader library:**
- `services/platform-api/app/domain/agchain/dataset_loader/__init__.py`
- `services/platform-api/app/domain/agchain/dataset_loader/_types.py`
- `services/platform-api/app/domain/agchain/dataset_loader/_util.py`
- `services/platform-api/app/domain/agchain/dataset_loader/csv.py`
- `services/platform-api/app/domain/agchain/dataset_loader/json.py`
- `services/platform-api/app/domain/agchain/dataset_loader/hf.py`
- `services/platform-api/app/domain/agchain/dataset_loader/file.py`

**Backend — Registry and routes:**
- `services/platform-api/app/domain/agchain/dataset_registry.py`
- `services/platform-api/app/api/routes/agchain_datasets.py`

**Database:**
- `supabase/migrations/20260331120000_agchain_datasets.sql`

**Frontend:**
- `web/src/lib/agchainDatasets.ts`
- `web/src/hooks/agchain/useAgchainDatasets.ts`
- `web/src/components/agchain/datasets/AgchainDatasetsTable.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetInspector.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetsToolbar.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetSampleCard.tsx`

**Tests:**
- `services/platform-api/tests/test_agchain_datasets_routes.py`
- `services/platform-api/tests/test_dataset_loader.py`
- `web/src/pages/agchain/AgchainDatasetsPage.test.tsx`
- `web/src/hooks/agchain/useAgchainDatasets.test.ts`

#### Modified files

- `services/platform-api/app/main.py` — add `agchain_datasets.router` (position 5l, after benchmarks)
- `services/platform-api/app/domain/agchain/__init__.py` — export dataset registry functions
- `web/src/pages/agchain/AgchainDatasetsPage.tsx` — replace placeholder with live implementation

### Explicit Risks Accepted In This Plan

1. **All samples materialized in memory during import.** The ported loader reads the entire file into a `list[Sample]` before persisting. For files with >100k samples, this may cause memory pressure. Accepted for phase 1 because evaluation datasets are typically <50k samples. A streaming insert path can be added later.
2. **HuggingFace import has no frontend UI in this phase.** The `hf_dataset()` loader is ported and tested, but the import sheet only supports file upload. HF import can be triggered via API directly or added to the UI in a follow-up.
3. **No dataset versioning workflow in this phase.** The `version_label` field exists but there is no version-create or version-compare flow. Datasets are currently immutable after import — to "update" a dataset, delete and re-import.
4. **50MB file size limit.** FastAPI's default `UploadFile` buffering is used. Files over 50MB should use a different upload mechanism in a future phase.

### Completion Criteria

The work is complete only when all of the following are true:

1. The ported loader library at `dataset_loader/` can parse CSV, JSON, and JSONL files with default and custom `FieldSpec` mappings, producing correct `Sample` objects. Unit tests prove this.
2. The locked API surface (9 endpoints) exists exactly as specified.
3. The locked traces (9), counters (6), histograms (4), and structured logs (4) exist exactly as specified.
4. The datasets page renders the master-detail layout with table, inspector, and import sheet.
5. The import preview flow parses a file and displays samples without persisting.
6. The import commit flow creates a dataset and persists all samples to the database.
7. The inspector shows dataset stats and a paginated sample browser.
8. The inventory counts in this plan match the actual set of created and modified files.
9. All pytest and Vitest tests pass.

---

## Tasks

### Task 1: Port Inspect AI dataset loader — types module

**File(s):** `services/platform-api/app/domain/agchain/dataset_loader/_types.py`

**Step 1:** Create the `_types.py` file with `Sample` (Pydantic BaseModel — fields: `input: str | list[dict[str, Any]]`, `choices: list[str] | None`, `target: str | list[str]`, `id: int | str | None`, `metadata: dict[str, Any] | None`), `DatasetRecord` (type alias for `dict[str, Any]`), `RecordToSample` (callable type alias), `FieldSpec` (Pydantic BaseModel with field-name defaults), `Dataset` (ABC extending `Sequence[Sample]`), `MemoryDataset` (concrete implementation with `filter`, `shuffle`, `shuffle_choices`, `sort`, slice support).

**Step 2:** Include inline `answer_character(index: int) -> str` and `answer_index(char: str) -> int` helpers for choice shuffling.

**Step 3:** Include inline `metadata_as(metadata: dict, cls: Type[T]) -> T` helper for typed metadata casting.

**Test command:** `cd services/platform-api && python -m pytest tests/test_dataset_loader.py::test_sample_creation tests/test_dataset_loader.py::test_memory_dataset_operations -v`
**Expected output:** All sample creation, filtering, shuffling, and slicing tests pass.

**Commit:** `feat(agchain): port Inspect AI dataset loader types — Sample, Dataset, FieldSpec, MemoryDataset`

---

### Task 2: Port Inspect AI dataset loader — conversion utilities

**File(s):** `services/platform-api/app/domain/agchain/dataset_loader/_util.py`

**Step 1:** Port `record_to_sample_fn(sample_fields)` — the 3-tier dispatch (None → default FieldSpec, FieldSpec → declarative mapping, RecordToSample → passthrough).

**Step 2:** Port field readers: `read_input` (handle str and list-of-dicts), `read_target` (normalize to str or list[str]), `read_choices` (parse comma-separated, list, or scalar), `read_metadata` (list of field names or Pydantic model).

**Step 3:** Port `data_to_samples(data, record_to_sample, auto_id)` — batch conversion with auto-ID support.

**Test command:** `cd services/platform-api && python -m pytest tests/test_dataset_loader.py::test_field_mapping tests/test_dataset_loader.py::test_custom_record_to_sample -v`
**Expected output:** Field mapping with default names, custom names, and custom callables all produce correct Samples.

**Commit:** `feat(agchain): port dataset loader conversion utilities — FieldSpec mapping, field readers`

---

### Task 3: Port Inspect AI dataset loader — CSV and JSON loaders

**File(s):**
- `services/platform-api/app/domain/agchain/dataset_loader/csv.py`
- `services/platform-api/app/domain/agchain/dataset_loader/json.py`
- `services/platform-api/app/domain/agchain/dataset_loader/file.py`

**Step 1:** Port `csv_dataset()` — accept `str | IO` as first argument. Use stdlib `csv.DictReader`. Drop `fs_options`, S3 support. Keep `dialect`, `encoding`, `fieldnames`, `delimiter` options.

**Step 2:** Port `json_dataset()` — accept `str | IO` as first argument. Auto-detect JSONL vs JSON by extension (for file paths) or explicit `format` param (for streams). Use `jsonlines` for JSONL, `json.load` for JSON.

**Step 3:** Port `file_dataset()` — extension dispatcher to csv or json. No changes needed beyond import paths.

**Step 4:** Create `__init__.py` exporting the public API.

**Step 5:** Add `jsonlines` to `services/platform-api/requirements.txt`.

**Test command:** `cd services/platform-api && python -m pytest tests/test_dataset_loader.py::test_csv_loader tests/test_dataset_loader.py::test_json_loader tests/test_dataset_loader.py::test_jsonl_loader tests/test_dataset_loader.py::test_file_dispatcher -v`
**Expected output:** All file format tests pass, including stream-based loading.

**Commit:** `feat(agchain): port dataset loader CSV, JSON, JSONL loaders with stream support`

---

### Task 4: Port Inspect AI dataset loader — HuggingFace loader

**File(s):** `services/platform-api/app/domain/agchain/dataset_loader/hf.py`

**Step 1:** Port `hf_dataset()` with lazy `datasets` import. Replace `mm3_hash` with `hashlib.sha256`. Replace `inspect_cache_dir` with `Path(tempfile.gettempdir()) / "agchain-datasets"`. Replace `verify_required_version` with inline `importlib.metadata.version` check. Replace `pip_dependency_error` with plain `ImportError`.

**Step 2:** Write tests that mock the `datasets` library to verify cache key generation, load-from-disk path, and sample conversion.

**Test command:** `cd services/platform-api && python -m pytest tests/test_dataset_loader.py::test_hf_loader -v`
**Expected output:** HF loader tests pass with mocked datasets library.

**Commit:** `feat(agchain): port HuggingFace dataset loader with simplified caching`

---

### Task 5: Database migration — agchain_datasets and agchain_dataset_samples

**File(s):** `supabase/migrations/20260331120000_agchain_datasets.sql`

**Step 1:** Write the migration creating `agchain_datasets` table: `dataset_id` (UUID PK), `benchmark_id` (UUID FK → `agchain_benchmarks.benchmark_id` ON DELETE CASCADE), `name` (TEXT NOT NULL), `slug` (TEXT NOT NULL), `description` (TEXT), `source_type` (TEXT NOT NULL), `sample_count` (INTEGER DEFAULT 0), `field_spec` (JSONB), `version_label` (TEXT DEFAULT '1.0'), `status` (TEXT DEFAULT 'active'), `owner_user_id` (UUID FK → auth.users), `created_at` (TIMESTAMPTZ DEFAULT now()), `updated_at` (TIMESTAMPTZ DEFAULT now()). UNIQUE constraint on `(benchmark_id, slug)`.

**Step 2:** Write `agchain_dataset_samples` table: `sample_id` (UUID PK), `dataset_id` (UUID FK → `agchain_datasets.dataset_id` ON DELETE CASCADE), `sample_index` (INTEGER NOT NULL), `external_id` (TEXT), `input_text` (TEXT), `input_messages` (JSONB), `target` (TEXT), `choices` (JSONB), `metadata` (JSONB), `created_at` (TIMESTAMPTZ DEFAULT now()). UNIQUE on `(dataset_id, sample_index)`. GIN index on `input_text` for full-text search using `to_tsvector('english', coalesce(input_text, ''))`.

**Step 3:** Enable RLS on both tables. Grant full CRUD to `service_role`. No direct `authenticated` access (all access via platform-api).

**Test command:** `cd supabase && supabase db reset` (or apply migration to dev branch)
**Expected output:** Migration applies cleanly, tables exist with correct schema.

**Commit:** `feat(agchain): add agchain_datasets and agchain_dataset_samples tables`

---

### Task 6: Domain module — dataset_registry.py

**File(s):** `services/platform-api/app/domain/agchain/dataset_registry.py`

**Step 1:** Implement `list_datasets(user_id, benchmark_id, search, limit, offset)` — query `agchain_datasets` with optional benchmark filter and text search, return paginated result.

**Step 2:** Implement `create_dataset(owner_user_id, benchmark_id, name, slug, description, source_type)` — insert into `agchain_datasets`, return dataset_id. Validate slug uniqueness within benchmark.

**Step 3:** Implement `get_dataset_detail(dataset_id)` — fetch dataset + aggregate stats from samples (input type distribution, choices count, metadata count).

**Step 4:** Implement `update_dataset(dataset_id, fields)` — partial update of mutable fields.

**Step 5:** Implement `delete_dataset(dataset_id)` — delete dataset (CASCADE deletes samples).

**Step 6:** Implement `preview_import(file_stream, source_type, field_spec_json, limit)` — use ported loader to parse file, return preview samples + detected columns + total count. No database writes.

**Step 7:** Implement `import_dataset(file_stream, source_type, name, slug, benchmark_id, owner_user_id, description, field_spec_json, auto_id)` — parse file, create dataset record, batch-insert all samples, update `sample_count`. Use a transaction for atomicity.

**Step 8:** Implement `list_samples(dataset_id, limit, offset, search)` and `get_sample(dataset_id, sample_id)`.

**Step 9:** Add structured logging for create, import, delete, and preview events.

**Test command:** `cd services/platform-api && python -m pytest tests/test_agchain_datasets_routes.py -v`
**Expected output:** All domain function tests pass.

**Commit:** `feat(agchain): dataset registry domain module — CRUD, import, preview, sample access`

---

### Task 7: Platform API routes — agchain_datasets.py

**File(s):**
- `services/platform-api/app/api/routes/agchain_datasets.py`
- `services/platform-api/app/main.py`

**Step 1:** Create route file with `router = APIRouter(prefix="/agchain/datasets", tags=["agchain-datasets"])`. Declare all OTel instruments: tracer, meter, 6 counters, 4 histograms.

**Step 2:** Implement all 9 route handlers following the inline OTel pattern from `agchain_models.py`: `list_datasets_route`, `create_dataset_route`, `get_dataset_route`, `update_dataset_route`, `delete_dataset_route`, `preview_import_route`, `import_dataset_route`, `list_samples_route`, `get_sample_route`.

**Step 3:** Use `UploadFile` from FastAPI for the multipart import/preview endpoints. Use `Form(...)` for non-file fields in multipart requests.

**Step 4:** Register router in `main.py` at position 5l (after `agchain_benchmarks`).

**Step 5:** Export dataset domain functions from `domain/agchain/__init__.py`.

**Test command:** `cd services/platform-api && python -m pytest tests/test_agchain_datasets_routes.py -v`
**Expected output:** All route tests pass, including import preview and full import.

**Commit:** `feat(agchain): platform API routes for datasets — 9 endpoints with full OTel instrumentation`

---

### Task 8: Frontend lib — agchainDatasets.ts

**File(s):** `web/src/lib/agchainDatasets.ts`

**Step 1:** Define TypeScript types: `AgchainDataset`, `AgchainDatasetSample`, `AgchainDatasetDetail`, `AgchainDatasetStats`, `AgchainDatasetImportPreview`, `AgchainDatasetWrite`, `AgchainFieldSpec`.

**Step 2:** Implement API functions using `platformApiFetch`: `fetchAgchainDatasets(benchmarkId, search, limit, offset)`, `createAgchainDataset(data)`, `fetchAgchainDatasetDetail(datasetId)`, `updateAgchainDataset(datasetId, data)`, `deleteAgchainDataset(datasetId)`, `previewDatasetImport(file, sourceType, fieldSpec)`, `importDataset(file, data)`, `fetchDatasetSamples(datasetId, limit, offset, search)`, `fetchDatasetSample(datasetId, sampleId)`.

**Step 3:** Use `FormData` for the multipart import/preview functions.

**Test command:** `cd web && npx vitest run src/lib/agchainDatasets.test.ts` (if test file exists)
**Expected output:** Type-safe API functions compile without errors.

**Commit:** `feat(agchain): frontend dataset types and API client`

---

### Task 9: Frontend hook — useAgchainDatasets.ts

**File(s):** `web/src/hooks/agchain/useAgchainDatasets.ts`

**Step 1:** Implement hook following `useAgchainModels` pattern. State: `items`, `selectedDatasetId`, `selectedDataset`, `samples`, `listLoading`, `detailLoading`, `samplesLoading`, `importing`, `error`.

**Step 2:** Expose CRUD operations: `createDataset`, `updateSelectedDataset`, `deleteSelectedDataset`.

**Step 3:** Expose import operations: `previewImport(file, sourceType, fieldSpec)` → returns preview, `importDataset(file, data)` → creates and reloads list.

**Step 4:** Expose sample browsing: `fetchSamples(limit, offset, search)`, `selectDataset(id)` triggers detail + first page of samples.

**Step 5:** Auto-fetch dataset list on mount (with benchmark_id from `useAgchainProjectFocus`).

**Test command:** `cd web && npx vitest run src/hooks/agchain/useAgchainDatasets.test.ts`
**Expected output:** Hook tests pass with mocked API responses.

**Commit:** `feat(agchain): useAgchainDatasets hook — CRUD, import, sample browsing`

---

### Task 10: Frontend components — DatasetsTable, Toolbar, SampleCard

**File(s):**
- `web/src/components/agchain/datasets/AgchainDatasetsTable.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetsToolbar.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetSampleCard.tsx`

**Step 1:** Build `AgchainDatasetsTable` following `AgchainModelsTable` pattern. HTML table with 6 columns (Name, Source, Samples, Version, Status, Created). Row click calls `onSelect(datasetId)`. Selected row highlight. Loading skeleton.

**Step 2:** Build `AgchainDatasetsToolbar` following `AgchainModelsToolbar` pattern. Search input + "Import Dataset" button. Button opens a Sheet (slide-over) containing: source type selector, file drop zone (`<input type="file" accept=".csv,.json,.jsonl">`), field mapping form (5 inputs for FieldSpec columns), dataset info form (name, slug, description), preview button + preview card, import button.

**Step 3:** Build `AgchainDatasetSampleCard` — compact card showing truncated input (2 lines via `line-clamp-2`), target text, choices count badge. Used in inspector preview and sample browser.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainDatasetsPage.test.tsx`
**Expected output:** Component render tests pass.

**Commit:** `feat(agchain): dataset table, toolbar with import sheet, and sample card components`

---

### Task 11: Frontend component — DatasetInspector

**File(s):** `web/src/components/agchain/datasets/AgchainDatasetInspector.tsx`

**Step 1:** Build inspector with two views toggled by local state: **Overview** and **Samples**.

**Step 2:** Overview view: header (name, source badge, description), stats card (sample count, input type distribution, choices count, metadata count), field mapping display, first 3 samples as `AgchainDatasetSampleCard`, "Browse all samples" button, "Edit" and "Delete" action buttons.

**Step 3:** Samples view: "Back to overview" link, search input, paginated table (Index, Input truncated, Target, Choices badge, ID), click to expand inline, prev/next pagination controls with page size selector.

**Step 4:** Empty state when no dataset selected: "Select a dataset" placeholder card.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainDatasetsPage.test.tsx`
**Expected output:** Inspector render and interaction tests pass.

**Commit:** `feat(agchain): dataset inspector with overview, stats, and sample browser`

---

### Task 12: Replace placeholder DatasetsPage with live implementation

**File(s):** `web/src/pages/agchain/AgchainDatasetsPage.tsx`

**Step 1:** Replace the `AgchainSectionPage` placeholder with the full page following `AgchainModelsPage` pattern: project focus guard, hero section, toolbar, two-column grid (table + inspector).

**Step 2:** Wire `useAgchainProjectFocus` for benchmark context and `useAgchainDatasets` for all data operations.

**Step 3:** Connect all components: table → inspector selection, toolbar → import flow, inspector → sample browsing.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainDatasetsPage.test.tsx`
**Expected output:** Full page integration tests pass.

**Commit:** `feat(agchain): replace datasets placeholder with live master-detail page`

---

### Task 13: Backend test suite

**File(s):**
- `services/platform-api/tests/test_dataset_loader.py`
- `services/platform-api/tests/test_agchain_datasets_routes.py`

**Step 1:** Write loader unit tests: CSV with default fields, CSV with custom FieldSpec, CSV with custom RecordToSample, JSON array, JSONL, stream-based loading, choice shuffling with target remapping, auto-ID, empty rows filtered, malformed input handling.

**Step 2:** Write route integration tests: list (empty, with data, filtered by benchmark), create, detail with stats, update, delete, import preview (CSV, JSONL), full import, sample list with pagination, sample detail, auth enforcement (user vs superuser).

**Test command:** `cd services/platform-api && python -m pytest tests/test_dataset_loader.py tests/test_agchain_datasets_routes.py -v`
**Expected output:** All tests pass.

**Commit:** `test(agchain): dataset loader unit tests and route integration tests`

---

### Task 14: Frontend test suite

**File(s):**
- `web/src/pages/agchain/AgchainDatasetsPage.test.tsx`
- `web/src/hooks/agchain/useAgchainDatasets.test.ts`

**Step 1:** Write page tests: renders hero and table, shows focus guard when no project, selecting a row shows inspector, import sheet opens and closes.

**Step 2:** Write hook tests: fetches datasets on mount, handles create/update/delete, handles import preview and full import, fetches samples with pagination.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainDatasetsPage.test.tsx src/hooks/agchain/useAgchainDatasets.test.ts`
**Expected output:** All tests pass.

**Commit:** `test(agchain): datasets page and hook tests`
