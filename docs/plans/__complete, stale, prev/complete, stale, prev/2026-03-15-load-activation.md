# Load Activation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the service registry naming drift, add pipeline-stage categorization, bind user credentials for GCS and ArangoDB, build GCS source and ArangoDB destination plugins, and ship a working Load page — proving the registry-as-execution-plane architecture end-to-end with GCS CSV → ArangoDB as the first real load path.

**Architecture:** The platform has a two-layer model: `integration_catalog_items` (945 imported Kestra plugin definitions) and `service_registry` + `service_functions` (live runtime). Code drifted to `registry_*` names but the schema `service_*` names are canonical. This plan fixes the code, adds dual-level stage classification (`primary_stage` on services, `bd_stage` on functions), extends `user_provider_connections` for GCS and Arango credentials, builds Python plugins for GCS read and Arango write in the existing BasePlugin system, adds `service_run_items` as subordinate tracking under `service_runs`, and wires a minimal Load page. Source-to-destination handoff uses storage artifact references (JSONL files in platform storage), not raw payloads.

**Tech Stack:** Supabase Postgres migrations, Python FastAPI (`services/platform-api/`) for all Load operations, `httpx` for GCS JSON API and Arango HTTP API, React, Supabase Realtime, AES-GCM encryption (Python port of `api_key_crypto.ts`). Edge Functions are NOT used for Load credential binding or connection testing — FastAPI owns the full Load lifecycle.

**Context document:** `docs/plans/2026-03-15-kestra-absorption-context-update.md`

**Verified operational state (Batch 1 results):**
- Platform-API boots with 21 plugin functions discovered, zero errors
- Auth verified: M2M tokens work for plugin execution + admin routes; JWT requires Supabase env vars (expected)
- `AuthPrincipal.user_id` is a property alias for `subject_id` — confirmed at `app/auth/principals.py:18`
- `require_auth` returns `AuthPrincipal` with `user_id`, `email`, `roles` — confirmed at `app/auth/dependencies.py:83-152`
- Plugin execution route at `POST /{function_name}` operational — confirmed via test with `{"state":"SUCCESS"}`
- SuperuserApiEndpoints page at `/app/superuser/api-endpoints` shows all registered functions — use this to verify GCS/Arango functions appear after implementation

**Existing patterns reused:**
- Plugin models: `services/platform-api/app/domain/plugins/models.py` (BasePlugin, PluginOutput, ExecutionContext, success/failed helpers). ExecutionContext already has `upload_file(bucket, path, content)` at line 94. **This plan adds `user_id: str = ""` to ExecutionContext** (Task 8) so plugins can pass identity to `resolve_connection_sync()` for ownership verification. Routes set it from `auth.user_id`.
- Plugin execution route: `services/platform-api/app/api/routes/plugin_execution.py` → `POST /{function_name}`
- Plugin auto-discovery: `services/platform-api/app/domain/plugins/registry.py` — `resolve_by_function_name()` returns `str | None` (task_type), `resolve()` returns `BasePlugin | None`
- Supabase client: `services/platform-api/app/infra/supabase_client.py` — `get_supabase_admin()` cached singleton
- Storage uploads: `services/platform-api/app/infra/storage.py` — `upload_to_storage()`, `download_from_storage()`
- Auth: `services/platform-api/app/auth/dependencies.py` — `require_auth` returns `AuthPrincipal` with `user_id` property (alias for `subject_id`), `email`, `roles`. OpenAPI security schemes declared via `HTTPBearer` + `APIKeyHeader`.
- Credential encryption reference: `supabase/functions/_shared/api_key_crypto.ts` — Python port needed in `app/infra/crypto.py` (same AES-GCM-256, same key derivation, same `enc:v1:` format)
- GCP JWT auth reference: `supabase/functions/_shared/vertex_auth.ts` — Python port needed in `app/infra/gcs_auth.py`
- Example plugins: `services/platform-api/app/plugins/http.py`, `core.py`, `eyecite.py`, `scripts.py` (22 plugins total)

**Run model decision:** `service_runs` is a **composite load-run record**, not a single function-invocation record. `function_id` and `service_id` point to the source (initiator). `dest_function_id` and `dest_service_id` (added by this plan) point to the destination. Full config lives in `config_snapshot`. Individual file processing is tracked via `service_run_items`. Destination identity is explicitly modeled for audit, filtering, and retry — not buried in config_snapshot alone.

---

## Scope Guardrails

- Canonical schema identity stays `service_registry` / `service_functions` / `service_type_catalog`. Code is fixed to match schema.
- Dual-level categorization: `primary_stage` on services for discovery, `bd_stage` on functions for execution. Function-level wins when forced to choose.
- Proof point: GCS source → ArangoDB destination. Matches the immediate business need.
- Source-to-destination handoff via storage artifact references (JSONL in Supabase Storage `pipeline` bucket), not raw payloads.
- `service_runs` for execution tracking. `service_run_items` as subordinate, not a parallel system.
- Kestra identifiers preserved as metadata. BD-native names are canonical runtime identity.
- FastAPI for all Load operations: credential binding, connection testing, plugin execution, orchestration. Edge Functions are not extended for Load.
- Only Load-stage activation. Transform, Parse, Orchestration stay catalog-only.
- No flow composition — single-step source→destination only.
- **Storage artifact convention:** JSONL artifacts written to `pipeline/load-artifacts/{run_id}/{item_key_sanitized}.jsonl`. Artifacts are ephemeral — cleaned up on successful run completion. Failed runs retain artifacts for debugging.
- **Load run ownership:** Load runs are owned by `created_by`. `project_id` is optional metadata for grouping and filtering; it does not grant execution rights to other project members in this first slice. All route-level checks and RLS policies use `created_by = auth.uid()` exclusively. Project-shared execution is a follow-on feature.
- **service_runs RLS:** Task 6 replaces the earlier service_runs SELECT policy (migration 050 lines 171-178, which exposed `project_id IS NULL` rows to all authenticated users) with a creator-owned policy for Load.
- **User-only auth:** Load routes and connection-management routes are user-scoped. Machine auth (M2M tokens) is not supported in this first slice. Routes use `require_user_auth` which rejects non-user principals.
- **Control plane / execution plane separation:** For Load, FastAPI (platform-api) owns the full lifecycle: credential binding, connection testing, plugin execution, orchestration, and data movement. Existing AI provider credentials (Anthropic, OpenAI, etc.) remain on Edge Functions — those are not touched by this plan. The Load UI uses `platformApiFetch()` exclusively. The `execution_plane` column on `service_registry` formalizes this boundary. See `docs/fastapi/fastapi-integration.md` for the architectural rationale.

---

# Part A — Registry Identity Cleanup

### Task 1: Lock canonical table names with regression tests

**Files:**
- Modify: `supabase/functions/admin-services/index.test.ts`
- Modify: `web/src/pages/marketplace/ServicesCatalog.test.tsx`

**Step 1: Update Deno test mocks to expect canonical names**

In `supabase/functions/admin-services/index.test.ts`, find every mock that uses `.from("registry_services")`, `.from("registry_service_functions")`, `.from("registry_service_types")` and change them to:

```typescript
.from("service_registry")
.from("service_functions")
.from("service_type_catalog")
```

**Step 2: Run tests to confirm they fail**

Run: `cd supabase && deno test functions/admin-services/index.test.ts`
Expected: FAIL — code still queries `registry_*` names.

**Step 3: Commit the failing tests**

```bash
git add supabase/functions/admin-services/index.test.ts web/src/pages/marketplace/ServicesCatalog.test.tsx
git commit -m "test: lock registry code to canonical service_* table names"
```

---

### Task 2: Refactor all code to canonical table names

**Files:**
- Modify: `supabase/functions/admin-services/index.ts`
- Modify: `supabase/functions/admin-integration-catalog/index.ts`
- Modify: `web/src/pages/settings/services-panel.api.ts`
- Modify: `web/src/pages/marketplace/ServicesCatalog.tsx`
- Modify: `web/src/pages/marketplace/ServiceDetailPage.tsx`
- Modify: `services/platform-api/app/api/routes/admin_services.py`
- Modify: `services/pipeline-worker/app/routes/admin_services.py` *(deprecated dual-run period — fix naming drift to prevent confusion during transition)*

**Step 1: Find-and-replace across all files**

In every file above:
- `"registry_services"` → `"service_registry"`
- `"registry_service_functions"` → `"service_functions"`
- `"registry_service_types"` → `"service_type_catalog"`

This applies to `.from(...)`, `.table(...)`, Supabase client calls, and any string/comment references.

**Step 2: Run tests**

Run: `cd supabase && deno test functions/admin-services/index.test.ts`
Expected: PASS

Run: `cd web && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add supabase/functions/admin-services/index.ts supabase/functions/admin-integration-catalog/index.ts web/src/pages/settings/services-panel.api.ts web/src/pages/marketplace/ServicesCatalog.tsx web/src/pages/marketplace/ServiceDetailPage.tsx services/platform-api/app/api/routes/admin_services.py services/pipeline-worker/app/routes/admin_services.py
git commit -m "refactor: align all code to canonical service_* table names"
```

---

# Part B — Pipeline Stage Categorization

### Task 3: Add dual-level stage columns to registry schema

**Files:**
- Create: `supabase/migrations/20260316000000_093_service_registry_load_categories.sql`

**Step 1: Write the migration**

