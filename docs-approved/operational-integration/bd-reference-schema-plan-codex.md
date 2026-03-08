# BD Reference Schema + Operational Boundary Plan

## Context

The project needs a hard boundary between:

- Kestra-derived reference structures that must stay structurally exact
- BlockData operational tables, handlers, APIs, and frontend paths that must remain free to evolve

Without that boundary, every attempt to "adapt" Kestra tables inside the main app schema creates drift. The result is confusion about what is contract data, what is app-owned data, and what is safe to change.

This plan creates that boundary first. It does not rename `kestra` yet. It does not treat schema presence alone as success. The goal is to prove one full path works in our system:

`reference DB structures -> backend -> frontend/runtime -> operational writes`

Only after that proof exists do we consider the future rename to `bd`.

---

## Core Rule

The reference schema must preserve Kestra's database contract exactly at the DDL level.

Allowed changes:

- schema namespace rewrite from `public` to `kestra_ref`
- connection strings
- ports
- environment variables
- API URLs
- auth and service credentials
- loader scripts
- backend configuration needed to point our system at the reference schema

Not allowed:

- adding columns
- removing columns
- changing column types
- changing generated column expressions
- changing indexes
- changing constraints
- changing enum members
- changing trigger logic
- adding RLS to reference tables

In short: operational wiring may change, table structure may not.

---

## Phase 1 Goal

Create a protected `kestra_ref` schema in our database that contains a structurally exact copy of the exported Kestra reference schema, then prove our system can:

1. read from `kestra_ref`
2. process through our backend
3. surface through our frontend/runtime
4. write operational results into our app-owned tables

No rename work is part of this phase.

---

## Reference Schema Plan

### Step 1: Create a dedicated migration

New file:

- `supabase/migrations/20260308120000_072_kestra_ref_schema.sql`

Primary source:

- `docs-approved/backend setup/kestra-sqls/kestra_schema.sql`

The migration should:

1. create `kestra_ref`
2. add an explicit schema comment marking it as protected reference data
3. create a schema-rewritten copy of the Kestra DDL inside `kestra_ref`

Important clarification:

The source file is not execution-ready for this namespace as written, because it is authored against `public` semantics and must be mechanically rewritten to target `kestra_ref`. That rewrite is allowed because it does not alter the table contract itself. It changes only object qualification.

The rewritten migration must preserve all exported reference objects:

- enums
- functions
- tables
- indexes
- triggers

Target table set:

1. `concurrency_limit`
2. `dashboards`
3. `execution_queued`
4. `executions`
5. `executordelayed`
6. `executorstate`
7. `flow_topologies`
8. `flows`
9. `flyway_schema_history`
10. `kv_metadata`
11. `logs`
12. `metrics`
13. `multipleconditions`
14. `namespace_file_metadata`
15. `queues`
16. `service_instance`
17. `settings`
18. `sla_monitor`
19. `templates`
20. `triggers`
21. `worker_job_running`

`flyway_schema_history` is reference metadata only. It is not to be treated as an active migration authority for our app. It exists in `kestra_ref` only because the exported Kestra schema includes it.

### Step 2: Lock down the schema

The reference area must be readable by backend services and invisible to public API consumers.

Required permission model:

- `postgres` retains write authority for loading and refresh operations
- `service_role` gets `USAGE` plus `SELECT`
- `service_role` does not get `INSERT`, `UPDATE`, or `DELETE`
- `anon` and `authenticated` do not get direct schema access

Operational rules:

- `kestra_ref` is not exposed through PostgREST
- no app feature writes to `kestra_ref`
- no future migration alters `kestra_ref` except an intentional refresh or rebuild workflow

### Step 3: Keep app-owned tables separate

The reference schema is not the operational write target.

Current app-owned runtime tables remain in `public.*`:

- `flow_sources` via `20260227120000_049_flow_sources.sql`
- `flow_sources` revision history via `20260305120000_069_flow_sources_revision_history.sql`
- `flow_executions` via `20260305120100_070_flow_executions.sql`
- `flow_logs` via `20260305120200_071_flow_logs.sql`

These remain app-owned and writable. The backend reads contracts and reference records from `kestra_ref`, then writes operational data to `public`.

### Step 4: Load data from the live Kestra system

