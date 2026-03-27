# Service Registry Identity Cleanup + Load Activation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the service registry naming drift, categorize imported integrations by pipeline stage at both service and function level, bind user connections to services, and make the GCS → ArangoDB load path fully executable end-to-end through the registry — proving the architecture works for both Kestra-imported sources and BD-native destinations.

**Architecture:** The platform already has a two-layer model: `integration_catalog_items` (945 imported Kestra plugin definitions) and `service_registry` + `service_functions` (the live runtime). Code references `registry_services` / `registry_service_functions` / `registry_service_types` but the canonical schema names are `service_registry` / `service_functions` / `service_type_catalog`. This plan fixes the code to match the schema (not the other way around), then adds dual-level pipeline-stage categorization (service-level for discovery, function-level for execution), extends `user_provider_connections` for GCS and ArangoDB credentials, translates the GCS source handler to Python and builds an ArangoDB destination plugin, defines an explicit source-to-destination handoff contract, and wires the Load UI.

**Tech Stack:** Supabase Postgres migrations, Python (FastAPI, `httpx` for GCS JSON API and Arango HTTP API), Deno Edge Functions, React, existing plugin architecture in `services/platform-api/app/plugins/`.

**Context document:** `docs/pipeline/2026-03-15-kestra-absorption-context-update.md`

**Existing patterns reused:**
- Plugin system: `services/platform-api/app/shared/base.py` (BasePlugin, PluginOutput, ExecutionContext)
- Plugin execution: `services/platform-api/app/main.py` → `POST /{function_name}`
- Plugin registry: `services/platform-api/app/registry.py` (auto-discovers plugins by task_type)
- Credential encryption: `supabase/functions/_shared/api_key_crypto.ts`
- Provider connections: `supabase/functions/provider-connections/index.ts`
- Existing plugins: `http.py` (HttpRequestPlugin), `core.py` (LogPlugin), `scripts.py`, `eyecite.py`

---

## Scope Guardrails

- Only Load-stage activation. Transform, Parse, and Orchestration services stay catalog-only.
- Proof point: GCS source → ArangoDB destination. This matches both the immediate business need and the declared architectural checkpoint.
- GCS operations in scope: `ListObjects` (browse bucket) and `DownloadObject` (fetch file content).
- ArangoDB operations in scope: `Query` (source/read) and `BatchInsert` (destination/write).
- No flow composition UI — this is single-step source→destination, not multi-step pipelines.
- `service_runs` is used for execution tracking. Item-level tracking lives as a subordinate of `service_runs`, not as a separate top-level system. No new `connector_jobs` table.
- pipeline-worker deprecation is acknowledged but both `services/pipeline-worker/` and `services/platform-api/` share the plugin architecture. New plugins go in `services/platform-api/app/plugins/`.
- Canonical schema identity stays `service_registry` / `service_functions` / `service_type_catalog`. Code is fixed to match schema, not the other way around.
- Kestra plugin identifiers (task_class, plugin_group) are preserved as metadata and aliases for traceability. BD-native names are the canonical runtime identity.
- Source-to-destination handoff uses artifact references (storage URIs), not raw payloads through the UI or a single synchronous hop.

---

# Phase 1 — Registry Identity Cleanup

### Task 1.1: Fix Code to Match Canonical Schema Names

**Files:**
- Modify: `supabase/functions/admin-services/index.ts`
- Modify: `supabase/functions/admin-services/index.test.ts`
- Modify: `supabase/functions/admin-integration-catalog/index.ts`
- Modify: `supabase/functions/admin-integration-catalog/index.test.ts`
- Modify: `web/src/pages/settings/services-panel.api.ts`
- Modify: `web/src/pages/marketplace/ServicesCatalog.tsx`
- Modify: `web/src/pages/marketplace/ServicesCatalog.test.tsx`
- Modify: `web/src/pages/marketplace/ServiceDetailPage.tsx`
- Modify: `web/src/pages/marketplace/ServiceDetailPage.test.tsx`
- Modify: `services/pipeline-worker/app/routes/admin_services.py`
- Modify: `services/pipeline-worker/app/registry.py`
- Modify: `services/pipeline-worker/app/shared/base.py`
- Modify: `services/platform-api/app/routes/admin_services.py`
- Modify: `services/platform-api/app/registry.py`
- Modify: `services/platform-api/app/shared/base.py`

**Context:** The canonical schema names are `service_registry`, `service_functions`, `service_type_catalog` (defined in migration 050). Code in 16 files incorrectly references `registry_services`, `registry_service_functions`, `registry_service_types`. The schema is the source of truth — fix the code, not the tables.

**Step 1: Find-and-replace across all affected files**

In every file listed above, replace:
- `registry_services` → `service_registry`
- `registry_service_functions` → `service_functions`
- `registry_service_types` → `service_type_catalog`

This includes:
- `.from("registry_services")` → `.from("service_registry")`
- `.table("registry_services")` → `.table("service_registry")`
- `.from("registry_service_functions")` → `.from("service_functions")`
- `.table("registry_service_functions")` → `.table("service_functions")`
- `.from("registry_service_types")` → `.from("service_type_catalog")`
- `.table("registry_service_types")` → `.table("service_type_catalog")`
- Any Python string references: `"registry_services"` → `"service_registry"`, etc.
- Any comment references to the old names

**Step 2: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: PASS (no type errors — table names are strings, not typed)

**Step 3: Verify edge function tests**

Run: `cd supabase && deno test functions/admin-services/index.test.ts`
Expected: PASS (mocks updated to use canonical names)

**Step 4: Commit**

```bash
git add -A
git commit -m "fix: align code to canonical schema names (service_registry, service_functions, service_type_catalog)"
```

---

### Task 1.2: Add Dual-Level Pipeline Stage Categorization

**Files:**
- Create: `supabase/migrations/20260315230000_096_pipeline_stage_classification.sql`

**Context:** Categorization must work at two levels because one service can play multiple roles (e.g. MongoDB is both source and destination). Service-level `primary_stage` is for discovery and filtering. Function-level `bd_stage` is for execution routing. When forced to choose, function-level wins.

**Step 1: Write the migration**