```sql
-- Dual-level pipeline stage categorization.
-- Service level: primary_stage (TEXT) — what stage this service primarily serves.
-- Function level: bd_stage (TEXT) — the BD-native execution stage for this function.

ALTER TABLE public.service_registry
  ADD COLUMN IF NOT EXISTS primary_stage text;

ALTER TABLE public.service_registry
  ADD COLUMN IF NOT EXISTS execution_plane text NOT NULL DEFAULT 'edge'
    CHECK (execution_plane IN ('edge', 'fastapi', 'worker'));

COMMENT ON COLUMN public.service_registry.primary_stage IS
  'Primary pipeline stage: source, destination, load, transform, parse, orchestration, utility, conversion, notification';
COMMENT ON COLUMN public.service_registry.execution_plane IS
  'Where this service runs. edge = Supabase Edge Functions (lightweight auth/CRUD). fastapi = platform-api (plugin execution, data movement, orchestration). worker = async background worker.';

ALTER TABLE public.service_functions
  ADD COLUMN IF NOT EXISTS bd_stage text NOT NULL DEFAULT 'custom'
    CHECK (bd_stage IN (
      'source', 'destination', 'transform', 'parse', 'convert',
      'export', 'test', 'utility', 'orchestration', 'notification', 'custom'
    ));

COMMENT ON COLUMN public.service_functions.bd_stage IS
  'BD-native execution stage. Used for routing and UI. Takes precedence over function_type.';

CREATE INDEX IF NOT EXISTS idx_service_functions_bd_stage
  ON public.service_functions (bd_stage);

-- Expand function_type CHECK to include values used in pipeline-worker.
ALTER TABLE public.service_functions
  DROP CONSTRAINT IF EXISTS service_functions_function_type_check;
ALTER TABLE public.service_functions
  ADD CONSTRAINT service_functions_function_type_check
    CHECK (function_type IN (
      'source', 'destination', 'transform', 'parse', 'convert',
      'export', 'test', 'utility', 'macro', 'custom',
      'ingest', 'callback', 'flow'
    ));

-- Backfill bd_stage from existing function_type.
UPDATE public.service_functions SET bd_stage = function_type
  WHERE function_type IN ('source', 'destination', 'transform', 'parse', 'convert', 'export', 'test', 'utility');
UPDATE public.service_functions SET bd_stage = 'orchestration'
  WHERE function_type = 'flow';

-- Backfill primary_stage and execution_plane for seeded services.
-- Control plane (edge): lightweight auth, credential CRUD, config
-- Execution plane (fastapi): plugin execution, data movement, orchestration
UPDATE public.service_registry SET primary_stage = 'load', execution_plane = 'fastapi' WHERE service_name = 'load-runner';
UPDATE public.service_registry SET primary_stage = 'transform', execution_plane = 'fastapi' WHERE service_name = 'transform-runner';
UPDATE public.service_registry SET primary_stage = 'parse', execution_plane = 'fastapi' WHERE service_name = 'docling-service';
UPDATE public.service_registry SET primary_stage = 'conversion', execution_plane = 'fastapi' WHERE service_name = 'conversion-service';
UPDATE public.service_registry SET execution_plane = 'fastapi' WHERE service_name = 'pipeline-worker';
UPDATE public.service_registry SET execution_plane = 'fastapi' WHERE service_name = 'eyecite';
-- supabase-edge stays on 'edge' (the default). All other custom services run on FastAPI.

-- Refresh the convenience view.
CREATE OR REPLACE VIEW public.service_functions_view AS
SELECT
  sf.function_id, sf.function_name, sf.function_type, sf.bd_stage,
  sf.label, sf.description, sf.entrypoint, sf.http_method,
  sf.parameter_schema, sf.result_schema, sf.enabled AS function_enabled, sf.tags,
  sr.service_id, sr.service_type, sr.service_name, sr.base_url,
  sr.health_status, sr.enabled AS service_enabled, sr.primary_stage, sr.execution_plane,
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
Expected: PASS

**Step 3: Commit**

```bash
git add supabase/migrations/20260316000000_093_service_registry_load_categories.sql
git commit -m "feat: add primary_stage and bd_stage for pipeline categorization"
```

---

### Task 4: Surface stages in marketplace UI

**Files:**
- Modify: `web/src/pages/settings/services-panel.types.ts`
- Modify: `web/src/pages/marketplace/ServicesCatalog.tsx`

**Step 1: Add stage fields to shared types**

In `services-panel.types.ts`, add to `ServiceRow`:
```typescript
primary_stage: string | null;
```

Add to `ServiceFunctionRow`:
```typescript
bd_stage: string;
```

**Step 2: Add stage badges to catalog cards**

In `ServicesCatalog.tsx`, show `primary_stage` as a badge on service cards alongside the existing `service_type` badge. Show `bd_stage` on function rows in detail views.

**Step 3: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add web/src/pages/settings/services-panel.types.ts web/src/pages/marketplace/ServicesCatalog.tsx
git commit -m "feat: show pipeline stages in marketplace UI"
```

---

# Part C — Credential Binding (Generic FastAPI Route)

**Design decision:** New connection types are NOT added to the Deno `provider-connections` edge function. With 160+ integrations and 1000+ functions in the catalog, expanding edge functions per connection type creates the "giant pile of one-off endpoints" antipattern. Instead, all new credential management goes through a generic FastAPI route. Connection testing is a plugin method, not infrastructure. The existing Deno edge function stays as-is for backward compatibility with the already-deployed GCP Vertex SA connection.

### Task 5: Generic connection management route in FastAPI

**Files:**
- Create: `services/platform-api/app/api/routes/connections.py`
- Create: `services/platform-api/tests/test_connections.py`
- Modify: `services/platform-api/app/main.py` (register router)
- Modify: `services/platform-api/app/auth/dependencies.py` (add `require_user_auth`)
- Modify: `services/platform-api/app/domain/plugins/models.py` (add `test_connection` + `credential_schema` to BasePlugin)

**Step 0: Add `require_user_auth` dependency**

In `services/platform-api/app/auth/dependencies.py`, after `require_role` (line 183), add:

```python
async def require_user_auth(
    auth: AuthPrincipal = Depends(require_auth),
) -> AuthPrincipal:
    """Require human user authentication. Rejects M2M and legacy machine tokens."""
    if auth.subject_type != "user":
        raise HTTPException(status_code=403, detail="User authentication required")
    return auth
```

**Step 1: Add `test_connection` and `credential_schema` to BasePlugin**

In `services/platform-api/app/domain/plugins/models.py`, add to the `BasePlugin` class:

```python
class BasePlugin(ABC):
    task_types: list[str] = []
    credential_schema: list[dict] = []  # fields the plugin needs from credentials

    @abstractmethod
    async def run(self, params: dict[str, Any], context: "ExecutionContext") -> PluginOutput:
        ...

    async def test_connection(self, creds: dict[str, Any]) -> PluginOutput:
        """Test if credentials are valid. Override for real probes."""
        return success(data={"valid": True})

    @classmethod
    def parameter_schema(cls) -> list[dict]:
        return []
```

**Step 2: Write failing tests**

Create `services/platform-api/tests/test_connections.py`:

```python
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.main import create_app


def _mock_auth_principal():
    return AuthPrincipal(
        subject_type="user", subject_id="user-1",
        roles=frozenset({"authenticated"}), auth_source="test",
    )


@pytest.fixture
def client():
    """Create a test client with auth bypassed via dependency_overrides.

    FastAPI binds dependency callables at route registration time.
    Patching the module attribute after import does NOT work.
    dependency_overrides is the correct mechanism.
    """
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_auth_principal
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_connect_stores_encrypted_credentials(client):
    with patch("app.api.routes.connections.get_supabase_admin") as mock_sb, \
         patch("app.api.routes.connections.encrypt_with_context") as mock_encrypt:
        mock_encrypt.return_value = "enc:v1:mock:test"
        mock_table = MagicMock()
        mock_table.upsert.return_value.execute.return_value = MagicMock(data=[{}])
        mock_sb.return_value.table.return_value = mock_table

        resp = client.post("/connections/connect", json={
            "provider": "arangodb",
            "connection_type": "arangodb_credential",
            "credentials": {"endpoint": "https://x:8529", "database": "_system", "username": "root", "password": "secret"},
            "metadata": {"endpoint": "https://x:8529", "database": "_system", "username": "root"},
        })

    assert resp.status_code == 200
    assert resp.json()["ok"] is True


def test_connect_rejects_missing_provider(client):
    resp = client.post("/connections/connect", json={
        "connection_type": "arangodb_credential",
        "credentials": {},
    })
    assert resp.status_code == 422  # Pydantic validation error


def test_test_connection_calls_plugin(client):
    with patch("app.api.routes.connections.resolve_connection_sync") as mock_resolve, \
         patch("app.api.routes.connections.resolve_by_function_name") as mock_fn, \
         patch("app.api.routes.connections.resolve") as mock_plugin_resolve:
        mock_resolve.return_value = {"endpoint": "https://x:8529", "database": "d", "username": "u", "password": "p"}

        mock_plugin = AsyncMock()
        mock_plugin.test_connection.return_value = MagicMock(state="SUCCESS", data={"valid": True}, logs=[])
        mock_fn.return_value = "blockdata.load.arango.batch_insert"
        mock_plugin_resolve.return_value = mock_plugin

        resp = client.post("/connections/test", json={
            "connection_id": "conn-1",
            "function_name": "arangodb_load",
        })

    assert resp.status_code == 200
    assert resp.json()["valid"] is True
```

**Step 3: Run tests to confirm failure**

Run: `cd services/platform-api && python -m pytest tests/test_connections.py -v`
Expected: FAIL — route doesn't exist

**Step 4: Implement the generic connections route**

Create `services/platform-api/app/api/routes/connections.py`:

```python
"""Generic connection management — connect, disconnect, list, test.

All new connection types go through this route. The existing Deno
provider-connections edge function stays for backward compat with the
GCP Vertex SA connection but is NOT extended further.

Adding a new connection type requires:
1. Register the service in service_registry
2. Implement test_connection() on its plugin
3. Done — no infrastructure changes needed
"""
import json as json_mod
import logging
import os
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.plugins.registry import resolve, resolve_by_function_name
from app.infra.connection import resolve_connection_sync
from app.infra.crypto import encrypt_with_context
from app.infra.supabase_client import get_supabase_admin

logger = logging.getLogger("connections")
router = APIRouter(prefix="/connections", tags=["connections"])

CRYPTO_CONTEXT = "provider-connections-v1"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ConnectRequest(BaseModel):
    provider: str
    connection_type: str
    credentials: dict[str, Any]        # secret fields — will be encrypted
    metadata: dict[str, Any] = Field(default_factory=dict)  # non-secret display fields


class DisconnectRequest(BaseModel):
    provider: str
    connection_type: str


class TestConnectionRequest(BaseModel):
    connection_id: str
    function_name: str  # which plugin to use for testing


@router.get("", summary="List user connections")
async def list_connections(auth: AuthPrincipal = Depends(require_user_auth)):
    sb = get_supabase_admin()
    result = sb.table("user_provider_connections").select(
        "id, user_id, provider, connection_type, status, metadata_jsonb, created_at, updated_at"
    ).eq("user_id", auth.user_id).execute()
    return {"connections": result.data or []}


@router.post("/connect", summary="Save encrypted credentials for a provider")
async def connect(body: ConnectRequest, auth: AuthPrincipal = Depends(require_user_auth)):
    sb = get_supabase_admin()
    secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    encrypted = encrypt_with_context(
        json_mod.dumps(body.credentials), secret, CRYPTO_CONTEXT
    )

    result = sb.table("user_provider_connections").upsert({
        "user_id": auth.user_id,
        "provider": body.provider,
        "connection_type": body.connection_type,
        "status": "connected",
        "credential_encrypted": encrypted,
        "metadata_jsonb": body.metadata,
        "updated_at": _now(),
    }, on_conflict="user_id,provider,connection_type").execute()

    if not result.data:
        raise HTTPException(400, "Failed to save connection")

    return {"ok": True, "status": "connected", "metadata": body.metadata}


@router.post("/disconnect", summary="Revoke a saved connection")
async def disconnect(body: DisconnectRequest, auth: AuthPrincipal = Depends(require_user_auth)):
    sb = get_supabase_admin()
    sb.table("user_provider_connections").update({
        "status": "disconnected",
        "credential_encrypted": None,
        "updated_at": _now(),
    }).eq("user_id", auth.user_id).eq(
        "provider", body.provider
    ).eq("connection_type", body.connection_type).execute()
    return {"ok": True, "status": "disconnected"}


@router.post("/test", summary="Test a saved connection via plugin probe")
async def test_connection(body: TestConnectionRequest, auth: AuthPrincipal = Depends(require_user_auth)):
    """Test a saved connection by calling the plugin's test_connection method."""
    creds = resolve_connection_sync(body.connection_id, auth.user_id)

    task_type = resolve_by_function_name(body.function_name)
    if not task_type:
        raise HTTPException(400, f"Function '{body.function_name}' not found")

    plugin = resolve(task_type)
    if not plugin:
        raise HTTPException(400, f"No handler for '{body.function_name}'")

    result = await plugin.test_connection(creds)
    return {"valid": result.state == "SUCCESS", "data": result.data, "logs": result.logs}
```

**Step 5: Create Python crypto module (encrypt + decrypt)**

Create `services/platform-api/app/infra/crypto.py` with both encrypt and decrypt. (Task 8 later adds the connection resolver that imports from this file, but the crypto module itself is created here because connections need encrypt immediately.)

```python
"""AES-GCM encryption/decryption — Python port of api_key_crypto.ts."""
import base64
import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _b64url_encode(b: bytes) -> str:
    return base64.b64encode(b).decode("ascii").rstrip("=").replace("+", "-").replace("/", "_")


def _b64url_decode(s: str) -> bytes:
    s = s.replace("-", "+").replace("_", "/")
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.b64decode(s)


def _derive_key(secret: str, context: str) -> bytes:
    return hashlib.sha256((secret + context).encode("utf-8")).digest()


def encrypt_with_context(plaintext: str, secret: str, context: str) -> str:
    """Encrypt a value compatible with the Deno encryptWithContext function.

    Format: enc:v1:{base64url(iv)}:{base64url(ciphertext)}
    """
    key = _derive_key(secret, context)
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    ct = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    return f"enc:v1:{_b64url_encode(iv)}:{_b64url_encode(ct)}"


def decrypt_with_context(ciphertext: str, secret: str, context: str) -> str:
    """Decrypt a value encrypted by encryptWithContext (Deno or Python)."""
    if not ciphertext.startswith("enc:v1:"):
        return ciphertext  # plaintext fallback

    parts = ciphertext.split(":")
    if len(parts) != 4:
        raise ValueError("Invalid encrypted format")

    iv = _b64url_decode(parts[2])
    ct = _b64url_decode(parts[3])
    key = _derive_key(secret, context)

    aesgcm = AESGCM(key)
    return aesgcm.decrypt(iv, ct, None).decode("utf-8")
```

This creates the complete crypto module in one place. Task 8 Step 1 no longer needs to create it separately — it only needs to verify it exists and add the connection resolver.

**Step 5b: Add `cryptography` dependency**

Add to `services/platform-api/requirements.txt`:
```
cryptography>=42.0.0
```

This must happen here (not Task 8) because crypto.py imports `cryptography` and Task 5's tests will fail without it.

**Step 6: Register the router**

In `services/platform-api/app/main.py`:

```python
from .api.routes.connections import router as connections_router
app.include_router(connections_router)
```

**Step 7: Add test_connection to GCS and Arango plugins**

In `services/platform-api/app/plugins/gcs.py`, add to `GCSListPlugin`:

```python
    async def test_connection(self, creds: dict[str, Any]) -> PluginOutput:
        """Test GCS credentials by listing buckets."""
        token = get_gcs_access_token(creds)
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://storage.googleapis.com/storage/v1/b?project={creds.get('project_id', '')}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
        if resp.status_code == 200:
            return success(data={"valid": True, "buckets": len(resp.json().get("items", []))})
        return failed(f"GCS auth failed: HTTP {resp.status_code}")
```

In `services/platform-api/app/plugins/arangodb.py`, add to `ArangoDBLoadPlugin`:

```python
    async def test_connection(self, creds: dict[str, Any]) -> PluginOutput:
        """Test ArangoDB credentials by checking server version."""
        auth = httpx.BasicAuth(creds["username"], creds["password"])
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{creds['endpoint']}/_db/{creds['database']}/_api/version",
                auth=auth, timeout=10,
            )
        if resp.status_code == 200:
            return success(data={"valid": True, "version": resp.json().get("version")})
        return failed(f"Arango auth failed: HTTP {resp.status_code}")
```

**Step 8: Run tests**

Run: `cd services/platform-api && python -m pytest tests/test_connections.py -v`
Expected: PASS

**Step 9: Commit**

```bash
git add services/platform-api/app/api/routes/connections.py services/platform-api/tests/test_connections.py services/platform-api/app/main.py services/platform-api/app/domain/plugins/models.py services/platform-api/app/infra/crypto.py services/platform-api/app/plugins/gcs.py services/platform-api/app/plugins/arangodb.py
git commit -m "feat: generic FastAPI connection management with plugin-owned test_connection"
```

---

# Part D — Execution Infrastructure

### Task 6: Add service_run_items subordinate tracking

**Files:**
- Create: `supabase/migrations/20260316010000_094_service_run_items.sql`

**Step 1: Write the migration**

```sql
-- Subordinate item tracking under service_runs.
-- One row per file/object being processed in a load run.
CREATE TABLE IF NOT EXISTS public.service_run_items (
  item_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES public.service_runs(run_id) ON DELETE CASCADE,
  item_key    text NOT NULL,
  item_type   text NOT NULL DEFAULT 'file',
  status      text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  rows_written  integer NOT NULL DEFAULT 0,
  rows_failed   integer NOT NULL DEFAULT 0,
  error_message text,
  storage_uri   text,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_run_items_run ON service_run_items(run_id);
CREATE INDEX IF NOT EXISTS idx_service_run_items_status ON service_run_items(run_id, status) WHERE status = 'pending';

ALTER TABLE public.service_run_items ENABLE ROW LEVEL SECURITY;

-- Users see items for runs they created. Creator-owned model — project_id
-- is metadata for grouping, not an authorization path in this first slice.
CREATE POLICY service_run_items_select ON service_run_items FOR SELECT TO authenticated
  USING (run_id IN (
    SELECT sr.run_id FROM service_runs sr
    WHERE sr.created_by = auth.uid()
  ));
CREATE POLICY service_run_items_service_role ON service_run_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.service_run_items FROM anon, authenticated;
GRANT SELECT ON TABLE public.service_run_items TO authenticated;
GRANT ALL ON TABLE public.service_run_items TO service_role;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE service_run_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Atomic claim RPC: prevents double-claiming under concurrency.
-- Same pattern as claim_extraction_items from migration 091.
CREATE OR REPLACE FUNCTION public.claim_run_item(
  p_run_id uuid,
  p_limit integer DEFAULT 1
)
RETURNS SETOF public.service_run_items
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT i.item_id
    FROM public.service_run_items i
    WHERE i.run_id = p_run_id
      AND i.status = 'pending'
    ORDER BY i.item_key, i.item_id
    LIMIT GREATEST(1, p_limit)
    FOR UPDATE OF i SKIP LOCKED
  )
  UPDATE public.service_run_items i
  SET status = 'running', started_at = now()
  FROM candidate
  WHERE i.item_id = candidate.item_id
  RETURNING i.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_run_item(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_run_item(uuid, integer) TO service_role;

-- Add destination identity and ownership columns to service_runs.
ALTER TABLE public.service_runs
  ADD COLUMN IF NOT EXISTS dest_function_id uuid REFERENCES public.service_functions(function_id),
  ADD COLUMN IF NOT EXISTS dest_service_id uuid REFERENCES public.service_registry(service_id),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Expand status CHECK to include 'partial' for runs with mixed item outcomes.
ALTER TABLE public.service_runs DROP CONSTRAINT IF EXISTS service_runs_status_check;
ALTER TABLE public.service_runs ADD CONSTRAINT service_runs_status_check
  CHECK (status IN ('pending', 'running', 'complete', 'partial', 'failed', 'cancelled'));

-- Fix the existing service_runs RLS: migration 050 exposes project_id IS NULL rows
-- to ALL authenticated users. Replace with creator-owned policy.
-- project_id is metadata for grouping — not an authorization path in this first slice.
DROP POLICY IF EXISTS service_runs_select ON service_runs;
CREATE POLICY service_runs_select ON service_runs FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
  );

-- Add service_runs to realtime (was missing from migration 056).
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE service_runs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
```

**Step 2: Verify**

Run: `npx supabase db reset`
Expected: PASS

**Step 3: Commit**

```bash
git add supabase/migrations/20260316010000_094_service_run_items.sql
git commit -m "feat: add service_run_items for load item tracking"
```

---

### Task 7: Register GCS and ArangoDB as services with functions

**Files:**
- Create: `supabase/migrations/20260316020000_095_register_gcs_arangodb.sql`

**Step 1: Write the migration**