Preferred source of truth for reference data is Postgres-level export from the live Kestra database, not the Kestra HTTP API.

Preferred order:

1. `pg_dump` / `pg_restore`
2. direct SQL copy from the Kestra Postgres database
3. custom SQL import scripts

Do not treat Kestra API export as full-fidelity coverage for all 21 tables. API export may help with selected objects, but it is not sufficient for internal runtime tables such as queue and scheduler state.

This reference load can be one-time or periodic. It is not required to be live replication for Phase 1.

---

## Backend Plan

### Primary lane: Python backend

Python handlers are the primary execution lane.

Their role in Phase 1:

- read reference structures from `kestra_ref`
- interpret contracts needed for our backend behavior
- write app-owned operational records to `public.*`

This plan does not assume the 21 SQL tables contain plugin definitions. They do not. Plugin definitions, task schemas, and Java-side contracts come from the Kestra codebase, plugin sources, OpenAPI, and existing catalog tables already present in this repo.

The reference schema is for database contract fidelity, not for replacing the plugin metadata pipeline.

### Secondary lane: Java fallback

The live Kestra Java system may remain available as a fallback execution lane while Python coverage is incomplete.

That fallback is operationally useful, but it does not reduce the requirement to prove our own DB -> backend -> frontend path.

Treat the Java lane as:

- optional fallback
- external compatibility helper
- not the definition of "done"

---

## Architecture

```text
Supabase Postgres
├─ kestra_ref.*    (protected reference, read-only to service code)
└─ public.*        (app-owned operational tables, read-write)

Our backend
├─ Python handlers read from kestra_ref.*
├─ Python handlers write to public.*
└─ Optional Java fallback may execute outside this path when needed

Our frontend/runtime
└─ reads app-owned operational data and backend outputs, not raw kestra_ref tables
```

---

## What This Boundary Solves

1. It stops accidental mutation of the reference contract.
2. It gives backend work one clear read source and one clear write target.
3. It removes the temptation to "adapt Kestra in place."
4. It makes future rename work easier because the reference area is isolated.

---

## Verification Standard

Nothing in this phase counts as complete unless it is connected and operational in our system.

Minimum verification gate:

1. `kestra_ref` exists in our database.
2. All 21 expected tables exist in `kestra_ref`.
3. `service_role` can read from `kestra_ref` and cannot write to it.
4. `kestra_ref` is not exposed through the public API.
5. Existing `public.*` operational flow tables still work.
6. Our backend can read a flow from `kestra_ref.flows`.
7. Our backend can produce a corresponding operational write into `public.flow_executions`.
8. The frontend/runtime can surface the result through our own app path.

If step 8 is missing, the work is not operational yet.

---

## Explicit Non-Goals For Phase 1

- renaming `kestra` to `bd`
- rewriting Java packages
- rewriting plugin class names
- replacing Kestra metadata sources with only SQL tables
- treating schema import as success by itself

---

## Phase 2 Placeholder

After Phase 1 is proven end to end, the future rename phase may:

- rename `kestra_ref` to `bd_ref` or `bd_raw`
- rename visible `kestra` identifiers to `bd`
- convert repo, runtime, API, docs, and contract naming in a controlled pass

That work is intentionally deferred.

---

## Critical Files

| Purpose | Path |
|---------|------|
| Source schema export | `docs-approved/backend setup/kestra-sqls/kestra_schema.sql` |
| Table list | `docs-approved/backend setup/kestra-sqls/tables.txt` |
| Column inventory | `docs-approved/backend setup/kestra-sqls/columns.tsv` |
| Table-focused DDL | `docs-approved/backend setup/kestra-sqls/kestra_table_definitions.sql` |
| Current draft plan | `docs-approved/operational-integration/bd-reference-schema-plan.md` |
| Existing flow source migration | `supabase/migrations/20260227120000_049_flow_sources.sql` |
| Existing revision migration | `supabase/migrations/20260305120000_069_flow_sources_revision_history.sql` |
| Existing executions migration | `supabase/migrations/20260305120100_070_flow_executions.sql` |
| Existing logs migration | `supabase/migrations/20260305120200_071_flow_logs.sql` |
| Supabase config | `supabase/config.toml` |
| Proposed reference migration | `supabase/migrations/20260308120000_072_kestra_ref_schema.sql` |

