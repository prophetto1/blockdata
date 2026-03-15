# Connector Foundation + GCS CSV → Arango Load Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a generic connector credentials layer on top of the existing `user_provider_connections` table, then ship the first connector job: reading CSV files from a GCS bucket and loading them as JSON documents into an ArangoDB collection.

**Architecture:** Extend `user_provider_connections` with two new connection types (`gcs_service_account` and `arangodb_credential`). Add a `connector_jobs` table for durable async execution with per-file progress. Build a `connector-run` edge function that validates inputs and enqueues work, and a `connector-worker` edge function that processes files using the existing claim-based pattern from extraction. The frontend adds a Connections settings panel and a Load page with source/destination pickers.

**Tech Stack:** Supabase Postgres + Edge Functions + Realtime, GCS JSON API (fetch-based, no SDK), ArangoDB HTTP API (existing `arangodb.ts` helpers), React + existing workbench components, AES-GCM encryption via existing `api_key_crypto.ts`.

**Existing patterns reused:**
- Credential encryption: `supabase/functions/_shared/api_key_crypto.ts`
- Provider connections CRUD: `supabase/functions/provider-connections/index.ts`
- Connection testing: `supabase/functions/test-api-key/index.ts`
- Async job pattern: `extraction_jobs` + `extraction_job_items` + `claim_extraction_items` RPC
- Arango HTTP client: `supabase/functions/_shared/arangodb.ts`
- GCP service account JWT: `supabase/functions/_shared/vertex_auth.ts`

---

## Scope Guardrails

- **Phase 1** adds GCS and Arango connection types to the existing `user_provider_connections` table. No new credentials table.
- **Phase 2** builds the GCS CSV → Arango load job. CSV only — no JSON/YAML/XML normalization in this plan.
- Write mode MVP: `insert` only. `upsert` and `replace` are Phase 3.
- No UI for Arango → Platform import in this plan. That is a separate follow-up.
- The `connector_jobs` table is generic — not GCS-specific. Future connectors (Postgres, S3, Arango import) reuse it.
- Page-range or row-limit caps are deferred. MVP loads the full file set.

---

# Phase 1 — Connections Foundation

Extends the existing credential system to support GCS and Arango connections.

### Task 1.1: Add GCS and Arango Connection Types to Provider Connections

**Files:**
- Create: `supabase/migrations/20260315200000_093_connector_connection_types.sql`

**Step 1: Write the migration**

This migration does not create a new table — it adds support for new connection types in the existing `user_provider_connections` table by documenting the expected shapes. The table already supports arbitrary `provider` + `connection_type` + `metadata_jsonb` combinations.

```sql
-- Document the expected metadata shapes for new connector types.
-- The user_provider_connections table (migration 022) already supports
-- arbitrary provider/connection_type values. This migration adds a
-- comment and a validation function for the new types.

-- Validation function: checks that metadata_jsonb contains required
-- fields for each known connection_type. Called by edge functions
-- before insert, not enforced at the table level.
CREATE OR REPLACE FUNCTION public.validate_connection_metadata(
  p_connection_type text,
  p_metadata jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF p_connection_type = 'gcs_service_account' THEN
    -- Required: project_id, client_email
    RETURN p_metadata ? 'project_id' AND p_metadata ? 'client_email';
  ELSIF p_connection_type = 'arangodb_credential' THEN
    -- Required: endpoint, database
    RETURN p_metadata ? 'endpoint' AND p_metadata ? 'database';
  ELSE
    RETURN true; -- unknown types pass through
  END IF;
END;
$$;

COMMENT ON FUNCTION public.validate_connection_metadata IS
  'Validates metadata_jsonb shape for known connection types.
   gcs_service_account: { project_id, client_email, bucket? }
   arangodb_credential: { endpoint, database, username? }';
```

**Step 2: Verify migration applies**

Run: `npx supabase db reset`
Expected: PASS.

**Step 3: Commit**

```bash
git add supabase/migrations/20260315200000_093_connector_connection_types.sql
git commit -m "feat: add connection metadata validation for GCS and Arango types"
```

