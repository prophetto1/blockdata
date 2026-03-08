---
title: "Orchestrator Comparison Analysis"
description: "Date: 2026-02-28"
---# Orchestrator Comparison Analysis

Date: 2026-02-28

## Context

Phase 1 delivered: Kestra plugin catalog sync (821 plugins with JSON Schemas), service registry (12 functions), integration catalog UI. Phase 2 needs an execution engine that turns flow definitions into running pipelines.

The core question: build our own orchestration layer (Deno edge functions + FastAPI worker) or adopt an existing orchestrator (Windmill, Mage, Dagster, Prefect)?

---

## Foundational Finding: Kestra's 900+ Plugins Are JVM-Locked

Every Kestra plugin is a Java class loaded via classloader, executed in-process via `task.run(runContext)`. There is no per-plugin HTTP API. The REST API operates at the flow level — you submit a whole flow, Kestra runs it internally.

### What IS Portable from Kestra

| Surface | Access | Usable from TS/Python? |
|---|---|---|
| REST API: `POST /executions/{ns}/{id}` | Submit flow YAML, Kestra runs end-to-end | Yes — black-box executor |
| REST API: `GET /plugins/schemas/{type}` | JSON Schema Draft 7 per plugin | Yes — already synced to `integration_catalog_items` |
| REST API: `GET /plugins` | List all 900+ plugins with metadata | Yes — already synced in Phase 1 |
| Script TaskRunner (Docker/Process) | `AbstractExecScript` → Docker or Process execution | Yes — portable pattern |

### Most Plugins Are Thin Wrappers

Tracing the source at `E:\kestra\` reveals the typical plugin is ~50-200 lines of Java that:
1. Reads config properties from YAML (5-10 fields)
2. Makes 1-3 HTTP/SDK calls to an external service (BigQuery, S3, Slack, etc.)
3. Returns results as an Output object

The external service does the real work. "Porting" means rewriting the glue layer — not reimplementing BigQuery.

### Plugin Families (~30 families cover 821 plugins)

| Family | Est. Count | Porting Complexity |
|--------|-----------|-------------------|
| Scripts (Python, Shell, Node, R) | ~50 | Low — portable pattern already exists |
| HTTP/REST | ~30 | Low — fetch/axios calls |
| SQL databases | ~60 | Medium — different drivers per DB |
| Cloud storage (S3, GCS, Azure) | ~40 | Medium — SDK calls |
| Messaging (Slack, Email, Teams) | ~30 | Low — HTTP APIs |
| Git operations | ~15 | Low — shell commands |
| Data transforms (dbt, dlt) | ~25 | Medium — CLI wrappers |
| Core flow control (Log, If, Switch, ForEach) | ~20 | Low — pure logic |
| Remaining (Kafka, Elasticsearch, etc.) | ~550 | Varies — mostly HTTP/SDK wrappers |

---

## Candidate Orchestrators

### 1. Kestra (current)
- **Language**: Java (Micronaut)
- **License**: Apache 2.0
- **Plugins**: 900+ (all JVM-locked)
- **Status**: Running on Docker locally (port 8080)
- **Verdict**: Excellent catalog + schemas. Unusable as plugin runtime for our stack. Use as spec source only.

### 2. Windmill
- **Language**: Rust server, polyglot workers (TypeScript, Python, Go, Bash, SQL, PHP, Rust, Docker)
- **License**: AGPLv3 (copyleft) — commercial license available
- **Hub scripts**: 300+
- **Status**: Running on Docker locally (port 80)
- **Strengths**:
  - Polyglot execution — each task picks its own language. HTTP plugins → TypeScript. Data pipelines → Python. Shell wrappers → Bash.
  - Script-as-task model matches the porting pattern perfectly
  - Built-in flow builder, scheduling, approval steps, webhooks
  - LSP + debugger for in-browser script editing
  - Workers handle isolation (PID namespace, Docker socket)
- **Weakness**: AGPLv3 means platform code touching Windmill over network must be open-sourced. Commercial license needed for platform play.

### 3. Mage AI
- **Language**: Python
- **License**: Apache 2.0
- **Integrations**: 60+ built-in, extensible via custom blocks
- **Status**: Running on GCP Cloud Run (`mage-ai-oss`)
- **Strengths**:
  - Already primary reference repo (`ref-repos/mage-ai/`)
  - Block model = natural target for plugin ports
  - Notebook-style editor, data preview, DAG viz
  - Apache 2.0 — no license concerns
  - Already deployed and running
- **Weakness**: Python-only blocks. Every ported plugin must be Python regardless of natural fit.

### 4. Dagster
- **Language**: Python
- **License**: Apache 2.0
- **Integrations**: 60+ in OSS
- **Status**: Running on GCP Cloud Run (`dagster-webserver`)
- **Strengths**:
  - Asset-centric model (cleaner for data pipelines than flow-centric)
  - Source already cloned (`ref-repos/dagster/`)
  - GraphQL API, full web UI
  - Strong typing, testability
- **Weakness**: Python-only. Steeper learning curve. Cloud features closed-source (separate repo).

### 5. Prefect
- **Language**: Python (FastAPI server)
- **License**: Apache 2.0
- **Integrations**: 300+ (all pip packages)
- **Strengths**: Largest portable connector library. Tasks are `@task`-decorated functions. Every connector is readable Python.
- **Weakness**: Python-only. Not currently deployed or cloned.

### 6. Build Our Own (Phase 2 plan as written)
- **Language**: Deno (orchestration) + Python (execution)
- **License**: Ours
- **Strengths**: Total control, fits existing Supabase architecture, no external dependency.
- **Weakness**: Weeks of work to build what existing tools provide. DAG engine, state machine, dispatcher, scheduling, log streaming — all from scratch.

---

## What Changes Per Choice

### If adopting Windmill or Mage as orchestrator

These Phase 2 components become unnecessary:

| Component | Status |
|-----------|--------|
| `supabase/functions/_shared/dag.ts` | Replaced by orchestrator's DAG engine |
| `supabase/functions/_shared/yaml_parser.ts` | Replaced by orchestrator's flow parser |
| `supabase/functions/_shared/task_resolver.ts` | Replaced by orchestrator's task routing |
| `supabase/functions/executions/index.ts` | Replaced by orchestrator's execution API |
| `supabase/functions/execute-task/index.ts` | Replaced by orchestrator's dispatcher |
| `migration 060_executions.sql` | Replaced by orchestrator's execution tables |
| `services/pipeline-worker/` | Replaced by orchestrator's workers |

What stays regardless:
- `integration_catalog_items` — the 821-plugin porting checklist
- `service_registry` + `service_functions` — where ported plugins register
- `admin-integration-catalog` edge function — catalog sync + tracking UI
- `admin-services` edge function — registry CRUD
- `flow_sources` table — YAML storage (may proxy to orchestrator)

### Repo structure with external orchestrator

```
services/
├── conversion-service/     ← stays (docling, standalone)
├── uppy-companion/         ← stays (file upload, standalone)
│   NO pipeline-worker/     ← orchestrator handles execution
│
supabase/functions/
├── admin-integration-catalog/  ← stays (catalog sync)
├── admin-services/             ← stays (registry CRUD)
├── flows/                      ← repurposed: proxy to orchestrator API
│   NO executions/              ← orchestrator owns execution state
│   NO execute-task/            ← orchestrator dispatches tasks
```

### Repo structure building our own

```
services/
├── conversion-service/
├── uppy-companion/
└── pipeline-worker/        ← FastAPI, plugin families as modules
    └── app/plugins/        ← scripts.py, http.py, sql.py, etc.