```sql
-- Dual-level pipeline stage categorization.
-- Service level: primary_stage (JSONB array) — what stages this service participates in.
-- Function level: bd_stage (TEXT) — the BD-native stage for this specific function.
-- The function_type column is preserved for Kestra compatibility but bd_stage
-- is the execution-plane identity.

-- Service-level: which pipeline stages does this service participate in?
ALTER TABLE public.service_registry
  ADD COLUMN IF NOT EXISTS primary_stage jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(primary_stage) = 'array');

COMMENT ON COLUMN public.service_registry.primary_stage IS
  'Pipeline stages this service participates in for discovery: source, destination, transform, parse, orchestration, utility, conversion, notification';

CREATE INDEX IF NOT EXISTS idx_service_registry_primary_stage
  ON public.service_registry USING GIN (primary_stage);

-- Function-level: what is this function's role in the BD execution plane?
ALTER TABLE public.service_functions
  ADD COLUMN IF NOT EXISTS bd_stage text NOT NULL DEFAULT 'custom'
    CHECK (bd_stage IN (
      'source', 'destination', 'transform', 'parse', 'convert',
      'export', 'test', 'utility', 'orchestration', 'notification', 'custom'
    ));

COMMENT ON COLUMN public.service_functions.bd_stage IS
  'BD-native execution stage. Used for routing and UI. Takes precedence over function_type for execution decisions.';

CREATE INDEX IF NOT EXISTS idx_service_functions_bd_stage
  ON public.service_functions (bd_stage);

-- Expand function_type CHECK to include values already used in pipeline-worker code.
ALTER TABLE public.service_functions
  DROP CONSTRAINT IF EXISTS service_functions_function_type_check;
ALTER TABLE public.service_functions
  ADD CONSTRAINT service_functions_function_type_check
    CHECK (function_type IN (
      'source', 'destination', 'transform', 'parse', 'convert',
      'export', 'test', 'utility', 'macro', 'custom',
      'ingest', 'callback', 'flow'
    ));

-- Backfill bd_stage from existing function_type where meaningful.
UPDATE public.service_functions SET bd_stage = function_type
  WHERE function_type IN ('source', 'destination', 'transform', 'parse', 'convert', 'export', 'test', 'utility');

-- Seed primary_stage for the existing seeded services.
UPDATE public.service_registry SET primary_stage = '["source"]'::jsonb WHERE service_name = 'load-runner';
UPDATE public.service_registry SET primary_stage = '["transform"]'::jsonb WHERE service_name = 'transform-runner';
UPDATE public.service_registry SET primary_stage = '["parse"]'::jsonb WHERE service_name = 'docling-service';

-- Update the convenience view to include both stage columns.
CREATE OR REPLACE VIEW public.service_functions_view AS
SELECT
  sf.function_id,
  sf.function_name,
  sf.function_type,
  sf.bd_stage,
  sf.label,
  sf.description,
  sf.entrypoint,
  sf.http_method,
  sf.parameter_schema,
  sf.result_schema,
  sf.enabled AS function_enabled,
  sf.tags,
  sr.service_id,
  sr.service_type,
  sr.service_name,
  sr.base_url,
  sr.health_status,
  sr.enabled AS service_enabled,
  sr.primary_stage,
  stc.label AS service_type_label
FROM public.service_functions sf
JOIN public.service_registry sr ON sr.service_id = sf.service_id
JOIN public.service_type_catalog stc ON stc.service_type = sr.service_type
WHERE sf.enabled = true AND sr.enabled = true;

GRANT SELECT ON public.service_functions_view TO authenticated;
GRANT SELECT ON public.service_functions_view TO service_role;

NOTIFY pgrst, 'reload schema';
```

**Step 2: Verify**

Run: `npx supabase db reset`
Expected: PASS.

**Step 3: Commit**

```bash
git add supabase/migrations/20260315230000_096_pipeline_stage_classification.sql
git commit -m "feat: add pipeline_stages column and classification to registry_services"
```

---

# Phase 2 — Connection Binding

### Task 2.1: Extend Provider Connections for GCS and ArangoDB

**Files:**
- Modify: `supabase/functions/provider-connections/index.ts`
- Create: `supabase/functions/provider-connections/index.test.ts`

**Context:** The existing `provider-connections` edge function only supports `provider: "google"` + `connection_type: "gcp_service_account"`. Extend it to accept GCS service account (reuses same shape but with storage scope) and ArangoDB connection credentials.

**Step 1: Write failing tests**

Create `supabase/functions/provider-connections/index.test.ts`:

```typescript
import { assertEquals } from "jsr:@std/assert";
import { handleProviderConnectionsRequest, getAction, parseNonEmptyString } from "./index.ts";

Deno.test("connect with gcs_service_account validates required fields", async () => {
  const body = JSON.stringify({
    provider: "google",
    connection_type: "gcs_service_account",
    service_account_json: JSON.stringify({
      project_id: "my-project",
      client_email: "sa@my-project.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n",
    }),
    default_bucket: "my-bucket",
  });
  const req = new Request("https://example.com/functions/v1/provider-connections/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer test" },
    body,
  });

  const resp = await handleProviderConnectionsRequest(req, {
    requireUserId: async () => "user-1",
    createAdminClient: () => ({
      from: () => ({ upsert: async () => ({ error: null }) }),
    } as any),
    requireEnv: () => "test-secret",
    encryptWithContext: async (plaintext) => `enc:v1:test:${plaintext.slice(0, 10)}`,
  });

  // Once implemented, should return 200
  assertEquals(resp.status, 200);
});

Deno.test("connect with arangodb_credential validates endpoint and database", async () => {
  const body = JSON.stringify({
    provider: "arangodb",
    connection_type: "arangodb_credential",
    endpoint: "https://abc123.arangodb.cloud:8529",
    database: "_system",
    username: "root",
    password: "secret",
  });
  const req = new Request("https://example.com/functions/v1/provider-connections/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer test" },
    body,
  });

  const resp = await handleProviderConnectionsRequest(req, {
    requireUserId: async () => "user-1",
    createAdminClient: () => ({
      from: () => ({ upsert: async () => ({ error: null }) }),
    } as any),
    requireEnv: () => "test-secret",
    encryptWithContext: async (plaintext) => `enc:v1:test:${plaintext.slice(0, 10)}`,
  });

  assertEquals(resp.status, 200);
});
```