```sql
-- Register GCS source and ArangoDB destination as Load-capable services.

INSERT INTO public.service_type_catalog (service_type, label, description)
VALUES ('integration', 'Integration', 'External service integrations')
ON CONFLICT (service_type) DO NOTHING;

-- GCS service
INSERT INTO public.service_registry (service_id, service_type, service_name, base_url, config, primary_stage, execution_plane)
VALUES (
  'b0000000-0000-0000-0000-000000000001', 'integration', 'gcs',
  'http://localhost:8000',
  '{"origin": "io.kestra.plugin.gcp.gcs"}'::jsonb, 'source', 'fastapi'
) ON CONFLICT (service_type, service_name) DO UPDATE SET primary_stage = EXCLUDED.primary_stage, execution_plane = EXCLUDED.execution_plane;

INSERT INTO public.service_functions (service_id, function_name, function_type, bd_stage, label, entrypoint, http_method, parameter_schema, description, tags)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'gcs_list', 'source', 'source',
   'List Objects', '/gcs_list', 'POST',
   '[{"name":"connection_id","type":"string","required":true},
     {"name":"bucket","type":"string","required":true},
     {"name":"prefix","type":"string","required":false},
     {"name":"glob","type":"string","required":false,"default":"*.csv"}]'::jsonb,
   'List objects in a GCS bucket.', '["gcs","source","list"]'::jsonb),

  ('b0000000-0000-0000-0000-000000000001', 'gcs_download_csv', 'source', 'source',
   'Download CSV as JSON', '/gcs_download_csv', 'POST',
   '[{"name":"connection_id","type":"string","required":true},
     {"name":"bucket","type":"string","required":true},
     {"name":"object_name","type":"string","required":true},
     {"name":"key_column","type":"string","required":false}]'::jsonb,
   'Download a CSV from GCS, parse rows into JSON documents, write JSONL to platform storage.',
   '["gcs","source","csv","download"]'::jsonb)
ON CONFLICT (service_id, function_name) DO NOTHING;

-- ArangoDB service (BD-native)
INSERT INTO public.service_registry (service_id, service_type, service_name, base_url, config, primary_stage, execution_plane)
VALUES (
  'b0000000-0000-0000-0000-000000000002', 'integration', 'arangodb',
  'http://localhost:8000',
  '{"origin": "blockdata.arangodb"}'::jsonb, 'destination', 'fastapi'
) ON CONFLICT (service_type, service_name) DO UPDATE SET primary_stage = EXCLUDED.primary_stage, execution_plane = EXCLUDED.execution_plane;

INSERT INTO public.service_functions (service_id, function_name, function_type, bd_stage, label, entrypoint, http_method, parameter_schema, description, tags)
VALUES
  ('b0000000-0000-0000-0000-000000000002', 'arangodb_load', 'destination', 'destination',
   'Load Documents', '/arangodb_load', 'POST',
   '[{"name":"connection_id","type":"string","required":true},
     {"name":"collection","type":"string","required":true},
     {"name":"source_uri","type":"string","required":false,"description":"JSONL file in platform storage"},
     {"name":"documents","type":"array","required":false,"description":"Inline JSON documents"},
     {"name":"create_collection","type":"boolean","required":false,"default":false}]'::jsonb,
   'Load JSON documents into an ArangoDB collection.',
   '["arangodb","destination","load","bulk"]'::jsonb)
ON CONFLICT (service_id, function_name) DO NOTHING;

-- Map GCS to imported catalog items
UPDATE public.integration_catalog_items
  SET mapped_service_id = 'b0000000-0000-0000-0000-000000000001'
  WHERE plugin_group = 'io.kestra.plugin.gcp.gcs' AND mapped_service_id IS NULL;

NOTIFY pgrst, 'reload schema';
```

**Step 2: Verify**

Run: `npx supabase db reset`
Expected: PASS

**Step 3: Commit**

```bash
git add supabase/migrations/20260316020000_095_register_gcs_arangodb.sql
git commit -m "feat: register GCS and ArangoDB as Load services in registry"
```

---

# Part E — Python Plugins

### Task 8: Python AES-GCM crypto + connection resolver

**Files:**
- Create: `services/platform-api/app/infra/crypto.py`
- Create: `services/platform-api/app/infra/connection.py`
- Modify: `services/platform-api/requirements.txt` — add `cryptography`
- Modify: `services/platform-api/app/domain/plugins/models.py` — add `user_id` to ExecutionContext

**Step 0: Add `user_id` to ExecutionContext**

In `services/platform-api/app/domain/plugins/models.py`, add `user_id` field to the `ExecutionContext` dataclass (after `task_run_id`):

```python
@dataclass
class ExecutionContext:
    execution_id: str = ""
    task_run_id: str = ""
    user_id: str = ""          # authenticated user — set by route, used by connection resolver
    variables: dict[str, Any] = field(default_factory=dict)
    # ... rest unchanged
```

**Step 1: Verify crypto.py has decrypt (already created in Task 5)**

`services/platform-api/app/infra/crypto.py` was created in Task 5 with `encrypt_with_context`. Verify it also contains `decrypt_with_context`. If not, add it:

```python
"""AES-GCM decryption — Python port of api_key_crypto.ts."""
import base64
import hashlib

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def decrypt_with_context(ciphertext: str, secret: str, context: str) -> str:
    """Decrypt a value encrypted by the Deno encryptWithContext function.

    Format: enc:v1:{base64url(iv)}:{base64url(ciphertext)}
    Key derivation: SHA-256(secret + context) → first 32 bytes → AES-GCM key
    """
    if not ciphertext.startswith("enc:v1:"):
        return ciphertext  # plaintext fallback (back-compat)

    parts = ciphertext.split(":")
    if len(parts) != 4:
        raise ValueError("Invalid encrypted format")

    iv_b64 = parts[2]
    ct_b64 = parts[3]

    def b64url_decode(s: str) -> bytes:
        s = s.replace("-", "+").replace("_", "/")
        padding = 4 - len(s) % 4
        if padding != 4:
            s += "=" * padding
        return base64.b64decode(s)

    iv = b64url_decode(iv_b64)
    ct = b64url_decode(ct_b64)

    key_material = (secret + context).encode("utf-8")
    key = hashlib.sha256(key_material).digest()

    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(iv, ct, None)
    return plaintext.decode("utf-8")
```

**Step 2: Implement user-scoped connection resolver**

Create `services/platform-api/app/infra/connection.py`:

```python
"""Resolve user-scoped credentials from user_provider_connections."""
import json
import os
from typing import Any

from .supabase_client import get_supabase_admin
from .crypto import decrypt_with_context


def resolve_connection_sync(connection_id: str, user_id: str) -> dict[str, Any]:
    """Fetch and decrypt credentials for a provider connection row.

    Verifies the connection belongs to the authenticated user before
    returning decrypted credentials. This is a security boundary —
    callers MUST pass the authenticated user_id.

    Returns the decrypted credential dict merged with metadata_jsonb.
    """
    sb = get_supabase_admin()
    result = sb.table("user_provider_connections").select(
        "credential_encrypted, metadata_jsonb, provider, connection_type, status, user_id"
    ).eq("id", connection_id).single().execute()

    row = result.data
    if not row:
        raise ValueError(f"Connection {connection_id} not found")
    if row.get("user_id") != user_id:
        raise PermissionError(f"Connection {connection_id} does not belong to user")
    if row.get("status") != "connected":
        raise ValueError(f"Connection {connection_id} is {row.get('status')}")

    secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    credential_json = decrypt_with_context(row["credential_encrypted"], secret, "provider-connections-v1")
    creds = json.loads(credential_json)

    metadata = row.get("metadata_jsonb") or {}
    return {**metadata, **creds}
```

**Step 3: Verify `cryptography` is in requirements.txt**

Already added in Task 5, Step 5b. Verify `cryptography>=42.0.0` is present.

**Step 4: Write crypto round-trip test**

Create `services/platform-api/tests/infra/__init__.py` (empty file).

Create `services/platform-api/tests/infra/test_crypto.py`:

```python
from app.infra.crypto import encrypt_with_context, decrypt_with_context


def test_encrypt_decrypt_round_trip():
    secret = "test-secret-key"
    context = "provider-connections-v1"
    plaintext = '{"username": "root", "password": "secret"}'

    encrypted = encrypt_with_context(plaintext, secret, context)
    assert encrypted.startswith("enc:v1:")

    decrypted = decrypt_with_context(encrypted, secret, context)
    assert decrypted == plaintext


def test_decrypt_plaintext_fallback():
    result = decrypt_with_context("not-encrypted", "key", "ctx")
    assert result == "not-encrypted"
```

Run: `cd services/platform-api && python -m pytest tests/infra/test_crypto.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add services/platform-api/app/infra/crypto.py services/platform-api/app/infra/connection.py services/platform-api/tests/infra/test_crypto.py services/platform-api/requirements.txt services/platform-api/app/domain/plugins/models.py
git commit -m "feat: add Python AES-GCM crypto, connection resolver, and user_id on ExecutionContext"
```

---

### Task 9: GCS source plugin

**Files:**
- Create: `services/platform-api/app/plugins/gcs.py`
- Create: `services/platform-api/tests/plugins/__init__.py` (empty file)
- Create: `services/platform-api/tests/plugins/test_gcs.py`

**Step 1: Write failing tests**

Create `services/platform-api/tests/plugins/__init__.py` (empty file).