---

### Task 1.2: Extend Provider Connections Edge Function

**Files:**
- Modify: `supabase/functions/provider-connections/index.ts`

**Context:** The existing edge function handles `connect` and `disconnect` for GCP service accounts. Extend it to handle `gcs_service_account` and `arangodb_credential` connection types using the same encrypt/store pattern.

**Step 1: Write failing test**

Create `supabase/functions/provider-connections/index.test.ts`:

```typescript
import { assertEquals } from "jsr:@std/assert";

Deno.test("connect with gcs_service_account validates required fields", async () => {
  // Mock: POST /provider-connections/connect with connection_type: gcs_service_account
  // Missing project_id should return 400
});

Deno.test("connect with arangodb_credential validates endpoint and database", async () => {
  // Mock: POST /provider-connections/connect with connection_type: arangodb_credential
  // Missing endpoint should return 400
});

Deno.test("connect stores encrypted credential and returns metadata only", async () => {
  // Mock: POST /provider-connections/connect with valid gcs_service_account
  // Response should contain metadata_jsonb but NOT credential_encrypted
});
```

**Step 2: Run tests to verify they fail**

Run: `cd supabase && deno test functions/provider-connections/index.test.ts`
Expected: FAIL

**Step 3: Implement the connection handlers**

Add to the existing `connect` handler in `provider-connections/index.ts`:

For `gcs_service_account`:
- Accept: `{ provider: "google", connection_type: "gcs_service_account", service_account_json: string }`
- Validate: JSON has `project_id`, `client_email`, `private_key`
- Encrypt: full service account JSON with context `"provider-connections-v1"`
- Store: metadata = `{ project_id, client_email, default_bucket? }`

For `arangodb_credential`:
- Accept: `{ provider: "arangodb", connection_type: "arangodb_credential", endpoint: string, database: string, username: string, password: string }`
- Validate: endpoint is HTTPS URL, database is non-empty
- Encrypt: `{ username, password }` with context `"provider-connections-v1"`
- Store: metadata = `{ endpoint, database, username }`

**Step 4: Run tests again**

Run: `cd supabase && deno test functions/provider-connections/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/provider-connections/index.ts supabase/functions/provider-connections/index.test.ts
git commit -m "feat: support GCS and Arango connection types in provider-connections"
```

---

### Task 1.3: Add Test-Connection Support for GCS and Arango

**Files:**
- Modify: `supabase/functions/test-api-key/index.ts`

**Context:** The existing `test-api-key` function validates API keys by making a lightweight call to the provider. Extend it to test GCS and Arango connections.

**Step 1: Write failing test**

Create `supabase/functions/test-api-key/index.test.ts` with cases:

```typescript
Deno.test("test gcs_service_account lists buckets successfully", async () => {
  // Mock: fetch to storage.googleapis.com/storage/v1/b?project=X returns 200
});

Deno.test("test arangodb_credential checks server version", async () => {
  // Mock: fetch to {endpoint}/_api/version returns 200 with { server: "arango", version: "3.x" }
});
```

**Step 2: Implement test handlers**

For GCS: generate a short-lived access token from the service account JSON (reuse pattern from `vertex_auth.ts`), then `GET https://storage.googleapis.com/storage/v1/b?project={project_id}` — if 200, connection is valid.

For Arango: `GET {endpoint}/_db/{database}/_api/version` with Basic auth — if 200, connection is valid.

**Step 3: Run tests**

Expected: PASS

**Step 4: Commit**

```bash
git add supabase/functions/test-api-key/index.ts supabase/functions/test-api-key/index.test.ts
git commit -m "feat: add GCS and Arango connection testing"
```

---

### Task 1.4: Connections Settings UI

**Files:**
- Create: `web/src/pages/settings/ConnectionsPanel.tsx`
- Modify: `web/src/pages/settings/settings-nav.ts` — add "Connections" nav entry
- Modify: `web/src/pages/settings/settings-tabs.ts` — add connections tab

