# Service Registry Identity + Load Categorization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the unified service registry real and trustworthy by removing the `registry_*` naming drift, adding BlockData-facing load categorization, and updating the admin and marketplace surfaces to use the canonical runtime model.

**Architecture:** Treat `service_registry`, `service_functions`, and `service_type_catalog` as the canonical schema. Refactor code that still points at `registry_services`, `registry_service_functions`, and `registry_service_types`. Add explicit BD-facing stage metadata so imported integrations can be filtered as Source, Destination, Load, Transform, Parse, Orchestration, Utility, or Conversion without relying only on weak string heuristics.

**Tech Stack:** Supabase Postgres migrations, Supabase Edge Functions (Deno), FastAPI platform API, React + Supabase JS, existing marketplace/settings UI.

---

## Scope Guardrails

- This plan does **not** make GCS or Arango executable yet.
- This plan does **not** add connector-specific job tables.
- This plan does **not** attempt to activate all imported services.
- This plan exists to make the registry stable enough that the next load-activation plan can build on it cleanly.

---

## Phase 1 - Canonical Registry Identity

### Task 1.1: Add regression tests for canonical `service_*` table names

**Files:**
- Modify: `supabase/functions/admin-services/index.test.ts`
- Create: `services/platform-api/tests/test_admin_services_registry.py`
- Modify: `web/src/pages/marketplace/ServicesCatalog.test.tsx`
- Modify: `web/src/pages/marketplace/ServiceDetailPage.test.tsx`

**Step 1: Add failing Deno assertions**

Update `supabase/functions/admin-services/index.test.ts` so the mock admin client expects:

- `service_registry`
- `service_functions`
- `service_type_catalog`

and fails if the handler still queries `registry_services`, `registry_service_functions`, or `registry_service_types`.

**Step 2: Add failing FastAPI route test**

Create `services/platform-api/tests/test_admin_services_registry.py` with one test that stubs the Supabase admin client and asserts:

- `GET /admin/services` reads from `service_registry`, `service_functions`, and `service_type_catalog`
- `POST /admin/services/service` writes to `service_registry`
- `POST /admin/services/function` writes to `service_functions`

**Step 3: Add failing marketplace tests**

Update the React marketplace tests so mocked `.from(...)` calls expect canonical table names:

- `service_registry`
- `service_functions`

**Step 4: Run tests to confirm failure**

Run:

```bash
cd supabase && deno test functions/admin-services/index.test.ts
```

Expected: FAIL because the code still uses `registry_*`.

Run:

```bash
cd services/platform-api && pytest tests/test_admin_services_registry.py -q
```

Expected: FAIL because the route still uses `registry_*`.

Run:

```bash
npm.cmd run test -- web/src/pages/marketplace/ServicesCatalog.test.tsx web/src/pages/marketplace/ServiceDetailPage.test.tsx
```

Expected: FAIL because the UI still queries `registry_*`.

**Step 5: Commit**

```bash
git add supabase/functions/admin-services/index.test.ts services/platform-api/tests/test_admin_services_registry.py web/src/pages/marketplace/ServicesCatalog.test.tsx web/src/pages/marketplace/ServiceDetailPage.test.tsx
git commit -m "test: lock registry code to canonical service table names"
```

---

### Task 1.2: Refactor registry readers and writers to canonical table names

**Files:**
- Modify: `supabase/functions/admin-services/index.ts`
- Modify: `supabase/functions/admin-integration-catalog/index.ts`
- Modify: `services/platform-api/app/api/routes/admin_services.py`
- Modify: `web/src/pages/settings/services-panel.api.ts`
- Modify: `web/src/pages/marketplace/ServicesCatalog.tsx`
- Modify: `web/src/pages/marketplace/ServiceDetailPage.tsx`

**Step 1: Refactor Deno admin handlers**

Replace all `.from("registry_services")`, `.from("registry_service_functions")`, and `.from("registry_service_types")` calls with:

- `.from("service_registry")`
- `.from("service_functions")`
- `.from("service_type_catalog")`

in:

- `supabase/functions/admin-services/index.ts`
- `supabase/functions/admin-integration-catalog/index.ts`

**Step 2: Refactor FastAPI admin route**