**Step 2: Run tests to verify they fail**

Run: `cd supabase && deno test functions/provider-connections/index.test.ts`
Expected: FAIL (handler rejects non-google providers)

**Step 3: Extend the connect handler**

In `provider-connections/index.ts`, replace the v1 guard in the `connect` action:

```typescript
    if (req.method === "POST" && action === "connect") {
      const body = await req.json().catch(() => ({}));
      const provider = parseNonEmptyString((body as Record<string, unknown>)?.provider);
      const connectionType = parseNonEmptyString((body as Record<string, unknown>)?.connection_type);
      if (!provider) return json(400, { error: "Missing provider" });
      if (!connectionType) return json(400, { error: "Missing connection_type" });

      // --- Google GCP Service Account (existing) ---
      if (provider === "google" && connectionType === "gcp_service_account") {
        // ... existing handler unchanged ...
      }

      // --- GCS Service Account ---
      if (provider === "google" && connectionType === "gcs_service_account") {
        const defaultBucket = parseNonEmptyString((body as Record<string, unknown>)?.default_bucket);
        // Reuse existing service account parsing and validation
        const saParsed = parseServiceAccountJson((body as Record<string, unknown>)?.service_account_json);
        if (!saParsed.ok) return json(400, { error: saParsed.error });
        const shapeError = validateServiceAccountShape(saParsed.sa);
        if (shapeError) return json(400, { error: shapeError });

        const projectId = parseNonEmptyString(saParsed.sa.project_id) as string;
        const clientEmail = parseNonEmptyString(saParsed.sa.client_email) as string;

        const encrypted = await deps.encryptWithContext(saParsed.raw, cryptoSecret, CRYPTO_CONTEXT);

        const { error } = await admin
          .from("user_provider_connections")
          .upsert({
            user_id: userId,
            provider,
            connection_type: connectionType,
            status: "connected",
            credential_encrypted: encrypted,
            metadata_jsonb: { project_id: projectId, client_email: clientEmail, default_bucket: defaultBucket },
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,provider,connection_type" });
        if (error) return json(400, { error: error.message });
        return json(200, { ok: true, status: "connected", metadata: { project_id: projectId, client_email: clientEmail, default_bucket: defaultBucket } });
      }

      // --- ArangoDB ---
      if (provider === "arangodb" && connectionType === "arangodb_credential") {
        const endpoint = parseNonEmptyString((body as Record<string, unknown>)?.endpoint);
        const database = parseNonEmptyString((body as Record<string, unknown>)?.database);
        const username = parseNonEmptyString((body as Record<string, unknown>)?.username);
        const password = parseNonEmptyString((body as Record<string, unknown>)?.password);
        if (!endpoint) return json(400, { error: "Missing endpoint" });
        if (!database) return json(400, { error: "Missing database" });
        if (!username) return json(400, { error: "Missing username" });
        if (!password) return json(400, { error: "Missing password" });

        const encrypted = await deps.encryptWithContext(
          JSON.stringify({ username, password }),
          cryptoSecret,
          CRYPTO_CONTEXT,
        );

        const { error } = await admin
          .from("user_provider_connections")
          .upsert({
            user_id: userId,
            provider,
            connection_type: connectionType,
            status: "connected",
            credential_encrypted: encrypted,
            metadata_jsonb: { endpoint, database, username },
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,provider,connection_type" });
        if (error) return json(400, { error: error.message });
        return json(200, { ok: true, status: "connected", metadata: { endpoint, database, username } });
      }

      return json(400, { error: `Unsupported provider/connection_type: ${provider}/${connectionType}` });
    }
```

Also extend the `disconnect` handler to remove the v1 guard:

```typescript
    if (req.method === "POST" && action === "disconnect") {
      // ... remove the provider !== "google" guard ...
      // Allow any provider/connection_type pair to disconnect
    }
```

**Step 4: Run tests again**

Run: `cd supabase && deno test functions/provider-connections/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/provider-connections/index.ts supabase/functions/provider-connections/index.test.ts
git commit -m "feat: support GCS and ArangoDB connection types in provider-connections"
```

---

### Task 2.2: Register GCS and ArangoDB as Services

**Files:**
- Create: `supabase/migrations/20260316000000_097_register_gcs_arangodb_services.sql`

**Context:** Register GCS and ArangoDB as services in the registry with their Load-relevant functions. GCS is imported from the Kestra catalog (`io.kestra.plugin.gcp.gcs`). ArangoDB is BD-native (no Kestra plugin exists).

**Step 1: Write the migration**