**Step 1: Build the panel**

Follow the existing `SettingsProviderForm.tsx` pattern. The panel shows:
- List of saved connections (from `user_provider_connections` where `connection_type IN ('gcs_service_account', 'arangodb_credential')`)
- Add Connection form:
  - Type selector: GCS Service Account / ArangoDB
  - For GCS: paste service account JSON, optional default bucket
  - For Arango: endpoint URL, database name, username, password
- Test Connection button (calls extended `test-api-key`)
- Save / Delete buttons
- Status badge per connection

**Step 2: Wire into settings nav**

Add `{ id: 'connections', label: 'Connections', icon: IconPlug }` to settings nav.

**Step 3: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add web/src/pages/settings/ConnectionsPanel.tsx web/src/pages/settings/settings-nav.ts web/src/pages/settings/settings-tabs.ts
git commit -m "feat: add Connections settings panel for GCS and Arango"
```

---

# Phase 2 — GCS CSV → Arango Load

Async job that reads CSVs from GCS and inserts them as JSON documents into Arango.

### Task 2.1: Connector Jobs Migration

**Files:**
- Create: `supabase/migrations/20260315210000_094_connector_jobs.sql`

**Step 1: Write the migration**

```sql
-- Connector jobs: generic durable job table for connector operations.
-- Reuses the extraction pattern: jobs → items → claim RPC.
CREATE TABLE IF NOT EXISTS public.connector_jobs (
  job_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid NOT NULL REFERENCES auth.users(id),
  job_type       text NOT NULL CHECK (job_type IN ('gcs_csv_to_arango')),
  status         text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'complete', 'failed', 'cancelled')),
  source_connection_id uuid NOT NULL REFERENCES public.user_provider_connections(id),
  dest_connection_id   uuid NOT NULL REFERENCES public.user_provider_connections(id),
  config_jsonb   jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_items    integer NOT NULL DEFAULT 0,
  completed_items integer NOT NULL DEFAULT 0,
  failed_items   integer NOT NULL DEFAULT 0,
  error          text,
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.connector_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY connector_jobs_select_own ON connector_jobs
  FOR SELECT USING (owner_id = auth.uid());
CREATE INDEX idx_connector_jobs_owner ON connector_jobs(owner_id);

-- Connector job items: one per file/object being processed.
CREATE TABLE IF NOT EXISTS public.connector_job_items (
  item_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid NOT NULL REFERENCES public.connector_jobs(job_id) ON DELETE CASCADE,
  source_path   text NOT NULL,
  status        text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'complete', 'failed')),
  rows_written  integer NOT NULL DEFAULT 0,
  rows_failed   integer NOT NULL DEFAULT 0,
  error         text,
  claimed_by    text,
  claimed_at    timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  completed_at  timestamptz
);

CREATE INDEX idx_connector_job_items_job ON connector_job_items(job_id);
CREATE INDEX idx_connector_job_items_pending
  ON connector_job_items(job_id, status) WHERE status = 'pending';