Replace `sb.table("registry_services")`, `sb.table("registry_service_functions")`, and `sb.table("registry_service_types")` with canonical names in:

- `services/platform-api/app/api/routes/admin_services.py`

**Step 3: Refactor web reads and realtime subscriptions**

Update:

- `web/src/pages/settings/services-panel.api.ts`
- `web/src/pages/marketplace/ServicesCatalog.tsx`
- `web/src/pages/marketplace/ServiceDetailPage.tsx`

to query:

- `service_registry`
- `service_functions`

and subscribe to those same table names for realtime.

**Step 4: Run tests again**

Run:

```bash
cd supabase && deno test functions/admin-services/index.test.ts
```

Expected: PASS

Run:

```bash
cd services/platform-api && pytest tests/test_admin_services_registry.py -q
```

Expected: PASS

Run:

```bash
npm.cmd run test -- web/src/pages/marketplace/ServicesCatalog.test.tsx web/src/pages/marketplace/ServiceDetailPage.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/admin-services/index.ts supabase/functions/admin-integration-catalog/index.ts services/platform-api/app/api/routes/admin_services.py web/src/pages/settings/services-panel.api.ts web/src/pages/marketplace/ServicesCatalog.tsx web/src/pages/marketplace/ServiceDetailPage.tsx
git commit -m "refactor: use canonical service registry table names"
```

---

## Phase 2 - BlockData-Facing Load Categorization

### Task 2.1: Add BD stage metadata to registry schema

**Files:**
- Create: `supabase/migrations/20260315220000_095_service_registry_load_categories.sql`

**Step 1: Write the migration**

Add explicit BD-facing stage columns:

- `service_registry.primary_stage text`
- `service_functions.bd_stage text`

Use a constrained set:

- `source`
- `destination`
- `load`
- `transform`
- `parse`
- `orchestration`
- `utility`
- `conversion`
- `notification`

Also refresh `service_functions_view` to expose the new columns.

**Step 2: Backfill obvious values**

In the migration, backfill:

- `service_type = 'dlt'` -> `primary_stage = 'load'`
- `service_type = 'dbt'` -> `primary_stage = 'transform'`
- `service_type = 'docling'` -> `primary_stage = 'parse'`
- `function_type = 'source'` -> `bd_stage = 'source'`
- `function_type = 'destination'` -> `bd_stage = 'destination'`
- `function_type = 'transform'` -> `bd_stage = 'transform'`
- `function_type = 'parse'` -> `bd_stage = 'parse'`
- `function_type = 'convert'` -> `bd_stage = 'conversion'`
- `function_type IN ('utility', 'test', 'callback')` -> `bd_stage = 'utility'`
- `function_type = 'flow'` -> `bd_stage = 'orchestration'`

**Step 3: Verify migration**

Run:

```bash
npx supabase db reset
```

Expected: PASS

**Step 4: Commit**

```bash
git add supabase/migrations/20260315220000_095_service_registry_load_categories.sql
git commit -m "feat: add blockdata stage metadata to service registry"
```

---

### Task 2.2: Strengthen import categorization for load-capable integrations

**Files:**
- Modify: `supabase/functions/admin-services/index.ts`
- Modify: `services/platform-api/app/api/routes/admin_services.py`
- Create: `supabase/functions/admin-services/load-categorization.test.ts`
- Create: `services/platform-api/tests/test_admin_services_categorization.py`

**Step 1: Add failing categorization tests**

Create tests that assert imported plugin types are categorized more usefully:

- `io.kestra.plugin.gcp.gcs.*` should classify as `primary_stage/load` and `bd_stage/source` where appropriate
- `io.kestra.plugin.mongodb.*` should classify as `primary_stage/load` and `bd_stage/source` or `bd_stage/destination` based on the function
- `io.kestra.plugin.core.flow.*` should classify as `orchestration`
- AI and notification plugins should not fall into the load slice

**Step 2: Add deterministic categorization helpers**

In both admin import codepaths:

- keep existing service/function type inference
- add a second pass that derives `primary_stage` and `bd_stage`
- use `plugin_group`, `task_class`, and `function_type`, not only substring checks like `.jdbc.` or `.docling.`

**Step 3: Persist the new fields during import**

When services/functions are upserted, include:

- `primary_stage` on service rows
- `bd_stage` on function rows