```sql
-- Register GCS and ArangoDB as Load-capable services.

-- Add 'integration' to service types if not present (for Kestra-imported services).
INSERT INTO public.service_type_catalog (service_type, label, description)
VALUES ('integration', 'Integration', 'External service integrations (imported from Kestra plugin catalog)')
ON CONFLICT (service_type) DO NOTHING;

-- GCS service (Kestra-imported, Python-translated from io.kestra.plugin.gcp.gcs)
INSERT INTO public.service_registry (service_id, service_type, service_name, base_url, config, primary_stage)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'integration',
  'gcs',
  'http://localhost:8000',
  '{"version": "0.1.0", "origin": "io.kestra.plugin.gcp.gcs"}'::jsonb,
  '["source"]'::jsonb
)
ON CONFLICT (service_type, service_name) DO UPDATE SET primary_stage = EXCLUDED.primary_stage;

-- GCS functions
INSERT INTO public.service_functions (service_id, function_name, function_type, bd_stage, label, entrypoint, http_method, parameter_schema, description, tags)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'gcs_list', 'source', 'source', 'List Objects', '/gcs_list', 'POST',
   '[
     {"name": "connection_id", "type": "string", "required": true, "description": "User provider connection ID for GCS credentials"},
     {"name": "bucket", "type": "string", "required": true, "description": "GCS bucket name"},
     {"name": "prefix", "type": "string", "required": false, "description": "Object prefix filter (folder path)"},
     {"name": "glob", "type": "string", "required": false, "default": "*.csv", "description": "File pattern filter (e.g., *.csv, *.json)"}
   ]'::jsonb,
   'List objects in a GCS bucket matching prefix and glob pattern.',
   '["gcs", "google", "cloud-storage", "list", "source"]'::jsonb),

  ('b0000000-0000-0000-0000-000000000001', 'gcs_download', 'source', 'source', 'Download Object', '/gcs_download', 'POST',
   '[
     {"name": "connection_id", "type": "string", "required": true, "description": "User provider connection ID for GCS credentials"},
     {"name": "bucket", "type": "string", "required": true, "description": "GCS bucket name"},
     {"name": "object_name", "type": "string", "required": true, "description": "Full object path in the bucket"},
     {"name": "parse_csv", "type": "boolean", "required": false, "default": true, "description": "If true and file is CSV, parse rows into JSON documents"},
     {"name": "key_column", "type": "string", "required": false, "description": "CSV column to use as _key in output documents"}
   ]'::jsonb,
   'Download an object from GCS. Optionally parse CSV into JSON documents.',
   '["gcs", "google", "cloud-storage", "download", "csv", "source"]'::jsonb)
ON CONFLICT (service_id, function_name) DO NOTHING;

-- ArangoDB service (BD-native — no Kestra plugin equivalent)
INSERT INTO public.service_registry (service_id, service_type, service_name, base_url, config, primary_stage)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'integration',
  'arangodb',
  'http://localhost:8000',
  '{"version": "0.1.0", "origin": "blockdata.arangodb"}'::jsonb,
  '["source", "destination"]'::jsonb
)
ON CONFLICT (service_type, service_name) DO UPDATE SET primary_stage = EXCLUDED.primary_stage;

-- ArangoDB functions
INSERT INTO public.service_functions (service_id, function_name, function_type, bd_stage, label, entrypoint, http_method, parameter_schema, description, tags)
VALUES
  ('b0000000-0000-0000-0000-000000000002', 'arangodb_query', 'source', 'source', 'Query Documents', '/arangodb_query', 'POST',
   '[
     {"name": "connection_id", "type": "string", "required": true, "description": "User provider connection ID for ArangoDB credentials"},
     {"name": "collection", "type": "string", "required": false, "description": "Collection name (for simple queries)"},
     {"name": "aql", "type": "string", "required": false, "description": "AQL query (overrides collection if provided)"},
     {"name": "bind_vars", "type": "object", "required": false, "description": "AQL bind variables"},
     {"name": "limit", "type": "integer", "required": false, "default": 1000, "description": "Maximum documents to return"}
   ]'::jsonb,
   'Query documents from an ArangoDB collection or via AQL.',
   '["arangodb", "nosql", "document", "graph", "query", "source"]'::jsonb),

  ('b0000000-0000-0000-0000-000000000002', 'arangodb_load', 'destination', 'destination', 'Load Documents', '/arangodb_load', 'POST',
   '[
     {"name": "connection_id", "type": "string", "required": true, "description": "User provider connection ID for ArangoDB credentials"},
     {"name": "collection", "type": "string", "required": true, "description": "Target ArangoDB collection name"},
     {"name": "documents", "type": "array", "required": false, "description": "JSON documents to insert (for direct load)"},
     {"name": "source_uri", "type": "string", "required": false, "description": "URI of source file (CSV, JSON, JSONL) in platform storage"},
     {"name": "write_mode", "type": "enum", "required": false, "default": "insert", "values": ["insert", "upsert", "replace"], "description": "Write mode"},
     {"name": "key_field", "type": "string", "required": false, "description": "Document field to use as _key (for upsert/replace modes)"},
     {"name": "create_collection", "type": "boolean", "required": false, "default": false, "description": "Create collection if it does not exist"}
   ]'::jsonb,
   'Load documents into an ArangoDB collection from JSON array or file.',
   '["arangodb", "nosql", "document", "graph", "load", "destination", "bulk"]'::jsonb)
ON CONFLICT (service_id, function_name) DO NOTHING;

-- Map to integration catalog items (if they exist)
UPDATE public.integration_catalog_items
  SET mapped_service_id = 'b0000000-0000-0000-0000-000000000001'
  WHERE plugin_group = 'io.kestra.plugin.gcp.gcs'
    AND mapped_service_id IS NULL;

NOTIFY pgrst, 'reload schema';
```

**Step 2: Verify**

Run: `npx supabase db reset`
Expected: PASS. MongoDB and ArangoDB appear in the services UI with Source and Destination functions.

**Step 3: Commit**

```bash
git add supabase/migrations/20260316000000_097_register_gcs_arangodb_services.sql
git commit -m "feat: register GCS and ArangoDB as Load-capable services in registry"
```

---

# Phase 3 — Plugin Execution

### Task 3.0: Source-to-Destination Handoff Contract

**No files — design decision to document before implementation.**

**Problem:** A source function produces data (e.g., a list of CSV file contents parsed into JSON docs). A destination function consumes it. How does data pass between them?

**Decision:** Source functions that produce large datasets write their output as a temporary artifact in platform storage (Supabase Storage `pipeline` bucket) and return a `storage_uri` reference. Destination functions accept either:
- `documents`: an inline JSON array (for small payloads, <1MB)
- `source_uri`: a storage URI pointing to a JSONL file (for large payloads)

This avoids passing raw CSV content through the UI or a single synchronous hop. The Load page orchestrates: call source → get `storage_uri` → pass to destination.

**For the GCS CSV → Arango proof point:**
1. `gcs_download` reads a CSV from GCS, parses it, writes JSONL to platform storage, returns `{ storage_uri, row_count }`
2. `arangodb_load` accepts `source_uri`, reads JSONL from storage, batch-inserts into Arango
3. The Load page UI calls source, gets the URI, passes it to destination

**For future scale:** Item-level tracking (per-file in a multi-file load) can be added as a subordinate of `service_runs` later. For MVP, one source call + one destination call per file, tracked as a single run.

---

### Task 3.1: GCS Source Plugin (Python)

**Files:**
- Create: `services/platform-api/app/plugins/gcs.py`
- Create: `services/platform-api/tests/plugins/test_gcs.py`

**Context:** Translate the Kestra `io.kestra.plugin.gcp.gcs.List` and `io.kestra.plugin.gcp.gcs.Download` tasks into Python plugins following the existing `BasePlugin` pattern. The plugin receives `connection_id` in params, resolves the encrypted GCS service account credential from `user_provider_connections`, generates a short-lived OAuth2 access token (same pattern as `vertex_auth.ts`), and uses the GCS JSON API via `httpx`.

