# First Load Activation Through The Registry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Activate the first real load-oriented execution path through the unified registry by binding credentials, tracking execution in `service_runs`, and making `GCS source -> Arango destination` runnable end to end.

**Architecture:** Reuse the canonical registry/runtime instead of introducing `connector_jobs` as a parallel top-level subsystem. Extend `user_provider_connections` for GCS and Arango credentials. Use `service_runs`, `service_run_events`, and a new subordinate `service_run_items` table for progress. Execute provider-specific logic through FastAPI plugin handlers and an authenticated load-run route.

**Tech Stack:** Supabase Postgres + Edge Functions, FastAPI platform API, existing plugin execution model, React, Supabase Realtime, GCS JSON API, ArangoDB HTTP API, AES-GCM encryption via `api_key_crypto.ts`.

---

## Scope Guardrails

- This plan assumes the registry identity/categorization plan has already landed.
- This plan activates one load path only: `GCS source -> Arango destination`.
- This plan does **not** attempt full Kestra plugin parity.
- This plan does **not** implement Arango -> Platform import yet.
- This plan may use BlockData-native plugin handlers for Arango even though Arango is not a native Kestra plugin.

---

## Phase 1 - Credential Types + Connection Testing

### Task 1.1: Extend provider connections for GCS and Arango

**Files:**
- Modify: `supabase/functions/provider-connections/index.ts`
- Create: `supabase/functions/provider-connections/index.test.ts`

**Step 1: Add failing connection tests**

Create tests covering:

- `gcs_service_account` accepts valid service-account JSON and rejects missing `project_id`, `client_email`, or `private_key`
- `arangodb_credential` accepts `endpoint`, `database`, `username`, and `password`
- responses return safe metadata only, never decrypted secrets

**Step 2: Implement the handlers**

Extend `POST /provider-connections/connect` and `POST /provider-connections/disconnect` to support:

- `provider = "google", connection_type = "gcs_service_account"`
- `provider = "arangodb", connection_type = "arangodb_credential"`

Reuse:

- `encryptWithContext(...)`
- `user_provider_connections`

Store metadata only:

- GCS: `project_id`, `client_email`, `default_bucket?`
- Arango: `endpoint`, `database`, `username`

**Step 3: Run tests**

Run:

```bash
cd supabase && deno test functions/provider-connections/index.test.ts
```

Expected: PASS

**Step 4: Commit**

```bash
git add supabase/functions/provider-connections/index.ts supabase/functions/provider-connections/index.test.ts
git commit -m "feat: add gcs and arango provider connections"
```

---

### Task 1.2: Add connection testing for GCS and Arango

**Files:**
- Modify: `supabase/functions/test-api-key/index.ts`
- Create: `supabase/functions/test-api-key/index.test.ts`

**Step 1: Add failing tests**

Cover:

- GCS service account can list buckets for `project_id`
- Arango credentials can call `/_db/{database}/_api/version`

**Step 2: Implement provider-specific tests**

Use:

- GCS OAuth token exchange from service-account JSON
- Basic auth for Arango

Return the same response contract already used by the API-key tester:

- `{ valid: true }`
- `{ valid: false, error: ... }`

**Step 3: Run tests**

Run:

```bash
cd supabase && deno test functions/test-api-key/index.test.ts
```

Expected: PASS

**Step 4: Commit**

```bash
git add supabase/functions/test-api-key/index.ts supabase/functions/test-api-key/index.test.ts
git commit -m "feat: add gcs and arango connection tests"
```

---

## Phase 2 - Execution Tracking Through `service_runs`

### Task 2.1: Add subordinate item tracking under `service_runs`

**Files:**
- Create: `supabase/migrations/20260315230000_096_service_run_items.sql`

**Step 1: Write the migration**

Create `service_run_items` with:

- `item_id uuid primary key`
- `run_id uuid not null references public.service_runs(run_id) on delete cascade`
- `item_key text not null`
- `item_type text not null`
- `status text not null check (...)`
- `progress_jsonb jsonb not null default '{}'::jsonb`
- `rows_written integer not null default 0`
- `rows_failed integer not null default 0`
- `error_message text`
- `claimed_at timestamptz`
- `completed_at timestamptz`