**Step 4: Run tests**

Run:

```bash
cd supabase && deno test functions/admin-services/index.test.ts functions/admin-services/load-categorization.test.ts
```

Expected: PASS

Run:

```bash
cd services/platform-api && pytest tests/test_admin_services_registry.py tests/test_admin_services_categorization.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/admin-services/index.ts services/platform-api/app/api/routes/admin_services.py supabase/functions/admin-services/load-categorization.test.ts services/platform-api/tests/test_admin_services_categorization.py
git commit -m "feat: classify imported services by blockdata load stages"
```

---

## Phase 3 - Surface the New Categories in the UI

### Task 3.1: Expose `primary_stage` and `bd_stage` in shared types

**Files:**
- Modify: `web/src/pages/settings/services-panel.types.ts`

**Step 1: Add the new fields**

Extend:

- `ServiceRow` with `primary_stage: string | null`
- `ServiceFunctionRow` with `bd_stage: string | null`

Add label helpers for the new stage values.

**Step 2: Add a unit test if needed**

If stage label helpers are added, create:

- `web/src/pages/settings/services-panel.types.test.ts`

**Step 3: Run tests**

Run:

```bash
npm.cmd run test -- web/src/pages/settings/services-panel.types.test.ts
```

Expected: PASS

**Step 4: Commit**

```bash
git add web/src/pages/settings/services-panel.types.ts web/src/pages/settings/services-panel.types.test.ts
git commit -m "feat: expose blockdata service stages in shared UI types"
```

---

### Task 3.2: Update services settings and marketplace views to use BD-facing stages

**Files:**
- Modify: `web/src/pages/settings/services-panel.api.ts`
- Modify: `web/src/pages/marketplace/ServicesCatalog.tsx`
- Modify: `web/src/pages/marketplace/ServiceDetailPage.tsx`
- Modify: `web/src/pages/marketplace/ServicesCatalog.test.tsx`
- Modify: `web/src/pages/marketplace/ServiceDetailPage.test.tsx`

**Step 1: Show stage-aware filtering in marketplace**

Update the catalog page so category/filter chips can use:

- `primary_stage` for services
- `bd_stage` badges in service detail and function lists

Do not remove `service_type`; show both.

**Step 2: Update service detail**

Show:

- primary stage on the service card
- BD stage on each function
- function type and BD stage together when they differ

**Step 3: Update tests**

Assert that:

- a GCS-like service can render as `Load` / `Source`
- a MongoDB-like function can render as `Destination`
- orchestration/core flow functions do not appear as generic integration-only utilities

**Step 4: Run tests and typecheck**

Run:

```bash
npm.cmd run test -- web/src/pages/marketplace/ServicesCatalog.test.tsx web/src/pages/marketplace/ServiceDetailPage.test.tsx
```

Expected: PASS

Run:

```bash
npm.cmd run check
```

Expected: PASS

**Step 5: Commit**

```bash
git add web/src/pages/settings/services-panel.api.ts web/src/pages/marketplace/ServicesCatalog.tsx web/src/pages/marketplace/ServiceDetailPage.tsx web/src/pages/marketplace/ServicesCatalog.test.tsx web/src/pages/marketplace/ServiceDetailPage.test.tsx
git commit -m "feat: show blockdata load stages in services ui"
```

---

## Verification

1. `npx supabase db reset` - PASS
2. `cd supabase && deno test functions/admin-services/index.test.ts functions/admin-services/load-categorization.test.ts` - PASS
3. `cd services/platform-api && pytest tests/test_admin_services_registry.py tests/test_admin_services_categorization.py -q` - PASS
4. `npm.cmd run test -- web/src/pages/marketplace/ServicesCatalog.test.tsx web/src/pages/marketplace/ServiceDetailPage.test.tsx` - PASS
5. `npm.cmd run check` - PASS
6. Manual smoke test:
   - Services settings loads with canonical registry data
   - Marketplace service cards no longer rely only on flat `Integration`
   - GCS-like functions present as load/source
   - MongoDB-like functions present as load source/destination examples
   - Core flow functions remain visible but clearly non-load

---

## What Ships Next

1. Project-level connection binding for load-capable services
2. First executable load path through the registry: GCS source + Arango destination
3. Then the first import path: Arango -> Platform