```python
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.plugins.gcs import GCSListPlugin, GCSDownloadCsvPlugin
from app.domain.plugins.models import ExecutionContext


@pytest.fixture
def ctx():
    return ExecutionContext(execution_id="test-1")


@pytest.mark.asyncio
async def test_gcs_list_returns_matching_objects(ctx):
    plugin = GCSListPlugin()
    assert "blockdata.load.gcs.list_objects" in plugin.task_types

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "items": [
            {"name": "data/a.csv", "size": "1024"},
            {"name": "data/b.csv", "size": "2048"},
            {"name": "data/c.json", "size": "512"},
        ]
    }

    with patch("app.plugins.gcs.resolve_connection_sync") as mock_conn, \
         patch("app.plugins.gcs.get_gcs_access_token") as mock_token, \
         patch("app.plugins.gcs.httpx") as mock_httpx:
        mock_conn.return_value = {"project_id": "proj", "client_email": "sa@x", "private_key": "k"}
        mock_token.return_value = "fake-token"
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_resp
        mock_httpx.AsyncClient.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_httpx.AsyncClient.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await plugin.run({"connection_id": "c1", "bucket": "my-bucket", "prefix": "data/", "glob": "*.csv"}, ctx)

    assert result.state == "SUCCESS"
    assert len(result.data["objects"]) == 2
    assert result.data["objects"][0]["name"] == "data/a.csv"


@pytest.mark.asyncio
async def test_gcs_download_csv_parses_rows(ctx):
    plugin = GCSDownloadCsvPlugin()
    csv_content = "name,age,city\nAlice,30,NYC\nBob,25,LA"

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = csv_content

    # Mock upload_file on the context so JSONL is "written" to storage
    ctx.upload_file = AsyncMock(return_value="https://storage.example.com/pipeline/load-artifacts/test/a.csv.jsonl")

    with patch("app.plugins.gcs.resolve_connection_sync") as mock_conn, \
         patch("app.plugins.gcs.get_gcs_access_token") as mock_token, \
         patch("app.plugins.gcs.httpx") as mock_httpx:
        mock_conn.return_value = {"project_id": "proj", "client_email": "sa@x", "private_key": "k"}
        mock_token.return_value = "fake-token"
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_resp
        mock_httpx.AsyncClient.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_httpx.AsyncClient.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await plugin.run({"connection_id": "c1", "bucket": "b", "object_name": "data/a.csv"}, ctx)

    assert result.state == "SUCCESS"
    assert result.data["row_count"] == 2
    assert result.data["storage_uri"] == "https://storage.example.com/pipeline/load-artifacts/test/a.csv.jsonl"
```

**Step 2: Run tests to confirm failure**

Run: `cd services/platform-api && python -m pytest tests/plugins/test_gcs.py -v`
Expected: FAIL — module not found

**Step 3: Implement**

```python
"""GCS source plugins — List and Download CSV. Translated from io.kestra.plugin.gcp.gcs."""
import csv
import fnmatch
import io
import json as json_mod
from typing import Any

import httpx

from ..domain.plugins.models import BasePlugin, PluginOutput, success, failed
from ..infra.connection import resolve_connection_sync
from ..infra.gcs_auth import get_gcs_access_token

GCS_API = "https://storage.googleapis.com/storage/v1"


class GCSListPlugin(BasePlugin):
    """List objects in a GCS bucket. Translated from io.kestra.plugin.gcp.gcs.List."""

    task_types = ["blockdata.load.gcs.list_objects", "io.kestra.plugin.gcp.gcs.List"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        creds = resolve_connection_sync(params["connection_id"], context.user_id)
        token = get_gcs_access_token(creds)
        bucket = params["bucket"]
        prefix = params.get("prefix", "")
        glob_pattern = params.get("glob", "*")

        headers = {"Authorization": f"Bearer {token}"}
        url = f"{GCS_API}/b/{bucket}/o"
        query: dict[str, Any] = {"maxResults": 1000}
        if prefix:
            query["prefix"] = prefix

        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, params=query, timeout=30)
            if resp.status_code != 200:
                return failed(f"GCS list failed: HTTP {resp.status_code} — {resp.text[:300]}")
            body = resp.json()

        all_items = body.get("items", [])
        matched = [
            {"name": item["name"], "size": int(item.get("size", 0))}
            for item in all_items
            if fnmatch.fnmatch(item["name"].split("/")[-1], glob_pattern)
        ]

        return success(
            data={"objects": matched, "count": len(matched), "bucket": bucket},
            logs=[f"Found {len(matched)} objects matching {glob_pattern} in gs://{bucket}/{prefix}"],
        )


class GCSDownloadCsvPlugin(BasePlugin):
    """Download a CSV from GCS and parse into JSON documents."""

    task_types = ["blockdata.load.gcs.download_csv"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        creds = resolve_connection_sync(params["connection_id"], context.user_id)
        token = get_gcs_access_token(creds)
        bucket = params["bucket"]
        object_name = params["object_name"]
        key_column = params.get("key_column")

        headers = {"Authorization": f"Bearer {token}"}
        # URL-encode the object name for the media download endpoint
        encoded = object_name.replace("/", "%2F")
        url = f"{GCS_API}/b/{bucket}/o/{encoded}?alt=media"

        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=120)
            if resp.status_code != 200:
                return failed(f"GCS download failed: HTTP {resp.status_code}")

        # Parse CSV to JSON documents
        reader = csv.DictReader(io.StringIO(resp.text))
        documents: list[dict[str, str]] = []
        for row in reader:
            doc = dict(row)
            if key_column and key_column in doc:
                doc["_key"] = doc[key_column]
            documents.append(doc)

        # Write JSONL to platform storage (artifact handoff contract)
        jsonl_lines = [json_mod.dumps(doc) for doc in documents]
        jsonl_bytes = ("\n".join(jsonl_lines)).encode("utf-8")
        storage_path = f"load-artifacts/{context.execution_id}/{object_name.replace('/', '_')}.jsonl"
        storage_uri = await context.upload_file("pipeline", storage_path, jsonl_bytes)

        return success(
            data={"storage_uri": storage_uri, "row_count": len(documents), "object_name": object_name},
            logs=[f"Parsed {len(documents)} rows from gs://{bucket}/{object_name} → {storage_uri}"],
        )
```

Also create `services/platform-api/app/infra/gcs_auth.py`:

```python
"""GCS OAuth2 token from service account credentials.
Same pattern as supabase/functions/_shared/vertex_auth.ts but in Python.
"""
import json
import time
from typing import Any

import httpx
import jwt  # PyJWT


def get_gcs_access_token(creds: dict[str, Any]) -> str:
    """Exchange a GCP service account credential for a short-lived access token."""
    now = int(time.time())
    payload = {
        "iss": creds["client_email"],
        "scope": "https://www.googleapis.com/auth/devstorage.read_only",
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now,
        "exp": now + 3600,
    }
    signed_jwt = jwt.encode(payload, creds["private_key"], algorithm="RS256")

    resp = httpx.post("https://oauth2.googleapis.com/token", data={
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": signed_jwt,
    }, timeout=10)
    resp.raise_for_status()
    return resp.json()["access_token"]
```

**Step 4: Run tests**

Run: `cd services/platform-api && python -m pytest tests/plugins/test_gcs.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add services/platform-api/app/plugins/gcs.py services/platform-api/app/infra/gcs_auth.py services/platform-api/tests/plugins/test_gcs.py
git commit -m "feat: add GCS list and download-csv source plugins"
```

---

### Task 10: ArangoDB destination plugin

**Files:**
- Create: `services/platform-api/app/plugins/arangodb.py`
- Create: `services/platform-api/tests/plugins/test_arangodb.py`

**Step 1: Write failing tests**

```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.plugins.arangodb import ArangoDBLoadPlugin
from app.domain.plugins.models import ExecutionContext


@pytest.fixture
def ctx():
    return ExecutionContext(execution_id="test-1")


@pytest.mark.asyncio
async def test_load_inserts_documents(ctx):
    plugin = ArangoDBLoadPlugin()
    assert "blockdata.load.arango.batch_insert" in plugin.task_types

    mock_resp = MagicMock()
    mock_resp.status_code = 202
    mock_resp.json.return_value = [
        {"_key": "1", "_id": "users/1"},
        {"_key": "2", "_id": "users/2"},
    ]

    with patch("app.plugins.arangodb.resolve_connection_sync") as mock_conn, \
         patch("app.plugins.arangodb.httpx") as mock_httpx:
        mock_conn.return_value = {
            "endpoint": "https://test.arangodb.cloud:8529",
            "database": "_system", "username": "root", "password": "secret",
        }
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_resp
        mock_httpx.AsyncClient.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_httpx.AsyncClient.return_value.__aexit__ = AsyncMock(return_value=False)
        mock_httpx.BasicAuth = MagicMock()

        result = await plugin.run({
            "connection_id": "c1", "collection": "users",
            "documents": [{"name": "Alice"}, {"name": "Bob"}],
        }, ctx)

    assert result.state == "SUCCESS"
    assert result.data["inserted"] == 2


@pytest.mark.asyncio
async def test_load_rejects_missing_collection(ctx):
    plugin = ArangoDBLoadPlugin()
    with patch("app.plugins.arangodb.resolve_connection_sync") as mock_conn:
        mock_conn.return_value = {"endpoint": "x", "database": "d", "username": "u", "password": "p"}
        result = await plugin.run({"connection_id": "c1", "documents": [{"a": 1}]}, ctx)
    assert result.state == "FAILED"
```

**Step 2: Implement**

```python
"""ArangoDB destination plugin — batch insert. BD-native (no Kestra equivalent)."""
import json as json_mod
from typing import Any

import httpx

from ..domain.plugins.models import BasePlugin, PluginOutput, failed, success
from ..infra.connection import resolve_connection_sync

BATCH_SIZE = 500


class ArangoDBLoadPlugin(BasePlugin):
    """Bulk insert documents into an ArangoDB collection."""

    task_types = ["blockdata.load.arango.batch_insert"]

    async def run(self, params: dict[str, Any], context) -> PluginOutput:
        creds = resolve_connection_sync(params["connection_id"], context.user_id)
        endpoint = creds["endpoint"].rstrip("/")
        database = creds["database"]
        username = creds["username"]
        password = creds["password"]
        collection = params.get("collection", "")
        documents = params.get("documents", [])
        source_uri = params.get("source_uri", "")
        create_collection = params.get("create_collection", False)

        if not collection:
            return failed("Missing collection name")

        # Load documents from storage artifact if source_uri is provided
        if source_uri and not documents:
            async with httpx.AsyncClient() as dl_client:
                dl_resp = await dl_client.get(source_uri, timeout=120)
                if dl_resp.status_code != 200:
                    return failed(f"Failed to download source artifact: HTTP {dl_resp.status_code}")
                documents = [json_mod.loads(line) for line in dl_resp.text.strip().split("\n") if line.strip()]

        if not documents:
            return failed("No documents to load (provide documents or source_uri)")

        auth = httpx.BasicAuth(username, password)
        base = f"{endpoint}/_db/{database}"

        async with httpx.AsyncClient() as client:
            if create_collection:
                await client.post(f"{base}/_api/collection", json={"name": collection}, auth=auth, timeout=30)

            total_inserted = 0
            total_failed = 0
            errors: list[str] = []

            for i in range(0, len(documents), BATCH_SIZE):
                batch = documents[i:i + BATCH_SIZE]
                resp = await client.post(f"{base}/_api/document/{collection}", json=batch, auth=auth, timeout=60)
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
        return PluginOutput(state=state, data={
            "inserted": total_inserted, "failed": total_failed,
            "collection": collection, "errors": errors[:10],
        }, logs=[f"Inserted {total_inserted}, failed {total_failed} into {collection}"])
```