Statuses:

- `pending`
- `running`
- `complete`
- `failed`

Add RLS aligned with the parent run's project ownership and add the table to realtime.

**Step 2: Verify migration**

Run:

```bash
npx supabase db reset
```

Expected: PASS

**Step 3: Commit**

```bash
git add supabase/migrations/20260315230000_096_service_run_items.sql
git commit -m "feat: add service run item tracking for load executions"
```

---

### Task 2.2: Add a load run submit/query route in platform API

**Files:**
- Create: `services/platform-api/app/api/routes/load_runs.py`
- Modify: `services/platform-api/app/main.py`
- Create: `services/platform-api/tests/test_load_runs.py`

**Step 1: Add failing route tests**

Cover:

- POST rejects missing source or destination connection IDs
- POST rejects source/destination functions that are not `bd_stage = source` / `destination`
- POST creates one `service_runs` row
- POST creates one `service_run_items` row per matched GCS object
- GET returns run status and item status

**Step 2: Implement the route**

Add:

- `POST /load-runs`
- `GET /load-runs/{run_id}`
- `POST /load-runs/{run_id}/step`

The submitter should:

1. authenticate the user
2. validate the selected source function and destination function
3. validate the selected provider connections
4. create a `service_runs` row with status `pending`
5. create `service_run_items` rows for matched GCS files
6. append initial `service_run_events`

The step endpoint should process the next pending item and update:

- `service_runs`
- `service_run_items`
- `service_run_events`

**Step 3: Register the router**

Mount the new route in `services/platform-api/app/main.py`.

**Step 4: Run tests**

Run:

```bash
cd services/platform-api && pytest tests/test_load_runs.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add services/platform-api/app/api/routes/load_runs.py services/platform-api/app/main.py services/platform-api/tests/test_load_runs.py
git commit -m "feat: add load run orchestration route"
```

---

## Phase 3 - First Executable Provider Pair

### Task 3.1: Add GCS source plugin handlers

**Files:**
- Create: `services/platform-api/app/plugins/gcs.py`
- Modify: `services/platform-api/app/domain/plugins/registry.py`
- Create: `services/platform-api/tests/test_gcs_plugins.py`

**Step 1: Add failing plugin tests**

Cover:

- list objects by bucket/prefix/glob
- download object content
- reject non-CSV object in the load path when CSV-only mode is active

**Step 2: Implement plugin handlers**

Add BlockData-native task types and function names for:

- `blockdata.load.gcs.list_objects`
- `blockdata.load.gcs.download_object`

Use the existing plugin contract:

- `params`
- `ExecutionContext`
- `PluginOutput`

The list plugin should return matched object metadata.

The download plugin should return UTF-8 CSV content or a storage artifact reference.

**Step 3: Register the handlers**

Update `services/platform-api/app/domain/plugins/registry.py` so the new plugin module is discovered automatically.

**Step 4: Run tests**

Run:

```bash
cd services/platform-api && pytest tests/test_gcs_plugins.py tests/test_plugins.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add services/platform-api/app/plugins/gcs.py services/platform-api/app/domain/plugins/registry.py services/platform-api/tests/test_gcs_plugins.py
git commit -m "feat: add gcs source plugins for load runs"
```

---

### Task 3.2: Add Arango destination plugin handlers

**Files:**
- Create: `services/platform-api/app/plugins/arango.py`
- Create: `services/platform-api/tests/test_arango_plugins.py`

**Step 1: Add failing plugin tests**

Cover:

- batch insert documents to `/_db/{database}/_api/document/{collection}`
- respect `_key` when present
- return inserted/failed counts

**Step 2: Implement plugin handlers**

Add BlockData-native task types and function names for:

- `blockdata.load.arango.batch_insert`

Use Arango HTTP API with:

- endpoint
- database
- username
- password
- collection
- documents

Return counts in `PluginOutput.data`.

**Step 3: Run tests**

Run:

```bash
cd services/platform-api && pytest tests/test_arango_plugins.py -q
```

Expected: PASS

**Step 4: Commit**

```bash
git add services/platform-api/app/plugins/arango.py services/platform-api/tests/test_arango_plugins.py
git commit -m "feat: add arango destination plugin for load runs"
```

---

### Task 3.3: Register source/destination functions in the registry

**Files:**
- Create: `supabase/migrations/20260315233000_097_first_load_functions.sql`

**Step 1: Write the migration**

Register or upsert canonical function rows for:

- GCS list objects
- GCS download object
- Arango batch insert

Use canonical tables:

- `service_registry`
- `service_functions`

Set:

- `service_type = 'pipeline-worker'` or the existing runtime service used by platform API
- `function_type = 'source'` for GCS functions
- `function_type = 'destination'` for Arango batch insert
- `bd_stage` accordingly
- `entrypoint` to the matching plugin execution path

If the runtime service already exists, reuse it instead of creating a new service row.

**Step 2: Verify migration**

Run:

```bash
npx supabase db reset
```

Expected: PASS

**Step 3: Commit**

```bash
git add supabase/migrations/20260315233000_097_first_load_functions.sql
git commit -m "feat: register first load source and destination functions"
```

---

## Phase 4 - Minimal Load UI

### Task 4.1: Add a project load page driven by registry functions

**Files:**
- Create: `web/src/pages/LoadPage.tsx`
- Create: `web/src/hooks/useLoadRun.ts`
- Modify: `web/src/router.tsx`
- Modify: `web/src/components/shell/nav-config.ts`
- Create: `web/src/pages/LoadPage.test.tsx`

**Step 1: Add failing UI test**

Cover:

- source selector shows source-stage functions
- destination selector shows destination-stage functions
- submit button disabled until both a function and connection are selected
- progress panel renders run and item states

**Step 2: Implement the hook**

`useLoadRun` should:

- load stage-filtered source/destination functions from the registry
- submit to `POST /load-runs`
- poll or step via `POST /load-runs/{run_id}/step`
- subscribe to `service_runs`, `service_run_events`, and `service_run_items`

**Step 3: Implement the page**

The page should allow:

1. select source function
2. select source connection
3. select destination function
4. select destination connection
5. enter run config: bucket, prefix, glob, collection, key column
6. submit and watch progress

**Step 4: Wire route and nav**

Add:

- `/app/load`
- Load navigation entry

**Step 5: Run tests and typecheck**

Run:

```bash
npm.cmd run test -- web/src/pages/LoadPage.test.tsx
```

Expected: PASS

Run:

```bash
npm.cmd run check
```

Expected: PASS

**Step 6: Commit**

```bash
git add web/src/pages/LoadPage.tsx web/src/hooks/useLoadRun.ts web/src/router.tsx web/src/components/shell/nav-config.ts web/src/pages/LoadPage.test.tsx
git commit -m "feat: add first registry-driven load page"
```

---

## Verification

1. `npx supabase db reset` - PASS
2. `cd supabase && deno test functions/provider-connections/index.test.ts functions/test-api-key/index.test.ts` - PASS
3. `cd services/platform-api && pytest tests/test_load_runs.py tests/test_gcs_plugins.py tests/test_arango_plugins.py tests/test_plugins.py -q` - PASS
4. `npm.cmd run test -- web/src/pages/LoadPage.test.tsx` - PASS
5. `npm.cmd run check` - PASS
6. Manual smoke test:
   - create GCS and Arango connections
   - open `/app/load`
   - pick GCS source + Arango destination
   - submit a run for a bucket/prefix/glob
   - observe `service_runs` status change from `pending` -> `running` -> `complete`
   - observe `service_run_items` row per file
   - observe `service_run_events` logging progress
   - confirm documents land in the target Arango collection

---

## What Ships Next

1. Arango -> Platform import as a source-stage function
2. More load-capable activations from the imported catalog
3. Pre-parse normalization for JSON, YAML, and XML
4. Flow orchestration on top of the same registry/runtime backbone