supabase/functions/
├── executions/             ← orchestration (DAG, state, dispatch)
├── execute-task/           ← per-task dispatcher
├── _shared/dag.ts          ← Kahn's + DFS cycle detection
├── _shared/yaml_parser.ts  ← js-yaml wrapper
├── _shared/task_resolver.ts ← three-path resolution
```

---

## Porting Strategy (applies regardless of orchestrator choice)

### The Loop

1. Read plugin's JSON Schema from `integration_catalog_items` (already synced)
2. Read Kestra Java source at `E:\kestra\` for behavior reference
3. Write equivalent in target language (Python block / Windmill script / FastAPI endpoint)
4. Register as `service_function` with matching `parameter_schema`
5. Map `integration_catalog_items` entry to new function (existing mapping UI)

### Priority Order

1. **Script plugins** (Python, Shell, Node) — core use case, portable pattern
2. **HTTP/REST** — thin wrappers, quick wins
3. **Database connectors** — SQL drivers
4. **Cloud storage** — SDK calls
5. **Messaging** — HTTP APIs
6. **Everything else** — as demand dictates

### Realistic Pace

821 plugins cluster into ~30 families sharing ~80% code. Estimate: 50-100 distinct implementations cover all 821. Per family: 1-3 days for initial implementation + tests.

---

## Comparison Matrix

| Criterion | Build Own | Windmill | Mage | Dagster | Prefect |
|-----------|-----------|----------|------|---------|---------|
| License | Ours | AGPLv3 ⚠️ | Apache 2.0 | Apache 2.0 | Apache 2.0 |
| Polyglot execution | Python only (FastAPI) | TS/Py/Go/Bash/SQL/Rust | Python only | Python only | Python only |
| Time to working DAG | Weeks | Days | Days | Days | Days |
| Control | Total | Medium | High (have source) | High (have source) | Medium |
| Already deployed | No | Docker local | GCP Cloud Run | GCP Cloud Run | No |
| Source available | N/A | `e:\windmill\` | `ref-repos/mage-ai/` | `ref-repos/dagster/` | No |
| Plugin porting target | FastAPI endpoints | Windmill scripts | Mage blocks | Dagster ops/assets | Prefect tasks |
| Built-in connectors | 0 | 300+ | 60+ | 60+ | 300+ |
| Scheduling | Build from scratch | Built-in | Built-in | Built-in | Built-in |
| Visual flow builder | Build from scratch | Built-in | Built-in | No (code-only) | No (code-only) |

---

## Recommendation

**Short answer:** Mage AI if license matters. Windmill if polyglot matters more than license.

**Longer answer:**

- **Windmill** is the technical best fit — polyglot workers mean each ported plugin uses whatever language is natural. But AGPLv3 is a hard constraint for a commercial platform unless you buy the commercial license.

- **Mage AI** is the pragmatic best fit — Apache 2.0, already deployed, already your primary reference, Python-native (same as dlt/dbt). Python-only blocks are the main limitation.

- **Building your own** only makes sense if you need execution semantics none of these provide, or if you want zero external runtime dependencies. The Phase 2 plan is sound (with the 8 amendments) but it's weeks of work to replicate what Mage/Windmill already do.

- **Kestra stays as the spec source** regardless — the 821 plugin schemas in `integration_catalog_items` drive the porting checklist no matter which runtime executes them.

---

## Long-Term Vision

Kestra is a transitional reference, not a permanent dependency. The goal:

1. Sync Kestra's 821 plugin schemas (done — Phase 1)
2. Port plugin implementations family-by-family into chosen runtime
3. Track porting progress via `integration_catalog_items` → `service_functions` mapping
4. As each family gets ported, that portion of the catalog becomes natively executable
5. Kestra dependency shrinks to zero over time

The infrastructure for this already exists. Phase 1 built the checklist. The chosen orchestrator provides the runtime. The porting work is the remaining effort.