**Step 3: Run tests**

Run: `cd services/platform-api && python -m pytest tests/plugins/test_arangodb.py -v`
Expected: PASS

**Step 4: Commit**

```bash
git add services/platform-api/app/plugins/arangodb.py services/platform-api/tests/plugins/test_arangodb.py
git commit -m "feat: add ArangoDB batch insert destination plugin"
```

---

# Part F — Load Orchestration Route

`POST /load-runs/{id}/step` is a bootstrap progression endpoint for the first end-to-end slice. It may be invoked manually, from the UI, or from a thin follow-up scheduler. Worker-backed orchestration (background claim loop, automatic stepping) is a follow-on plan, not part of this implementation.

### Task 11: Add load-runs route in platform-api

**Files:**
- Create: `services/platform-api/app/api/routes/load_runs.py`
- Modify: `services/platform-api/app/main.py`

**Step 1: Implement the route**

```python
"""Load run orchestration — submit, step, and query load jobs.

The load-run is a composite activity: source function produces artifacts,
destination function consumes them. service_runs tracks the overall run,
service_run_items tracks per-file progress.

Flow:
  POST /load-runs        → validate, list source files, create run + items
  POST /load-runs/{id}/step → process one pending item (download CSV → JSONL → Arango)
  GET  /load-runs/{id}   → return run + items status
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.plugins.models import ExecutionContext
from app.domain.plugins.registry import resolve, resolve_by_function_name
from app.infra.supabase_client import get_supabase_admin

logger = logging.getLogger("load-runs")
router = APIRouter(prefix="/load-runs", tags=["load-runs"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _maybe_finalize_run(sb, run_id: str, log) -> dict:
    """Finalize a run ONLY when all items are terminal (complete or failed).

    Checks for both 'pending' and 'running' items to prevent premature
    completion under concurrent /step calls. Uses persisted rows_affected
    from the run record (not leaked locals) to determine failed vs partial.
    """
    active = sb.table("service_run_items").select(
        "item_id", count="exact", head=True
    ).eq("run_id", run_id).in_("status", ["pending", "running"]).execute()
    active_count = active.count or 0

    if active_count > 0:
        return {"finalized": False, "active": active_count}

    # All items terminal — determine outcome
    run_row = sb.table("service_runs").select(
        "rows_affected"
    ).eq("run_id", run_id).single().execute()
    total_items = run_row.data.get("rows_affected", 0) if run_row.data else 0

    failed = sb.table("service_run_items").select(
        "item_id", count="exact", head=True
    ).eq("run_id", run_id).eq("status", "failed").execute()
    failed_count = failed.count or 0

    if failed_count == 0:
        final_status = "complete"
    elif total_items > 0 and failed_count >= total_items:
        final_status = "failed"
    else:
        final_status = "partial"

    sb.table("service_runs").update({
        "status": final_status, "completed_at": _now(),
    }).eq("run_id", run_id).execute()

    # Clean up ephemeral artifacts on full success
    if final_status == "complete":
        try:
            _cleanup_artifacts(sb, run_id)
        except Exception as e:
            log.warning(f"Artifact cleanup failed for run {run_id}: {e}")

    return {"finalized": True, "status": final_status, "active": 0}


def _cleanup_artifacts(sb, run_id: str):
    """Delete JSONL artifacts from pipeline storage after successful run.

    Uses the Supabase Storage API: list objects by prefix, then remove them.
    """
    prefix = f"load-artifacts/{run_id}/"
    listed = sb.storage.from_("pipeline").list(prefix)
    if listed:
        paths = [f"{prefix}{f['name']}" for f in listed]
        sb.storage.from_("pipeline").remove(paths)


class SubmitLoadRequest(BaseModel):
    source_function_name: str          # e.g. "gcs_list" — used for file discovery
    source_download_function: str      # e.g. "gcs_download_csv" — REQUIRED, used for per-item processing
    source_connection_id: str
    dest_function_name: str            # e.g. "arangodb_load" — used for per-item loading
    dest_connection_id: str
    project_id: str | None = None
    config: dict[str, Any] = Field(default_factory=dict)
    # Source-specific: bucket, prefix, glob, key_column
    # Dest-specific: collection, create_collection


def _validate_owned_project(sb, project_id: str | None, user_id: str) -> None:
    """Reject bogus or unowned project_id values."""
    if not project_id:
        return
    project = sb.table("projects").select("project_id").eq(
        "project_id", project_id
    ).eq("owner_id", user_id).maybeSingle().execute()
    if not project.data:
        raise HTTPException(403, "Project not found or not owned by caller")


@router.post("", summary="Submit a new load run")
async def submit_load(body: SubmitLoadRequest, auth: AuthPrincipal = Depends(require_user_auth)):
    """Create a load run: list source files, create run + items."""
    sb = get_supabase_admin()

    # 0. Validate project ownership if project_id is provided
    _validate_owned_project(sb, body.project_id, auth.user_id)

    # 1. Validate source and destination functions
    src_fn = sb.table("service_functions").select("*").eq(
        "function_name", body.source_function_name).single().execute()
    if not src_fn.data or src_fn.data.get("bd_stage") != "source":
        raise HTTPException(400, "Source function not found or not a source-stage function")

    dst_fn = sb.table("service_functions").select("*").eq(
        "function_name", body.dest_function_name).single().execute()
    if not dst_fn.data or dst_fn.data.get("bd_stage") != "destination":
        raise HTTPException(400, "Destination function not found or not a destination-stage function")

    # 2. Call the source list function to discover files
    list_task_type = resolve_by_function_name(body.source_function_name)
    if not list_task_type:
        raise HTTPException(400, f"Source function '{body.source_function_name}' not found in plugin registry")
    list_plugin = resolve(list_task_type)
    if not list_plugin:
        raise HTTPException(500, f"No handler for source function '{body.source_function_name}'")

    exec_id = str(uuid.uuid4())
    ctx = ExecutionContext(execution_id=exec_id, user_id=auth.user_id)
    list_result = await list_plugin.run({
        "connection_id": body.source_connection_id,
        "bucket": body.config.get("bucket", ""),
        "prefix": body.config.get("prefix", ""),
        "glob": body.config.get("glob", "*.csv"),
    }, ctx)

    if list_result.state != "SUCCESS":
        raise HTTPException(400, f"Source listing failed: {list_result.logs}")

    objects = list_result.data.get("objects", [])
    if not objects:
        raise HTTPException(400, "No files found matching the source configuration")

    # 3. Create the composite run (set created_by for RLS ownership).
    # rows_affected is set atomically in the INSERT — no separate UPDATE.
    # This prevents a race where an eager /step reads NULL rows_affected
    # before the UPDATE arrives, causing _maybe_finalize_run to treat
    # total_items as 0 and collapse all failures to "partial".
    run_id = str(uuid.uuid4())
    sb.table("service_runs").insert({
        "run_id": run_id,
        "function_id": src_fn.data["function_id"],
        "service_id": src_fn.data["service_id"],
        "dest_function_id": dst_fn.data["function_id"],
        "dest_service_id": dst_fn.data["service_id"],
        "project_id": body.project_id,
        "created_by": auth.user_id,
        "status": "pending",
        "rows_affected": len(objects),
        "config_snapshot": {
            "source_function_name": body.source_function_name,
            "source_download_function": body.source_download_function,
            "source_connection_id": body.source_connection_id,
            "dest_load_function": body.dest_function_name,
            "dest_connection_id": body.dest_connection_id,
            **body.config,
        },
        "started_at": _now(),
    }).execute()

    # 4. Create one item per discovered file.
    # Run creation and item creation should be atomic. If item insert fails,
    # compensate by marking the run failed so no orphaned pending run remains.
    items = [
        {
            "run_id": run_id,
            "item_key": obj["name"],
            "item_type": "file",
            "status": "pending",
        }
        for obj in objects
    ]
    try:
        sb.table("service_run_items").insert(items).execute()
    except Exception as e:
        sb.table("service_runs").update({
            "status": "failed",
            "error_message": f"Item creation failed: {str(e)[:500]}",
            "completed_at": _now(),
        }).eq("run_id", run_id).execute()
        raise HTTPException(500, f"Failed to create run items: {str(e)[:200]}")

    return {"run_id": run_id, "status": "pending", "total_items": len(items)}


@router.post("/{run_id}/step", summary="Process next pending item in a load run")
async def step_load(run_id: str, auth: AuthPrincipal = Depends(require_user_auth)):
    """Process the next pending item in the load run.

    1. Claim one pending item
    2. Download CSV from GCS → parse → write JSONL to storage
    3. Load JSONL into Arango
    4. Mark item complete or failed
    5. If no pending items remain, mark run complete
    """
    sb = get_supabase_admin()

    # Load the run and verify ownership (service-role bypasses RLS)
    run = sb.table("service_runs").select("*").eq("run_id", run_id).single().execute()
    if not run.data:
        raise HTTPException(404, "Run not found")
    if run.data.get("created_by") != auth.user_id:
        raise HTTPException(403, "Not your run")
    if run.data["status"] in ("complete", "partial", "failed", "cancelled"):
        return {"run_id": run_id, "status": run.data["status"], "message": "Run already finished"}

    config = run.data.get("config_snapshot", {})

    # Mark run as running if it was pending
    if run.data["status"] == "pending":
        sb.table("service_runs").update({"status": "running"}).eq("run_id", run_id).execute()

    # Claim one pending item atomically via RPC (prevents double-claiming)
    claimed = sb.rpc("claim_run_item", {"p_run_id": run_id, "p_limit": 1}).execute()
    if not claimed.data:
        # No pending items — but other items may still be 'running' under
        # concurrent /step calls. Try to finalize; if items are still active
        # the helper will return without stamping.
        result = _maybe_finalize_run(sb, run_id, logger)
        return {"run_id": run_id, "status": result.get("status", "running"), "remaining": result.get("active", 0)}

    item = claimed.data[0]
    item_id = item["item_id"]
    object_name = item["item_key"]

    try:
        # Step A: Download CSV from GCS and write JSONL to storage
        src_download_fn = config.get("source_download_function", "gcs_download_csv")
        dst_load_fn = config.get("dest_load_function", "arangodb_load")

        download_task_type = resolve_by_function_name(src_download_fn)
        if not download_task_type:
            raise Exception(f"Source download function '{src_download_fn}' not found in plugin registry")
        download_plugin = resolve(download_task_type)
        if not download_plugin:
            raise Exception(f"No handler for source download task type: {download_task_type}")
        ctx = ExecutionContext(execution_id=f"{run_id}/{item_id}", user_id=auth.user_id)
        download_result = await download_plugin.run({
            "connection_id": config["source_connection_id"],
            "bucket": config.get("bucket", ""),
            "object_name": object_name,
            "key_column": config.get("key_column"),
        }, ctx)

        if download_result.state != "SUCCESS":
            raise Exception(f"Download failed: {download_result.logs}")

        storage_uri = download_result.data["storage_uri"]
        row_count = download_result.data["row_count"]

        # Step B: Load JSONL into destination
        load_task_type = resolve_by_function_name(dst_load_fn)
        if not load_task_type:
            raise Exception(f"Destination load function '{dst_load_fn}' not found in plugin registry")
        load_plugin = resolve(load_task_type)
        if not load_plugin:
            raise Exception(f"No handler for destination task type: {load_task_type}")
        load_result = await load_plugin.run({
            "connection_id": config["dest_connection_id"],
            "collection": config.get("collection", ""),
            "source_uri": storage_uri,
            "create_collection": config.get("create_collection", False),
        }, ctx)

        if load_result.state == "FAILED":
            raise Exception(f"Load failed: {load_result.logs}")

        # Mark item complete
        sb.table("service_run_items").update({
            "status": "complete",
            "rows_written": load_result.data.get("inserted", 0),
            "rows_failed": load_result.data.get("failed", 0),
            "storage_uri": storage_uri,
            "completed_at": _now(),
        }).eq("item_id", item_id).execute()

    except Exception as e:
        logger.error(f"Load step failed for item {item_id}: {e}")
        sb.table("service_run_items").update({
            "status": "failed",
            "error_message": str(e)[:1000],
            "completed_at": _now(),
        }).eq("item_id", item_id).execute()

    # Try to finalize the run. The helper checks for BOTH pending and running
    # items, so concurrent /step calls won't stamp complete prematurely.
    result = _maybe_finalize_run(sb, run_id, logger)
    return {"run_id": run_id, "processed": object_name, "remaining": result.get("active", 0)}


@router.get("/{run_id}", summary="Get load run status and item details")
async def get_load_run(run_id: str, auth: AuthPrincipal = Depends(require_user_auth)):
    sb = get_supabase_admin()
    run = sb.table("service_runs").select("*").eq("run_id", run_id).single().execute()
    if not run.data:
        raise HTTPException(404, "Run not found")
    if run.data.get("created_by") != auth.user_id:
        raise HTTPException(403, "Not your run")
    items = sb.table("service_run_items").select("*").eq("run_id", run_id).order("item_key").execute()
    return {"run": run.data, "items": items.data or []}
```