**Step 1: Write failing tests**

Create `services/platform-api/tests/plugins/test_gcs.py`:

```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.plugins.mongodb import MongoDBFindPlugin, MongoDBLoadPlugin
from app.shared.base import PluginOutput
from app.shared.context import ExecutionContext


@pytest.fixture
def context():
    return ExecutionContext(execution_id="test-exec-1")


@pytest.mark.asyncio
async def test_find_returns_documents(context):
    plugin = MongoDBFindPlugin()
    assert "blockdata.mongodb.find" in plugin.task_types

    with patch("app.plugins.mongodb.resolve_connection") as mock_resolve:
        mock_resolve.return_value = {"connection_string": "mongodb://localhost:27017", "database": "testdb"}

        with patch("app.plugins.mongodb.get_mongo_client") as mock_client:
            mock_collection = AsyncMock()
            mock_collection.find.return_value.to_list = AsyncMock(return_value=[
                {"_id": "1", "name": "Alice"},
                {"_id": "2", "name": "Bob"},
            ])
            mock_client.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                __getitem__=lambda self, db: MagicMock(__getitem__=lambda self, col: mock_collection)
            ))
            mock_client.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await plugin.run({
                "connection_id": "conn-1",
                "collection": "users",
                "filter": {},
                "limit": 100,
            }, context)

    assert result.state == "SUCCESS"
    assert len(result.data["documents"]) == 2


@pytest.mark.asyncio
async def test_load_inserts_documents(context):
    plugin = MongoDBLoadPlugin()
    assert "blockdata.mongodb.load" in plugin.task_types

    with patch("app.plugins.mongodb.resolve_connection") as mock_resolve:
        mock_resolve.return_value = {"connection_string": "mongodb://localhost:27017", "database": "testdb"}

        with patch("app.plugins.mongodb.get_mongo_client") as mock_client:
            mock_collection = AsyncMock()
            mock_collection.insert_many = AsyncMock(return_value=MagicMock(inserted_ids=["1", "2"]))
            mock_client.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                __getitem__=lambda self, db: MagicMock(__getitem__=lambda self, col: mock_collection)
            ))
            mock_client.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await plugin.run({
                "connection_id": "conn-1",
                "collection": "users",
                "documents": [{"name": "Alice"}, {"name": "Bob"}],
            }, context)

    assert result.state == "SUCCESS"
    assert result.data["inserted"] == 2
```

**Step 2: Run tests to verify they fail**

Run: `cd services/platform-api && python -m pytest tests/plugins/test_mongodb.py -v`
Expected: FAIL (module not found)

**Step 3: Implement the plugin**

Create `services/platform-api/app/plugins/mongodb.py`:

```python
"""MongoDB plugins — Find and Load. Translated from io.kestra.plugin.mongodb."""

from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient

from ..shared.base import BasePlugin, PluginOutput
from ..shared import output as out
from ..shared.connection import resolve_connection


async def get_mongo_client(connection_string: str) -> AsyncIOMotorClient:
    return AsyncIOMotorClient(connection_string)


class MongoDBFindPlugin(BasePlugin):
    """Query documents. Equivalent to io.kestra.plugin.mongodb.Find."""

    task_types = [
        "blockdata.mongodb.find",
        "io.kestra.plugin.mongodb.Find",
    ]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        creds = await resolve_connection(params["connection_id"], context)
        collection_name = params.get("collection", "")
        query_filter = params.get("filter", {})
        projection = params.get("projection")
        sort_spec = params.get("sort")
        limit = params.get("limit", 1000)

        if not collection_name:
            return out.failed("Missing collection name")

        async with get_mongo_client(creds["connection_string"]) as client:
            db = client[creds["database"]]
            collection = db[collection_name]

            cursor = collection.find(query_filter, projection)
            if sort_spec:
                cursor = cursor.sort(list(sort_spec.items()))
            docs = await cursor.to_list(length=limit)

        # Convert ObjectId to string for JSON serialization
        for doc in docs:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])

        return out.success(
            data={"documents": docs, "count": len(docs)},
            logs=[f"Found {len(docs)} documents in {collection_name}"],
        )

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "connection_id", "type": "string", "required": True},
            {"name": "collection", "type": "string", "required": True},
            {"name": "filter", "type": "object", "required": False, "default": {}},
            {"name": "projection", "type": "object", "required": False},
            {"name": "sort", "type": "object", "required": False},
            {"name": "limit", "type": "integer", "required": False, "default": 1000},
        ]


class MongoDBLoadPlugin(BasePlugin):
    """Bulk insert documents. Equivalent to io.kestra.plugin.mongodb.Load."""

    task_types = [
        "blockdata.mongodb.load",
        "io.kestra.plugin.mongodb.Load",
    ]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        creds = await resolve_connection(params["connection_id"], context)
        collection_name = params.get("collection", "")
        documents = params.get("documents", [])
        write_mode = params.get("write_mode", "insert")

        if not collection_name:
            return out.failed("Missing collection name")
        if not documents:
            return out.failed("No documents to load")

        async with get_mongo_client(creds["connection_string"]) as client:
            db = client[creds["database"]]
            collection = db[collection_name]

            if write_mode == "insert":
                result = await collection.insert_many(documents)
                inserted = len(result.inserted_ids)
                return out.success(
                    data={"inserted": inserted, "collection": collection_name},
                    logs=[f"Inserted {inserted} documents into {collection_name}"],
                )

            # upsert and replace modes deferred to Phase 3
            return out.failed(f"Write mode '{write_mode}' not yet supported")

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "connection_id", "type": "string", "required": True},
            {"name": "collection", "type": "string", "required": True},
            {"name": "documents", "type": "array", "required": False},
            {"name": "source_uri", "type": "string", "required": False},
            {"name": "write_mode", "type": "enum", "required": False, "default": "insert", "values": ["insert", "upsert", "replace"]},
            {"name": "key_field", "type": "string", "required": False},
        ]
```

**Step 4: Create the shared connection resolver**

Create `services/platform-api/app/shared/connection.py`:

```python
"""Resolve user-scoped credentials from user_provider_connections."""

import json
import os
from typing import Any

from .supabase_client import get_supabase_admin


async def resolve_connection(connection_id: str, context: Any = None) -> dict[str, Any]:
    """
    Fetch and decrypt credentials for a user_provider_connections row.

    Returns the decrypted credential dict merged with metadata_jsonb.
    The decryption happens server-side via Supabase service role access.
    """
    sb = get_supabase_admin()
    result = sb.table("user_provider_connections").select(
        "credential_encrypted, metadata_jsonb, provider, connection_type, status"
    ).eq("id", connection_id).single().execute()

    row = result.data
    if not row:
        raise ValueError(f"Connection {connection_id} not found")
    if row.get("status") != "connected":
        raise ValueError(f"Connection {connection_id} is {row.get('status')}, not connected")

    # Decrypt credential
    from .api_key_crypto import decrypt_with_context
    secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    credential_json = await decrypt_with_context(row["credential_encrypted"], secret, "provider-connections-v1")
    creds = json.loads(credential_json)

    # Merge with metadata
    metadata = row.get("metadata_jsonb", {}) or {}
    return {**metadata, **creds}
```

**Step 5: Run tests again**

Run: `cd services/platform-api && python -m pytest tests/plugins/test_mongodb.py -v`
Expected: PASS

**Step 6: Commit**

```bash
git add services/platform-api/app/plugins/mongodb.py services/platform-api/app/shared/connection.py services/platform-api/tests/plugins/test_mongodb.py
git commit -m "feat: add MongoDB Find and Load plugins with connection resolution"
```

---

### Task 3.2: ArangoDB Plugin (Python)

**Files:**
- Create: `services/platform-api/app/plugins/arangodb.py`
- Create: `services/platform-api/tests/plugins/test_arangodb.py`

**Context:** BD-native ArangoDB plugin. Uses ArangoDB HTTP API via `httpx` (no SDK dependency). Same `BasePlugin` pattern as MongoDB.

**Step 1: Write failing tests**

Create `services/platform-api/tests/plugins/test_arangodb.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch
from app.plugins.arangodb import ArangoDBQueryPlugin, ArangoDBLoadPlugin
from app.shared.context import ExecutionContext


@pytest.fixture
def context():
    return ExecutionContext(execution_id="test-exec-1")


@pytest.mark.asyncio
async def test_query_returns_documents(context):
    plugin = ArangoDBQueryPlugin()
    assert "blockdata.arangodb.query" in plugin.task_types

    with patch("app.plugins.arangodb.resolve_connection") as mock_resolve:
        mock_resolve.return_value = {
            "endpoint": "https://test.arangodb.cloud:8529",
            "database": "_system",
            "username": "root",
            "password": "secret",
        }

        with patch("app.plugins.arangodb.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value.status_code = 201
            mock_client.post.return_value.json.return_value = {
                "result": [{"_key": "1", "name": "Alice"}, {"_key": "2", "name": "Bob"}],
                "hasMore": False,
            }
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await plugin.run({
                "connection_id": "conn-1",
                "collection": "users",
                "limit": 100,
            }, context)

    assert result.state == "SUCCESS"
    assert len(result.data["documents"]) == 2


@pytest.mark.asyncio
async def test_load_inserts_documents(context):
    plugin = ArangoDBLoadPlugin()
    assert "blockdata.arangodb.load" in plugin.task_types

    with patch("app.plugins.arangodb.resolve_connection") as mock_resolve:
        mock_resolve.return_value = {
            "endpoint": "https://test.arangodb.cloud:8529",
            "database": "_system",
            "username": "root",
            "password": "secret",
        }

        with patch("app.plugins.arangodb.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            # Batch insert returns array of results
            mock_client.post.return_value.status_code = 202
            mock_client.post.return_value.json.return_value = [
                {"_key": "1", "_id": "users/1", "_rev": "abc"},
                {"_key": "2", "_id": "users/2", "_rev": "def"},
            ]
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await plugin.run({
                "connection_id": "conn-1",
                "collection": "users",
                "documents": [{"name": "Alice"}, {"name": "Bob"}],
            }, context)

    assert result.state == "SUCCESS"
    assert result.data["inserted"] == 2
```

**Step 2: Implement the plugin**

Create `services/platform-api/app/plugins/arangodb.py`:

```python
"""ArangoDB plugins — Query and Load. BD-native (no Kestra equivalent)."""

from typing import Any

import httpx

from ..shared.base import BasePlugin, PluginOutput
from ..shared import output as out
from ..shared.connection import resolve_connection

BATCH_SIZE = 500


class ArangoDBQueryPlugin(BasePlugin):
    """Query documents via AQL or simple collection scan."""

    task_types = ["blockdata.arangodb.query"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        creds = await resolve_connection(params["connection_id"], context)
        endpoint = creds["endpoint"].rstrip("/")
        database = creds["database"]
        username = creds["username"]
        password = creds["password"]

        collection = params.get("collection", "")
        aql = params.get("aql", "")
        bind_vars = params.get("bind_vars", {})
        limit = params.get("limit", 1000)

        if not aql and not collection:
            return out.failed("Provide either 'collection' or 'aql'")

        if not aql:
            aql = f"FOR doc IN {collection} LIMIT @limit RETURN doc"
            bind_vars["limit"] = limit

        url = f"{endpoint}/_db/{database}/_api/cursor"
        auth = httpx.BasicAuth(username, password)

        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json={"query": aql, "bindVars": bind_vars}, auth=auth, timeout=60)
            if resp.status_code not in (200, 201):
                return out.failed(f"AQL query failed: HTTP {resp.status_code} — {resp.text[:500]}")
            body = resp.json()

        docs = body.get("result", [])
        return out.success(
            data={"documents": docs, "count": len(docs)},
            logs=[f"Returned {len(docs)} documents"],
        )

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "connection_id", "type": "string", "required": True},
            {"name": "collection", "type": "string", "required": False},
            {"name": "aql", "type": "string", "required": False},
            {"name": "bind_vars", "type": "object", "required": False},
            {"name": "limit", "type": "integer", "required": False, "default": 1000},
        ]


class ArangoDBLoadPlugin(BasePlugin):
    """Bulk insert documents into an ArangoDB collection."""

    task_types = ["blockdata.arangodb.load"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        creds = await resolve_connection(params["connection_id"], context)
        endpoint = creds["endpoint"].rstrip("/")
        database = creds["database"]
        username = creds["username"]
        password = creds["password"]

        collection = params.get("collection", "")
        documents = params.get("documents", [])
        create_collection = params.get("create_collection", False)

        if not collection:
            return out.failed("Missing collection name")
        if not documents:
            return out.failed("No documents to load")

        auth = httpx.BasicAuth(username, password)
        base_url = f"{endpoint}/_db/{database}"

        async with httpx.AsyncClient() as client:
            # Optionally create collection
            if create_collection:
                await client.post(
                    f"{base_url}/_api/collection",
                    json={"name": collection},
                    auth=auth,
                    timeout=30,
                )
                # Ignore 409 (already exists)

            # Batch insert
            total_inserted = 0
            total_failed = 0
            errors: list[str] = []

            for i in range(0, len(documents), BATCH_SIZE):
                batch = documents[i:i + BATCH_SIZE]
                resp = await client.post(
                    f"{base_url}/_api/document/{collection}",
                    json=batch,
                    auth=auth,
                    timeout=60,
                )
                if resp.status_code in (200, 201, 202):
                    results = resp.json()
                    if isinstance(results, list):
                        for r in results:
                            if isinstance(r, dict) and r.get("error"):
                                total_failed += 1
                                errors.append(r.get("errorMessage", "unknown"))
                            else:
                                total_inserted += 1
                    else:
                        total_inserted += len(batch)
                else:
                    total_failed += len(batch)
                    errors.append(f"Batch failed: HTTP {resp.status_code}")

        state = "SUCCESS" if total_failed == 0 else "WARNING"
        return PluginOutput(
            state=state,
            data={
                "inserted": total_inserted,
                "failed": total_failed,
                "collection": collection,
                "errors": errors[:10],
            },
            logs=[f"Inserted {total_inserted}, failed {total_failed} into {collection}"],
        )

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return [
            {"name": "connection_id", "type": "string", "required": True},
            {"name": "collection", "type": "string", "required": True},
            {"name": "documents", "type": "array", "required": False},
            {"name": "source_uri", "type": "string", "required": False},
            {"name": "write_mode", "type": "enum", "required": False, "default": "insert", "values": ["insert", "upsert", "replace"]},
            {"name": "key_field", "type": "string", "required": False},
            {"name": "create_collection", "type": "boolean", "required": False, "default": False},
        ]
```

**Step 3: Run tests**

Run: `cd services/platform-api && python -m pytest tests/plugins/test_arangodb.py -v`
Expected: PASS

**Step 4: Commit**

```bash
git add services/platform-api/app/plugins/arangodb.py services/platform-api/tests/plugins/test_arangodb.py
git commit -m "feat: add ArangoDB Query and Load plugins (BD-native)"
```

---

### Task 3.3: Run Tracking via service_runs

**Files:**
- Modify: `services/platform-api/app/main.py`

**Context:** The current `POST /{function_name}` endpoint executes a plugin and returns the result. Extend it to optionally create a `service_runs` row before execution, update it on completion, and return the `run_id` so the frontend can track progress.

**Step 1: Add run tracking to the execute endpoint**

In `services/platform-api/app/main.py`, modify the `execute` function:

```python
@app.post("/{function_name}")
async def execute(function_name: str, request: PluginRequest) -> PluginResponse:
    task_type = registry.resolve_by_function_name(function_name)
    if not task_type:
        raise HTTPException(404, f"No handler for function: {function_name}")

    plugin = registry.resolve(task_type)
    if not plugin:
        raise HTTPException(404, f"No handler for task type: {task_type}")

    context = ExecutionContext(
        execution_id=request.execution_id,
        task_run_id=request.task_run_id,
        variables=request.variables,
    )

    # Create service_runs row if tracking is requested
    run_id = None
    if request.track_run:
        sb = get_supabase_admin()
        run_row = sb.table("service_runs").insert({
            "function_id": request.function_id,
            "service_id": request.service_id,
            "project_id": request.project_id,
            "status": "running",
            "config_snapshot": request.params,
            "started_at": _now_iso(),
        }).execute()
        if run_row.data:
            run_id = run_row.data[0]["run_id"]

    try:
        result = await plugin.run(request.params, context)
    except Exception as e:
        logger.error(f"Plugin {function_name} failed: {e}\n{traceback.format_exc()}")
        result = PluginOutput(state="FAILED", logs=[str(e)])

    # Update service_runs row
    if run_id:
        sb = get_supabase_admin()
        sb.table("service_runs").update({
            "status": "complete" if result.state == "SUCCESS" else "failed",
            "result": result.data,
            "error_message": result.logs[-1] if result.state == "FAILED" and result.logs else None,
            "rows_affected": result.data.get("inserted") or result.data.get("count"),
            "completed_at": _now_iso(),
        }).eq("run_id", run_id).execute()

    return PluginResponse(function_name=function_name, output=result, run_id=run_id)
```

Add to `PluginRequest`:

```python
class PluginRequest(BaseModel):
    params: dict[str, Any] = {}
    execution_id: str = ""
    task_run_id: str = ""
    variables: dict[str, Any] = {}
    # Run tracking (optional)
    track_run: bool = False
    function_id: str | None = None
    service_id: str | None = None
    project_id: str | None = None
```

Add to `PluginResponse`:

```python
class PluginResponse(BaseModel):
    function_name: str
    output: PluginOutput
    run_id: str | None = None
```

**Step 2: Commit**

```bash
git add services/platform-api/app/main.py
git commit -m "feat: add optional service_runs tracking to plugin execution"
```

---

# Phase 4 — Connections Settings UI

### Task 4.1: Connections Panel

**Files:**
- Create: `web/src/pages/settings/ConnectionsPanel.tsx`
- Modify: `web/src/pages/settings/settings-nav.ts`
- Modify: `web/src/pages/settings/settings-tabs.ts`

**Context:** Add a settings panel where users can manage their MongoDB and ArangoDB connections. Follow the existing `SettingsProviderForm.tsx` pattern: input credentials, test connection, save.

**Step 1: Build the panel**

