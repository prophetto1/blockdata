# DBT Transform Integration Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a backend-only DBT integration so a project can run dbt (list/compile/build/test/run/show + macros) as a “transform” option against database sources, using Mage’s approach (dbtRunner + DBTAdapter) rather than shelling out.

**Architecture:** Supabase remains the control plane (project config, runs, audit/log rows, storage). A Python “dbt runner service” executes dbt-core programmatically (dbtRunner + adapter APIs) and streams logs/events back to Supabase.

**Tech Stack:** Supabase Postgres + Storage + Edge Functions (Deno TS) + Python service (dbt-core + dbt-* adapters).

---

## Decision (One Required Choice)

Pick where the dbt runtime lives:

1. **New service (Recommended):** `services/dbt-runner-service` (Python) deployed alongside existing services.
2. **Reuse existing Python service:** fold into `services/conversion-service` (faster, but mixes unrelated concerns).

This plan assumes option 1.

---

## Reference Implementations (Ground Truth)

Mage code we are explicitly borrowing patterns from:

- dbt CLI wrapper via `dbtRunner`: `mage_ai/data_preparation/models/block/dbt/dbt_cli.py` in `ref-repos/mage-ai`.
- dbt adapter-level APIs (macros, execute SQL, credentials): `mage_ai/data_preparation/models/block/dbt/dbt_adapter.py` in `ref-repos/mage-ai`.
- profiles.yml templating + temp directory interpolation: `mage_ai/data_preparation/models/block/dbt/profiles.py` in `ref-repos/mage-ai`.

dbt-core API surface we will rely on:

- `dbt.cli.main.dbtRunner`: `ref-repos/dbt/core/dbt/cli/main.py`.

---

## Task 1: Write The Backend Spec (No Code)

**Files:**
- Create: `docs/spec/2026-02-27-dbt-transform-integration.md`

**Steps:**
1. Document required user-facing capability (backend contracts only): upload dbt project, configure profiles/targets, run dbt commands, fetch artifacts/logs.
2. Document service boundaries: Edge Function endpoints vs Python service endpoints.
3. Document storage contracts: where dbt project bundles + artifacts live (Supabase Storage keys).
4. Document traces: “create dbt run” -> “dbt service execute” -> “persist results” with exact tables/fields (even if tables are new).

**Verification:**
- None (doc only). Ensure paths and endpoint names are consistent and unambiguous.

---

## Task 2: Create An API Contract Stub (Docs Only)

**Files:**
- Create: `docs/spec/2026-02-27-dbt-transform-api-contract.md`

**Steps:**
1. Define a minimal REST contract for the Python service:
   - `POST /v1/dbt/runs` (start)
   - `GET /v1/dbt/runs/{id}` (status)
   - `GET /v1/dbt/runs/{id}/events` (logs/events)
   - `GET /v1/dbt/runs/{id}/artifacts/{name}` (manifest/run_results/catalog)
2. Define request fields that map 1:1 to dbtRunner invoke args:
   - `args: string[]` (e.g. `["build", "--select", "tag:daily"]`)
   - `project_bundle_url` or `project_storage_key`
   - `profiles_yml` or `profiles_storage_key`
   - `env: Record<string,string>` (optional)
3. Define error semantics (validation errors vs dbt runtime failures).

**Verification:**
- None (doc only).

---

## Task 3: Map To Our Control Plane Endpoints (Docs Only)

**Files:**
- Modify: `supabase/functions/README.md`
- Create: `docs/spec/2026-02-27-dbt-transform-control-plane.md`

**Steps:**
1. Define new Edge Functions:
   - `POST /functions/v1/dbt-projects` (register/upload bundle pointer)
   - `POST /functions/v1/dbt-runs` (create run; calls python service)
   - `GET /functions/v1/dbt-runs/{id}` (read status)
2. Define required DB schema changes (tables + columns) at a high level (no migrations yet):
   - `dbt_projects` (project_id, bundle_key, created_at, updated_at)
   - `dbt_runs` (run_id, project_id, dbt_args, status, created_at, started_at, ended_at, error)
   - `dbt_run_events` (run_id, ts, level, message, raw_event_json)
   - `dbt_run_artifacts` (run_id, name, storage_key, checksum, created_at)
3. Explicitly define ownership/permission model: `owner_id` + project ownership checks (mirror ingest’s ownership checks).

**Verification:**
- None (doc only).

---

## Task 4: Implement Python dbt-runner Service (Code)

**Files:**
- Create: `services/dbt-runner-service/*`

**Steps (high level):**
1. Implement `dbtRunner.invoke(args)` orchestration (Mage pattern) with callbacks for structured events.
2. Implement adapter path (`DBTAdapter`) for “database source” introspection and macro execution.
3. Add artifact collection and upload to Supabase Storage.
4. Add “push events” to Supabase table for traceability.

**Verification (manual tracing, not new tests):**
- Run a local “hello dbt” project against a local Postgres and verify:
  - `dbt deps` then `dbt build` succeed.
  - `manifest.json` + `run_results.json` persisted.
  - events table contains dbt logs.

---

## Task 5: Wire Supabase Edge Functions (Code)

**Files:**
- Create: `supabase/functions/dbt-projects/index.ts`
- Create: `supabase/functions/dbt-runs/index.ts`
- Modify: `supabase/functions/_shared/*` (only if needed for auth/storage helpers)

**Steps:**
1. Implement auth + project ownership checks (mirror `supabase/functions/ingest/index.ts` patterns).
2. Implement signed URL generation for dbt bundles/artifacts.
3. Call python service with explicit request IDs for trace correlation.

**Verification (manual tracing):**
- Trigger `POST /functions/v1/dbt-runs` and verify the python service is called and a `dbt_runs` row transitions through states.