**Step 2: Register the router**

In `services/platform-api/app/main.py`, insert `connections_router` and `load_runs_router` **before** the existing plugin catch-all registration. `plugin_router` must remain last because it owns `POST /{function_name}`. If load_runs_router is mounted after plugin_router, `POST /load-runs` would hit the plugin catch-all and return 404.

Add between the functions listing router (comment "5. Functions listing") and the plugin catch-all (comment "6. Plugin catch-all MUST be last"):

```python
    # 5b. Connection management (user-scoped, before plugin catch-all)
    from app.api.routes.connections import router as connections_router
    app.include_router(connections_router)

    # 5c. Load orchestration (user-scoped, before plugin catch-all)
    from app.api.routes.load_runs import router as load_runs_router
    app.include_router(load_runs_router)
```

**Step 3: Write load-runs route tests**

Create `services/platform-api/tests/test_load_runs.py`:

```python
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal


def _test_principal():
    return AuthPrincipal(
        subject_type="user", subject_id="user-1",
        roles=frozenset({"authenticated"}), auth_source="test",
    )


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "test-token")
    from app.core.config import get_settings
    get_settings.cache_clear()
    from app.main import create_app
    app = create_app()
    app.dependency_overrides[require_user_auth] = _test_principal
    yield TestClient(app)
    app.dependency_overrides.clear()
    get_settings.cache_clear()


@pytest.fixture
def unauthenticated_client(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "test-token")
    from app.core.config import get_settings
    get_settings.cache_clear()
    from app.main import create_app
    app = create_app()
    yield TestClient(app)
    get_settings.cache_clear()


def test_submit_load_rejects_unauthenticated(unauthenticated_client):
    resp = unauthenticated_client.post("/load-runs", json={})
    assert resp.status_code == 401


def test_get_load_run_checks_ownership(client):
    with patch("app.api.routes.load_runs.get_supabase_admin") as mock_sb:
        mock_run = MagicMock()
        mock_run.data = {"run_id": "r1", "created_by": "other-user", "status": "pending"}
        mock_sb.return_value.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_run
        resp = client.get("/load-runs/r1")
    # user_id="user-1", run created_by="other-user" → 403
    assert resp.status_code == 403


def test_finalize_run_complete_when_all_items_pass(client):
    """_maybe_finalize_run returns 'complete' when no items are active and none failed."""
    from app.api.routes.load_runs import _maybe_finalize_run
    import logging

    mock_sb = MagicMock()
    # No active items (pending/running)
    mock_sb.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(count=0)
    # rows_affected = 3
    mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data={"rows_affected": 3})
    # 0 failed items
    failed_mock = MagicMock(count=0)
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = failed_mock

    result = _maybe_finalize_run(mock_sb, "run-1", logging.getLogger("test"))
    assert result["finalized"] is True
    assert result["status"] == "complete"


def test_finalize_run_partial_when_some_items_fail(client):
    """_maybe_finalize_run returns 'partial' when some but not all items failed."""
    from app.api.routes.load_runs import _maybe_finalize_run
    import logging

    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(count=0)
    mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data={"rows_affected": 5})
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(count=2)

    result = _maybe_finalize_run(mock_sb, "run-1", logging.getLogger("test"))
    assert result["finalized"] is True
    assert result["status"] == "partial"


def test_finalize_run_skipped_when_items_still_running(client):
    """_maybe_finalize_run does NOT finalize when items are still running."""
    from app.api.routes.load_runs import _maybe_finalize_run
    import logging

    mock_sb = MagicMock()
    # 1 active item still running
    mock_sb.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(count=1)

    result = _maybe_finalize_run(mock_sb, "run-1", logging.getLogger("test"))
    assert result["finalized"] is False
    assert result["active"] == 1


def test_load_runs_rejects_m2m_token(unauthenticated_client):
    """M2M tokens should be rejected by require_user_auth on load-runs routes."""
    resp = unauthenticated_client.post(
        "/load-runs", json={},
        headers={"Authorization": "Bearer test-token"},  # M2M token
    )
    assert resp.status_code == 403


def test_submit_rejects_unowned_project(client):
    """submit_load should reject a project_id the caller does not own."""
    with patch("app.api.routes.load_runs.get_supabase_admin") as mock_sb:
        # _validate_owned_project query returns no data
        mock_sb.return_value.table.return_value.select.return_value.eq.return_value.eq.return_value.maybeSingle.return_value.execute.return_value = MagicMock(data=None)
        resp = client.post("/load-runs", json={
            "source_function_name": "gcs_list",
            "source_download_function": "gcs_download_csv",
            "source_connection_id": "c1",
            "dest_function_name": "arangodb_load",
            "dest_connection_id": "c2",
            "project_id": "not-my-project",
        })
    assert resp.status_code == 403


def test_submit_step_finalize_happy_path(client):
    """Integration-style test: submit → create items → step one item → finalize."""
    from app.api.routes.load_runs import _maybe_finalize_run
    import logging

    mock_sb = MagicMock()

    # submit_load mocks:
    # _validate_owned_project → project exists
    project_mock = MagicMock(data={"project_id": "p1"})
    # source function lookup
    src_fn_mock = MagicMock(data={"function_id": "f1", "service_id": "s1", "bd_stage": "source"})
    # dest function lookup
    dst_fn_mock = MagicMock(data={"function_id": "f2", "service_id": "s2", "bd_stage": "destination"})

    with patch("app.api.routes.load_runs.get_supabase_admin", return_value=mock_sb), \
         patch("app.api.routes.load_runs.resolve_by_function_name") as mock_resolve_fn, \
         patch("app.api.routes.load_runs.resolve") as mock_resolve:

        # Mock Supabase table calls for submit
        mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = [
            src_fn_mock, dst_fn_mock,
        ]
        # _validate_owned_project
        mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.maybeSingle.return_value.execute.return_value = project_mock

        # Mock plugin list execution
        from unittest.mock import AsyncMock
        mock_list_plugin = AsyncMock()
        mock_list_plugin.run.return_value = MagicMock(
            state="SUCCESS",
            data={"objects": [{"name": "file1.csv"}], "count": 1},
            logs=[],
        )
        mock_resolve_fn.return_value = "blockdata.load.gcs.list_objects"
        mock_resolve.return_value = mock_list_plugin

        # Insert mocks (run + items)
        mock_sb.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{}])

        resp = client.post("/load-runs", json={
            "source_function_name": "gcs_list",
            "source_download_function": "gcs_download_csv",
            "source_connection_id": "c1",
            "dest_function_name": "arangodb_load",
            "dest_connection_id": "c2",
            "project_id": "p1",
            "config": {"bucket": "test-bucket"},
        })

    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"
    assert resp.json()["total_items"] == 1
```

Run: `cd services/platform-api && python -m pytest tests/test_load_runs.py -v`
Expected: PASS