The panel lists saved connections and provides an "Add Connection" form with:
- Type selector: MongoDB / ArangoDB
- For MongoDB: connection string, database name
- For ArangoDB: endpoint URL, database, username, password
- Test Connection button (calls `provider-connections/connect` in dry-run mode)
- Save / Delete
- Status badge per connection

**Step 2: Wire into settings nav**

In `settings-nav.ts`, add a "Connections" entry.
In `settings-tabs.ts`, register the connections tab.

**Step 3: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add web/src/pages/settings/ConnectionsPanel.tsx web/src/pages/settings/settings-nav.ts web/src/pages/settings/settings-tabs.ts
git commit -m "feat: add Connections settings panel for MongoDB and ArangoDB"
```

---

# Phase 5 — Load Page

### Task 5.1: Load Page UI

**Files:**
- Create: `web/src/pages/LoadPage.tsx`
- Create: `web/src/hooks/useLoadJob.ts`
- Modify: `web/src/router.tsx`
- Modify: `web/src/components/shell/nav-config.ts`

**Context:** Minimal Load wizard. User picks a source service function, picks a destination service function, configures parameters (with connection binding), and runs. Progress tracked via `service_runs`.

**Step 1: Build the hook**

`useLoadJob` manages:
- Loading available source/destination functions from `service_functions_view` filtered by `pipeline_stages`
- Loading user connections from `user_provider_connections`
- Submitting execution to `POST /{function_name}` with `track_run: true`
- Watching `service_runs` via Realtime for status updates

**Step 2: Build the page**

Wizard flow:
1. **Source**: select a source function (e.g., "GCS Download" or "MongoDB Find"), select connection, configure params
2. **Destination**: select a destination function (e.g., "ArangoDB Load" or "MongoDB Load"), select connection, configure params
3. **Review**: show summary of source → destination configuration
4. **Run**: execute source function, pipe result to destination function, track via service_runs
5. **Progress**: job status badge, rows affected, errors

**Step 3: Wire routing and nav**

Add `/app/load` route and "Load" entry in main nav between "Extract" and "Transform".

**Step 4: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/pages/LoadPage.tsx web/src/hooks/useLoadJob.ts web/src/router.tsx web/src/components/shell/nav-config.ts
git commit -m "feat: add Load page with source/destination function selection and execution"
```

---

# Verification

1. `npx supabase db reset` — PASS
2. `cd services/platform-api && python -m pytest tests/plugins/test_mongodb.py tests/plugins/test_arangodb.py -v` — PASS
3. `cd web && npx tsc --noEmit` — PASS
4. Manual smoke test:
   - Settings → Connections: add a MongoDB connection, test → valid
   - Settings → Connections: add an ArangoDB connection, test → valid
   - Load page: select MongoDB Find as source, configure collection + filter
   - Load page: select ArangoDB Load as destination, configure collection
   - Run → watch progress → verify documents appear in Arango
   - Check service_runs table → execution tracked with status, rows_affected

---

# What Ships Next

1. **MongoDB as reference integration** — translate `io.kestra.plugin.mongodb.Find` and `Load` to Python using the same BasePlugin pattern; proves Kestra-imported integrations work alongside BD-native ones
2. **Arango → Platform import** — ArangoDB Query results materialized as `source_documents` for Parse/Extract
3. **Write modes** — upsert/replace for ArangoDB Load plugin
4. **Broader catalog categorization** — classify remaining Load-capable services with correct `primary_stage` and `bd_stage`
5. **Item-level tracking** — `service_run_items` as subordinate of `service_runs` for multi-file Load jobs
6. **Multi-step flow composition** — chain source → transform → destination in a single job

---

# Design Decisions

| Decision | Rationale |
|----------|-----------|
| Fix code to match schema, not schema to match code | The schema (`service_registry`, `service_functions`, `service_type_catalog`) is the canonical identity defined in migration 050. Code in 16 files drifted. Schema is the source of truth. |
| Dual-level categorization: `primary_stage` on services, `bd_stage` on functions | A service participates in stages (discovery); individual functions have execution-level roles. When forced to choose, function-level `bd_stage` wins for execution routing. |
| GCS → ArangoDB as proof point, not MongoDB → ArangoDB | GCS → Arango matches the immediate business need and the declared architectural checkpoint. MongoDB is reference evidence for later scale-out (Phase 3+ ideas). |
| Source-to-destination handoff via storage artifact references | Source functions write output to platform storage (JSONL) and return a `storage_uri`. Destination functions accept `source_uri`. Avoids passing raw payloads through the UI or synchronous hops. Scales to large datasets. |
| `connection_id` in plugin params, not in context | Each function call can use a different connection. The connection is a parameter, not an ambient environment variable. This supports multi-tenant and multi-destination workflows. |
| Run tracking is opt-in (`track_run: true`) | Not every plugin invocation needs a database row. Quick utility calls (Log, HTTP) skip tracking. Load operations enable it. |
| Plugins in `services/platform-api/`, not edge functions | The plugin execution runtime is Python (FastAPI). Edge functions handle auth, CRUD, and Supabase-native operations. Heavy data movement belongs in Python. |
| No new `connector_jobs` table | `service_runs` already provides job tracking. Item-level tracking lives as a subordinate of service_runs, not a parallel system. |
| Kestra identifiers preserved as metadata | `task_class`, `plugin_group`, original function names kept in `integration_catalog_items` and service config for traceability. BD-native names are the canonical runtime identity. |

---

# Revision Notes

This plan was revised after assessment feedback (2026-03-15). Key corrections from the original version:

1. **Rename direction reversed**: schema is canonical, code gets fixed (not the other way around)
2. **Proof point corrected**: GCS → Arango (matches business need), not MongoDB → Arango
3. **Dual-level categorization**: `primary_stage` on services + `bd_stage` on functions (not service-only `pipeline_stages`)
4. **Handoff contract added**: explicit artifact/reference passing between source and destination (Task 3.0)
5. **Phase 3 test/implementation code**: references `test_gcs.py` and `gcs.py` — the MongoDB test/implementation blocks in Phase 3 are from the pre-revision plan and should be rewritten to GCS equivalents following the same BasePlugin pattern but using GCS JSON API via httpx + service account JWT auth (pattern from `vertex_auth.ts`). The ArangoDB plugin code (Task 3.2) is already correct.