-- Claim RPC: atomic work item acquisition (mirrors extraction pattern).
CREATE OR REPLACE FUNCTION public.claim_connector_items(
  p_job_id uuid,
  p_worker_id text,
  p_limit integer DEFAULT 1
)
RETURNS SETOF public.connector_job_items
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT i.item_id
    FROM public.connector_job_items i
    WHERE i.job_id = p_job_id
      AND i.status = 'pending'
    ORDER BY i.source_path, i.item_id
    LIMIT GREATEST(1, p_limit)
    FOR UPDATE OF i SKIP LOCKED
  )
  UPDATE public.connector_job_items i
  SET
    status = 'claimed',
    claimed_by = p_worker_id,
    claimed_at = now(),
    attempt_count = i.attempt_count + 1
  FROM candidate
  WHERE i.item_id = candidate.item_id
  RETURNING i.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_connector_items(uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_connector_items(uuid, text, integer)
  TO service_role;

-- Realtime for job status tracking
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE connector_jobs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

**Step 2: Verify**

Run: `npx supabase db reset`
Expected: PASS

**Step 3: Commit**

```bash
git add supabase/migrations/20260315210000_094_connector_jobs.sql
git commit -m "feat: add connector_jobs and connector_job_items tables with claim RPC"
```

---

### Task 2.2: GCS Auth Helper

**Files:**
- Create: `supabase/functions/_shared/gcs_auth.ts`
- Create: `supabase/functions/_shared/gcs_auth.test.ts`

**Context:** Reuse the JWT-based service account auth pattern from `vertex_auth.ts`. GCS uses the same Google OAuth2 flow: sign a JWT with the service account private key, exchange it for an access token, use Bearer auth on GCS API calls.

**Step 1: Write failing tests**

```typescript
import { assertEquals } from "jsr:@std/assert";
import { buildGcsJwt } from "./gcs_auth.ts";

Deno.test("buildGcsJwt produces a valid JWT shape", () => {
  const jwt = buildGcsJwt({
    clientEmail: "test@proj.iam.gserviceaccount.com",
    privateKey: "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----\n",
    scopes: ["https://www.googleapis.com/auth/devstorage.read_only"],
  });
  const parts = jwt.split(".");
  assertEquals(parts.length, 3);
});
```

**Step 2: Implement**

Port the JWT signing logic from `vertex_auth.ts` into a reusable `signGoogleJwt(args)` and `getGcsAccessToken(serviceAccountJson)` that returns a Bearer token with `devstorage.read_only` scope.

**Step 3: Run tests**

Expected: PASS

**Step 4: Commit**

```bash
git add supabase/functions/_shared/gcs_auth.ts supabase/functions/_shared/gcs_auth.test.ts
git commit -m "feat: add GCS service account auth helper"
```

---

### Task 2.3: GCS List and Download Helpers

**Files:**
- Create: `supabase/functions/_shared/gcs_client.ts`
- Create: `supabase/functions/_shared/gcs_client.test.ts`

**Step 1: Write failing tests**

```typescript
Deno.test("listObjects returns CSV files matching prefix and glob", async () => {
  // Mock: GET storage.googleapis.com/storage/v1/b/{bucket}/o?prefix=data/
  // Returns items with name: "data/a.csv", "data/b.csv", "data/c.json"
  // With glob "*.csv", should return only a.csv and b.csv
});

Deno.test("downloadObject returns UTF-8 text content", async () => {
  // Mock: GET storage.googleapis.com/storage/v1/b/{bucket}/o/{name}?alt=media
  // Returns CSV text
});
```

**Step 2: Implement**

```typescript
export async function listGcsObjects(args: {
  accessToken: string;
  bucket: string;
  prefix?: string;
  glob?: string; // e.g. "*.csv"
}): Promise<Array<{ name: string; size: number }>>

export async function downloadGcsObject(args: {
  accessToken: string;
  bucket: string;
  objectName: string;
}): Promise<string>
```

Uses `fetch` against `https://storage.googleapis.com/storage/v1/b/{bucket}/o` (list) and `?alt=media` (download). No SDK dependency.

**Step 3: Run tests, commit**

---

### Task 2.4: CSV to JSON Converter

**Files:**
- Create: `supabase/functions/_shared/csv_to_json.ts`
- Create: `supabase/functions/_shared/csv_to_json.test.ts`

**Step 1: Write failing tests**

```typescript
Deno.test("parseCsvToJsonDocs converts rows to objects with header keys", () => {
  const csv = "name,age,city\nAlice,30,NYC\nBob,25,LA";
  const docs = parseCsvToJsonDocs(csv);
  assertEquals(docs, [
    { name: "Alice", age: "30", city: "NYC" },
    { name: "Bob", age: "25", city: "LA" },
  ]);
});

Deno.test("parseCsvToJsonDocs handles quoted fields with commas", () => {
  const csv = 'name,address\nAlice,"123 Main St, Apt 4"';
  const docs = parseCsvToJsonDocs(csv);
  assertEquals(docs[0].address, "123 Main St, Apt 4");
});

Deno.test("parseCsvToJsonDocs with keyColumn sets _key", () => {
  const csv = "id,name\n1,Alice\n2,Bob";
  const docs = parseCsvToJsonDocs(csv, { keyColumn: "id" });
  assertEquals(docs[0]._key, "1");
});

Deno.test("parseCsvToJsonDocs skips empty rows", () => {
  const csv = "a,b\n1,2\n\n3,4\n";
  const docs = parseCsvToJsonDocs(csv);
  assertEquals(docs.length, 2);
});
```

**Step 2: Implement**

Simple CSV parser (no external dependency). Handle: quoted fields, commas in quotes, empty rows, optional `_key` from a column. Returns `Record<string, string>[]`.

**Step 3: Run tests, commit**

---

### Task 2.5: Arango Batch Insert Helper

**Files:**
- Create: `supabase/functions/_shared/arango_write.ts`
- Create: `supabase/functions/_shared/arango_write.test.ts`

**Context:** The existing `arangodb.ts` handles the platform's internal Arango projection. This helper writes to a **user-specified** Arango instance with user-provided credentials.

**Step 1: Write failing tests**

```typescript
Deno.test("batchInsertToArango sends documents to /_api/document/{collection}", async () => {
  // Mock: POST to {endpoint}/_db/{database}/_api/document/{collection}
  // Verify body is JSON array of documents
  // Verify Basic auth header
});

Deno.test("batchInsertToArango returns count of inserted and failed", async () => {
  // Mock: response with some successful and some failed inserts
});
```

**Step 2: Implement**

```typescript
export async function batchInsertToArango(args: {
  endpoint: string;
  database: string;
  collection: string;
  username: string;
  password: string;
  documents: Record<string, unknown>[];
}): Promise<{ inserted: number; failed: number; errors: string[] }>
```

Uses Arango HTTP API `POST /_db/{database}/_api/document/{collection}` with `?overwriteMode=ignore` for MVP. Batch size: 500 docs per request.

**Step 3: Run tests, commit**

---

### Task 2.6: `connector-run` Submitter Edge Function

**Files:**
- Create: `supabase/functions/connector-run/index.ts`
- Create: `supabase/functions/connector-run/index.test.ts`

**Step 1: Write failing tests**

```typescript
Deno.test("returns 400 when source connection not found", async () => {});
Deno.test("returns 400 when dest connection not found", async () => {});
Deno.test("returns 202 with job_id on valid request", async () => {});
```

**Step 2: Implement**

Flow:
1. Authenticate user via `requireUserId(req)`
2. Accept: `{ source_connection_id, dest_connection_id, job_type: "gcs_csv_to_arango", config: { bucket, prefix?, glob?, collection, key_column? } }`
3. Validate both connections exist and belong to user
4. Decrypt source GCS credentials, list matching objects
5. Insert one `connector_jobs` row with `status = 'queued'`
6. Insert one `connector_job_items` row per CSV file found
7. Update `connector_jobs.total_items`
8. Return `202` with `{ job_id, status: "queued", total_items }`

**Step 3: Run tests, commit**

---

### Task 2.7: `connector-worker` Edge Function

**Files:**
- Create: `supabase/functions/connector-worker/index.ts`
- Create: `supabase/functions/connector-worker/index.test.ts`

**Step 1: Write failing tests**

```typescript
Deno.test("claims one pending item and processes it", async () => {});
Deno.test("marks item complete with rows_written count", async () => {});
Deno.test("marks item failed on download error", async () => {});
Deno.test("marks job complete when no pending items remain", async () => {});
```

**Step 2: Implement**

Flow:
1. Authenticate user
2. Accept `{ job_id }`
3. Load job row, verify ownership
4. Claim items via `claim_connector_items` RPC
5. If no items claimed and no pending remain, mark job `complete`
6. Mark job `running` if it was `queued`
7. For each claimed item:
   a. Decrypt source GCS credentials
   b. Download CSV from GCS via `downloadGcsObject`
   c. Parse CSV to JSON docs via `parseCsvToJsonDocs`
   d. Decrypt dest Arango credentials
   e. Batch insert via `batchInsertToArango`
   f. Update item: `status = 'complete'`, `rows_written`, `rows_failed`
   g. Or on error: `status = 'failed'`, `error`
8. Update job counters
9. Return `{ processed: N, remaining: M }`

Does not recurse. Does not self-invoke. Client drives the loop.

**Step 3: Run tests, commit**

---

### Task 2.8: Load Page UI

**Files:**
- Create: `web/src/hooks/useConnectorJob.ts`
- Create: `web/src/pages/LoadPage.tsx`
- Modify: `web/src/router.tsx` — add `/app/load` route
- Modify: `web/src/components/shell/nav-config.ts` — add Load nav entry

**Step 1: Build the job runner hook**

```typescript
export function useConnectorJob() {
  // submit(config) → calls connector-run → saves job_id
  // run() → calls connector-worker in a loop while job is queued/running
  // subscribes to connector_jobs via Realtime for status updates
  // returns: { submit, run, job, items, isRunning }
}
```

**Step 2: Build the Load page**

Simple wizard flow:
1. **Source**: pick a GCS connection, enter bucket/prefix/glob
2. **Destination**: pick an Arango connection, enter collection name, optional key column
3. **Preview**: show list of matched CSV files (from a dry-run list call)
4. **Run**: submit job, show progress (items complete / total, rows written)
5. **Status**: job status badge, per-file status table, error display

**Step 3: Wire routing and nav**

Add `/app/load` route and "Load" entry in main nav.

**Step 4: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/hooks/useConnectorJob.ts web/src/pages/LoadPage.tsx web/src/router.tsx web/src/components/shell/nav-config.ts
git commit -m "feat: add Load page with GCS CSV to Arango connector UI"
```

---

# Verification

1. `npx supabase db reset` — PASS
2. `cd supabase && deno test functions/_shared/gcs_auth.test.ts functions/_shared/gcs_client.test.ts functions/_shared/csv_to_json.test.ts functions/_shared/arango_write.test.ts functions/connector-run/index.test.ts functions/connector-worker/index.test.ts` — PASS
3. `cd web && npx tsc --noEmit` — PASS
4. Manual smoke test:
   - Add a GCS service account connection in Settings → Connections
   - Test connection → shows valid
   - Add an Arango connection, test → shows valid
   - Go to Load page, select source GCS + dest Arango
   - Enter bucket, prefix, collection
   - Preview shows CSV files found
   - Run → job moves `queued → running → complete`
   - Check Arango collection → JSON documents match CSV rows

---

# What Ships Next

1. **Arango → Platform import** — reverse direction: read from Arango, create source_documents, flow into Parse/Extract
2. **Write modes** — add `upsert` and `replace` options for Arango insert
3. **Pre-parse normalization** — JSON/YAML/XML auto-conversion to parser-friendly formats
4. **Postgres connector** — same pattern, different adapter
5. **Transform workbench** — scriptable block operations (separate plan)

---

# Design Decisions

| Decision | Rationale |
|----------|-----------|
| Extend `user_provider_connections`, don't create new table | Existing table has encryption, RLS, CRUD edge function, UI pattern. Adding connection types is cheaper than a parallel system. |
| Generic `connector_jobs` table | Same job can describe GCS→Arango, Arango→Platform, Postgres→Arango, etc. The `job_type` column + `config_jsonb` make it extensible without migrations. |
| No SDK for GCS | `fetch` against `storage.googleapis.com` is simpler and lighter for list + download operations. No Deno compatibility issues. |
| CSV parser without dependency | CSVs in this use case are regular tabular data. A 50-line parser handles quoted fields and empty rows. No need for a streaming parser in MVP. |
| Client-driven worker loop | Matches the extraction pattern. Server-side scheduling (pg_cron) is a follow-up. |
| Separate `connector-run` and `connector-worker` | Same separation of concerns as extraction: submitter validates and enqueues, worker claims and processes. |