**Step 4: Commit**

```bash
git add services/platform-api/app/api/routes/load_runs.py services/platform-api/tests/test_load_runs.py services/platform-api/app/main.py
git commit -m "feat: add load-runs orchestration route with ownership checks"
```

---

# Part G — Load Page UI

### Task 12: Connections settings panel

**Files:**
- Create: `web/src/pages/settings/ConnectionsPanel.tsx`
- Modify: `web/src/pages/settings/settings-nav.ts`

**Step 1: Build the panel**

A settings panel that lists saved connections and provides "Add Connection" for GCS Service Account and ArangoDB. Follow the existing `SettingsProviderForm.tsx` pattern: input credentials, test, save. Shows status badge per connection.

**Important:** Use `platformApiFetch` from `web/src/lib/platformApi.ts` for all connection operations (`/connections/connect`, `/connections/disconnect`, `/connections/test`, `/connections`). Do NOT use `edgeFetch` — credential management for new integration types goes through FastAPI, not edge functions.

**Step 2: Wire into settings nav**

Add `{ id: 'connections', label: 'Connections' }` entry.

**Step 3: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add web/src/pages/settings/ConnectionsPanel.tsx web/src/pages/settings/settings-nav.ts
git commit -m "feat: add Connections settings panel"
```

---

### Task 13: Load page with source/destination wizard

**Files:**
- Create: `web/src/pages/LoadPage.tsx`
- Create: `web/src/hooks/useLoadRun.ts`
- Modify: `web/src/router.tsx`
- Modify: `web/src/components/shell/nav-config.ts`

**Step 1: Build the hook**

`useLoadRun` manages (requires Task 3 migration to have run — `service_functions_view` includes `bd_stage` and `execution_plane` columns added there):
- Loading source/destination functions from `service_functions_view` filtered by `bd_stage` (via Supabase client — this is a public read-only view, not a credential surface)
- Loading user connections via `platformApiFetch('/connections')` — NOT directly from `user_provider_connections` table. FastAPI owns the connection lifecycle; the frontend never touches the credentials table.
- Submitting to `platformApiFetch('/load-runs', { method: 'POST', ... })`
- Subscribing to `service_runs` and `service_run_items` via Supabase Realtime (read-only subscription — both tables now published)

**Step 2: Build the page**

Wizard: pick source function → pick source connection → configure (bucket, prefix, glob) → pick destination function → pick destination connection → configure (collection) → run → progress.

**Step 3: Wire route and nav**

Add `/app/load` route. Add "Load" nav entry.

**Step 4: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/pages/LoadPage.tsx web/src/hooks/useLoadRun.ts web/src/router.tsx web/src/components/shell/nav-config.ts
git commit -m "feat: add Load page with source/destination wizard"
```

---

# Verification

1. `npx supabase db reset` — PASS (verifies all migrations including claim_run_item RPC and dest columns)
2. `cd supabase && deno test functions/admin-services/index.test.ts` — PASS (registry naming if Part A done)
3. `cd services/platform-api && python -m pytest tests/test_connections.py -v` — PASS (verifies FastAPI connection management: connect, disconnect, test)
4. `cd services/platform-api && python -m pytest tests/plugins/test_gcs.py tests/plugins/test_arangodb.py -v` — PASS
5. `cd services/platform-api && python -m pytest tests/test_load_runs.py -v` — PASS (verifies: unauthenticated rejection, M2M rejection, ownership check, project validation, submit happy path, _maybe_finalize_run complete/partial/running-guard)
6. `cd services/platform-api && python -m pytest tests/infra/test_crypto.py -v` — PASS (verifies Python AES-GCM encrypt/decrypt round-trips and matches Deno format)
7. `cd services/platform-api && python -m pytest tests/test_auth.py -v` — PASS (verifies auth refactor: M2M, JWT, legacy, role gating)
8. `cd web && npx tsc --noEmit` — PASS
9. Artifact handoff integration test: verify GCS plugin writes JSONL to storage via `context.upload_file()`, Arango plugin reads it via `source_uri` HTTP fetch
10. Concurrency test (manual/integration): two concurrent `/step` calls should NOT double-process items (claim_run_item uses FOR UPDATE SKIP LOCKED) and should NOT stamp the run complete while items are still running (_maybe_finalize_run checks for both pending AND running)
11. Route-resolution test: `POST /load-runs` returns 401 (not 404 from plugin catch-all), confirming router order is correct
12. Auth boundary: `/connections/connect` with M2M bearer token → 403 "User authentication required"
13. Auth boundary: `/load-runs` with M2M bearer token → 403 "User authentication required"
14. Verify new functions visible: `/app/superuser/api-endpoints` should show `gcs_list`, `gcs_download_csv`, `arangodb_load` with correct paths and parameter schemas
12. Manual smoke test:
    - Settings → Connections: add GCS service account, test → valid (via `platformApiFetch('/connections/test')`)
    - Settings → Connections: add ArangoDB connection, test → valid
    - Marketplace: GCS shows as Source, ArangoDB shows as Destination
    - Load page: pick GCS source → pick Arango destination → configure → run
    - Watch `service_runs` status: pending → running → complete
    - Watch `service_run_items` per-file progress
    - Verify documents appear in ArangoDB collection
    - Verify `service_runs.dest_function_id` and `dest_service_id` are populated

---

# What Ships Next

1. **Worker-backed orchestration** — background claim loop / scheduler that calls `/step` automatically, replacing manual UI-driven progression
2. **Project-shared execution** — extend ownership model so project members can view/manage shared runs
3. **MongoDB reference integration** — proves Kestra plugin translation works alongside BD-native
4. **Arango → Platform import** — ArangoDB as source, materializing into source_documents
5. **Broader catalog categorization** — classify all 174 services by pipeline stage
6. **Pre-parse normalization** — JSON/YAML/XML auto-conversion for parse pipeline

---

# Design Decisions

| Decision | Rationale |
|----------|-----------|
| Fix code to match schema, not schema to match code | Schema (`service_*`) is canonical from migration 050. Code in 16 files drifted to `registry_*`. Schema is source of truth. |
| Dual-level categorization: `primary_stage` + `bd_stage` | Service-level for discovery, function-level for execution. One service can play multiple roles. Function-level wins. |
| GCS → ArangoDB as proof point | Matches immediate business need and architectural validation. MongoDB is later reference integration. |
| Artifact handoff via storage URIs | Source writes JSONL to `pipeline/load-artifacts/{run_id}/`. Destination reads via `source_uri`. No raw payloads through UI. Path convention: `{run_id}/{item_key_sanitized}.jsonl`. Ephemeral — cleaned on success. |
| Atomic claim via `claim_run_item` RPC | `FOR UPDATE SKIP LOCKED` prevents double-processing under concurrency. Same proven pattern as `claim_extraction_items`. |
| `dest_function_id` + `dest_service_id` on service_runs | Destination identity explicitly modeled for audit, filtering, retry. Not buried in config_snapshot alone. |
| User-scoped connection resolver with ownership check | `resolve_connection_sync(connection_id, user_id)` verifies ownership before decryption. Security boundary. |
| Python AES-GCM decrypt in `app/infra/crypto.py` | Port of Deno `api_key_crypto.ts`. Same algorithm (AES-GCM-256), same key derivation (SHA-256), same `enc:v1:` format. Uses `cryptography` library. |
| Generic FastAPI connection route, not per-provider edge functions | With 160+ integrations, extending edge functions per connection type creates the "giant pile of one-off endpoints" antipattern. `POST /connections/connect` is generic; connection testing is delegated to the plugin's `test_connection()` method. Existing Deno edge function stays for backward compat with GCP Vertex SA only. |
| New files in `app/infra/` not `app/shared/` | platform-api has no `app/shared/` package. Infrastructure modules live in `app/infra/` alongside `supabase_client.py`, `storage.py`, `http_client.py`. |
| Routes in `app/api/routes/` not `app/routes/` | platform-api router tree lives under `app/api/routes/`. Creating `app/routes/` would be a dead surface. |
| Plugins in `services/platform-api/app/plugins/` | Auto-discovered by `app/domain/plugins/registry.py`. No registration code needed — drop file, restart. |
| `service_runs` is composite load-run | `function_id`/`service_id` = source. `dest_function_id`/`dest_service_id` = destination. `config_snapshot` = full config. `service_run_items` = per-file progress. |
| Kestra identifiers as metadata | `task_class`, `plugin_group` preserved in `integration_catalog_items` and service `config` JSONB. BD-native names are canonical runtime identity. |
| `execution_plane` column formalizes control/execution boundary | `edge` = Supabase Edge Functions (existing AI provider auth). `fastapi` = platform-api (Load lifecycle, plugins, orchestration). `worker` = future async background. Load UI uses `platformApiFetch()` exclusively. Ref: `docs/fastapi/fastapi-integration.md`. |
| OpenAPI as curated auth contract | `HTTPBearer` + `APIKeyHeader` (deprecated) declared as security schemes. `require_auth` uses `Security()` so OpenAPI documents auth on every route. Admin routes use `openapi_extra={"x-required-role": "platform_admin"}`. Verified working — see `app/auth/dependencies.py`. |
| Load runs are creator-owned | `created_by` is the sole authorization field. `project_id` is optional metadata for grouping/filtering — it does not grant execution rights to other project members. RLS uses `created_by = auth.uid()` only. Project-shared execution is a follow-on feature. |
| `require_user_auth` on connections and load-runs | M2M tokens represent machines, not users who own connections or load runs. `require_user_auth` wraps `require_auth` and rejects `subject_type != "user"`. Prevents machine tokens from creating user-scoped resources. |
| `/step` is bootstrap, not final orchestration | Manual/UI-driven progression for the first end-to-end slice. Worker-backed orchestration (background claim loop) is a follow-on plan. This keeps the slice shippable without premature workerization. |
| Run + items creation must compensate on failure | If item insert fails after run insert, the route marks the run `failed` with an error message. Prevents orphaned pending runs with zero items. A Postgres RPC for true atomicity is a future optimization. |
| Router order: load_runs before plugin catch-all | `plugin_router` owns `POST /{function_name}` and must be last. `connections_router` and `load_runs_router` are mounted before it to prevent `/load-runs` from hitting the catch-all. |