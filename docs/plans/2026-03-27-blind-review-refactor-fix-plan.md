# Blind Review Refactor & Fix Plan

**Goal:** Fix all critical, significant, and minor issues identified by the blind implementation review of 15 commits on 2026-03-27, organized into 7 task groups that can be executed independently.

**Architecture:** All fixes stay within existing service boundaries. No new services, no new routes, no new pages. This is a hardening pass — tighten existing code, fix mismatches, add missing guards.

**Tech Stack:** Python/FastAPI, TypeScript/React, PostgreSQL/Supabase, OpenTelemetry, pytest, Vitest.

**Status:** Draft
**Author:** Blind review agent
**Date:** 2026-03-27

---

## Pre-Implementation Contract

No architectural decision may be improvised during implementation. Every fix below names the exact file, the exact problem, and the exact change. If any fix turns out to require a broader change, stop and revise this plan first.

---

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| POST | `/agchain/benchmarks` | Create benchmark | Modified — auth tightened |
| POST | `/agchain/benchmarks/{slug}/steps` | Create step | Modified — auth tightened |
| PATCH | `/agchain/benchmarks/{slug}/steps/{id}` | Update step | Modified — auth tightened |
| POST | `/agchain/benchmarks/{slug}/steps/reorder` | Reorder steps | Modified — auth tightened |
| DELETE | `/agchain/benchmarks/{slug}/steps/{id}` | Delete step | Modified — auth tightened |
| PATCH | `/secrets/{secret_id}` | Update secret | Modified — value_kind validated |
| DELETE | `/connections/{provider}/{connection_type}` | Disconnect | Modified — verify row exists |

No new endpoints.

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Metric counter | `platform.crypto.plaintext_fallback.count` | `crypto.py:decrypt_with_context` | Track unencrypted values passing through decryption |
| Log warning | `crypto.plaintext_passthrough` | `crypto.py:decrypt_with_context` | Alert on unencrypted data in encrypted columns |
| Log warning | `otel.unknown_sampler` | `otel.py:_build_sampler` | Alert on unrecognized sampler name |

### Database Migrations

No new migrations. One investigation finding invalidated: the `user_variables` uppercase UPDATE is safe because the `(user_id, lower(name))` unique index already prevents case-colliding rows.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

**New pages:** 0
**New components:** 0

**Modified files:** 7

| File | What changes |
|------|--------------|
| `web/src/components/agchain/models/AgchainModelsTable.tsx` | Fix HEALTH_BADGE and AUTH_BADGE key maps |
| `web/src/pages/settings/SettingsSecrets.tsx` | Add delete confirmation dialog |
| `web/src/hooks/useDirectUpload.ts` | Fix stale closure in startUpload |
| `web/src/router.tsx` | Remove dead conditional in LegacyToTransform |
| `web/src/lib/agchainBenchmarks.ts` | Add try/catch around JSON.parse in stepFormValuesToDraft |
| `web/src/components/shell/LeftRailShadcn.tsx` | Remove unconditional notification dot |
| `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx` | Surface JSON parse error to user |

---

## Locked Inventory Counts

- Modified backend files: 12
- Modified frontend files: 7
- Modified agchain runtime files: 4
- Modified config/infra files: 3
- New files: 0
- New migrations: 0

---

## Task Group 1: Security Critical (CORS, Auth, Error Leaks, Credential Merge)

### Task 1.1: Wire CORS to explicit origin list

**File:** `services/platform-api/app/main.py`

**Step 1:** In `create_app()`, replace the CORS wildcard with the existing `settings.auth_redirect_origins`:
```python
# Before:
allow_origins=["*"],

# After:
allow_origins=list(settings.auth_redirect_origins) if settings.auth_redirect_origins else ["http://localhost:5374", "http://localhost:5375"],
```

**Step 2:** Run existing tests to confirm no breakage.
**Test command:** `cd services/platform-api && python -m pytest tests/ -x -q`
**Commit:** `fix: wire CORS allow_origins to AUTH_REDIRECT_ORIGINS instead of wildcard`

### Task 1.2: Tighten benchmark mutation auth to require_superuser

**File:** `services/platform-api/app/api/routes/agchain_benchmarks.py`

**Step 1:** Add import: `from app.auth.dependencies import require_superuser`

**Step 2:** Change auth dependency on 5 mutation routes:
- `create_benchmark_route` (line ~130): `auth: AuthPrincipal = Depends(require_superuser)`
- `create_benchmark_step_route` (line ~193): same
- `update_benchmark_step_route` (line ~228): same
- `reorder_benchmark_steps_route` (line ~266): same
- `delete_benchmark_step_route` (line ~299): same

Leave read-only routes (`list`, `get`, `get_steps`) as `require_user_auth`.

**Step 3:** Update test file `tests/test_agchain_benchmarks.py` — ensure mutation tests use superuser auth header.

**Test command:** `cd services/platform-api && python -m pytest tests/test_agchain_benchmarks.py -x -v`
**Commit:** `fix: require superuser auth for benchmark mutation endpoints`

### Task 1.3: Replace error detail leaks with generic messages

**Files:**
- `services/platform-api/app/api/routes/admin_storage.py`
- `services/platform-api/app/api/routes/storage.py`
- `services/platform-api/app/domain/agchain/model_registry.py`

**Step 1 (admin_storage.py):** Replace line ~235:
```python
# Before:
raise HTTPException(status_code=500, detail=f"Failed to update storage policy: {exc}") from exc
# After:
logger.error("Failed to update storage policy", exc_info=exc)
raise HTTPException(status_code=500, detail="Failed to update storage policy") from exc
```

Same pattern at line ~272:
```python
logger.error("Failed to load recent storage provisioning", exc_info=exc)
raise HTTPException(status_code=500, detail="Failed to load recent storage provisioning") from exc
```

**Step 2 (storage.py):** Replace line ~359:
```python
# Before:
http_exc = HTTPException(status_code=502, detail=f"Failed to create signed upload URL: {exc}")
# After:
logger.error("Failed to create signed upload URL", exc_info=exc)
http_exc = HTTPException(status_code=502, detail="Failed to create signed upload URL")
```

**Step 3 (model_registry.py):** Replace line ~398 inside `_run_provider_probe`:
```python
# Before:
"message": str(exc),
# After:
"message": f"{type(exc).__name__}: probe failed",
```
Log the full exception server-side:
```python
logger.error("Health probe failed for model target", exc_info=exc)
```

**Test command:** `cd services/platform-api && python -m pytest tests/ -x -q`
**Commit:** `fix: remove internal error details from HTTP responses, log server-side`

### Task 1.4: Replace credential merge with explicit key selection

**File:** `services/platform-api/app/infra/connection.py`

**Step 1:** Replace the blind dict merge at line ~37:
```python
# Before:
return {**metadata, **creds}

# After:
# Credentials are authoritative; metadata provides non-overlapping context.
merged = dict(metadata)
for key, value in creds.items():
    if key in merged:
        logger.warning("credential key %r shadows metadata key — credential wins", key)
    merged[key] = value
return merged
```

Add `import logging` and `logger = logging.getLogger(__name__)` at top.

**Test command:** `cd services/platform-api && python -m pytest tests/test_connections.py -x -v`
**Commit:** `fix: log warning when credential keys shadow metadata in connection resolve`

---

## Task Group 2: Crypto Hardening

### Task 2.1: Add logging and metric for plaintext fallback path

**File:** `services/platform-api/app/infra/crypto.py`

**Step 1:** In `decrypt_with_context` (line ~43), replace silent return:
```python
# Before:
if not ciphertext.startswith("enc:v1:"):
    return ciphertext  # plaintext fallback

# After:
if not ciphertext.startswith("enc:v1:"):
    _logger.warning("crypto.plaintext_passthrough context=%s length=%d", context, len(ciphertext))
    _increment_plaintext_counter()
    return ciphertext
```

**Step 2:** Add the same guard in `decrypt_with_fallback` (line ~71):
```python
if not ciphertext.startswith("enc:v1:"):
    _logger.warning("crypto.plaintext_passthrough context=%s length=%d", context, len(ciphertext))
    _increment_plaintext_counter()
    return ciphertext
```

**Step 3:** Add counter helper (similar pattern to `_increment_fallback_counter`):
```python
_plaintext_counter = None

def _increment_plaintext_counter() -> None:
    global _plaintext_counter
    if _plaintext_counter is None:
        try:
            from opentelemetry import metrics
            meter = metrics.get_meter("platform-api")
            _plaintext_counter = meter.create_counter(
                "platform.crypto.plaintext_fallback.count",
                description="Count of values returned without decryption (no enc:v1: prefix)",
            )
        except Exception:
            return
    if _plaintext_counter is not None:
        _plaintext_counter.add(1)
```

**Step 4:** In `decrypt_with_fallback`, log exception types in the swallowed catch blocks:
```python
# Before:
except Exception:
    pass

# After:
except Exception as exc:
    _logger.debug("Primary key decryption failed: %s", type(exc).__name__)
```

Same for the fallback catch block.

**Step 5:** Add `"platform.crypto.plaintext_fallback.count"` constant to `services/platform-api/app/observability/contract.py`:
```python
CRYPTO_PLAINTEXT_COUNTER_NAME: str = "platform.crypto.plaintext_fallback.count"
```
Then import and use it in crypto.py.

**Test command:** `cd services/platform-api && python -m pytest tests/infra/test_crypto.py -x -v`
**Commit:** `fix: log and count plaintext fallback path in crypto, stop swallowing exceptions silently`

---

## Task Group 3: OTel / Observability Cleanup

### Task 3.1: Commit uncommitted protocol guard and cluster.xml fix

**Step 1:** Stage and commit the 4 files in the working tree:
- `docker/signoz/clickhouse/cluster.xml` (zookeeper hostname fix)
- `services/platform-api/app/observability/otel.py` (protocol whitelist)
- `services/platform-api/tests/test_observability.py` (protocol tests)
- `docs/plans/2026-03-27-opentelemetry-first-observability-contract-implementation-plan.md` (plan corrections)

**Commit:** `fix: commit protocol whitelist guard, SigNoz cluster hostname fix, and plan corrections`

### Task 3.2: Remove duplicate sampler imports

**File:** `services/platform-api/app/observability/otel.py`

**Step 1:** Remove the unused imports at lines ~48-53 inside `configure_telemetry`:
```python
# Remove these lines:
from opentelemetry.sdk.trace.sampling import (
    ALWAYS_OFF,
    ALWAYS_ON,
    ParentBased,
    TraceIdRatioBased,
)
```
These are already imported inside `_build_sampler`.

**Test command:** `cd services/platform-api && python -m pytest tests/test_observability.py -x -v`
**Commit:** `fix: remove duplicate sampler imports from configure_telemetry`

### Task 3.3: Add warning for unknown sampler names

**File:** `services/platform-api/app/observability/otel.py`

**Step 1:** In `_build_sampler` (line ~154), replace silent fallback:
```python
# Before:
return ALWAYS_ON

# After:
logger.warning("Unknown OTEL_TRACES_SAMPLER %r — defaulting to ALWAYS_ON", name)
return ALWAYS_ON
```

**Commit:** `fix: log warning for unrecognized OTel sampler name`

### Task 3.4: Promote storage metric names to contract module

**Files:**
- `services/platform-api/app/observability/contract.py`
- `services/platform-api/app/observability/storage_metrics.py`

**Step 1:** Add storage metric name constants to `contract.py`:
```python
# ── Storage metric names ───────────────────────────────────────────
STORAGE_QUOTA_READ_COUNT: str = "platform.storage.quota.read.count"
STORAGE_UPLOAD_RESERVE_COUNT: str = "platform.storage.upload.reserve.count"
STORAGE_UPLOAD_RESERVE_FAILURE_COUNT: str = "platform.storage.upload.reserve.failure.count"
STORAGE_UPLOAD_COMPLETE_COUNT: str = "platform.storage.upload.complete.count"
STORAGE_UPLOAD_COMPLETE_FAILURE_COUNT: str = "platform.storage.upload.complete.failure.count"
STORAGE_UPLOAD_CANCEL_COUNT: str = "platform.storage.upload.cancel.count"
STORAGE_OBJECT_DELETE_COUNT: str = "platform.storage.object.delete.count"
STORAGE_QUOTA_EXCEEDED_COUNT: str = "platform.storage.quota.exceeded.count"
STORAGE_ADMIN_POLICY_UPDATE_COUNT: str = "platform.admin.storage.policy.update.count"
STORAGE_ADMIN_PROVISIONING_INCOMPLETE_COUNT: str = "platform.admin.storage.provisioning.incomplete.count"
STORAGE_UPLOAD_RESERVE_DURATION_MS: str = "platform.storage.upload.reserve.duration.ms"
STORAGE_UPLOAD_COMPLETE_DURATION_MS: str = "platform.storage.upload.complete.duration.ms"
STORAGE_ADMIN_POLICY_DURATION_MS: str = "platform.admin.storage.policy.duration.ms"
STORAGE_ADMIN_PROVISIONING_QUERY_DURATION_MS: str = "platform.admin.storage.provisioning.query.duration.ms"
```

**Step 2:** Replace inline strings in `storage_metrics.py` with imports from contract.

**Step 3:** Add frozen-name assertions to `tests/test_observability_contract.py`.

**Test command:** `cd services/platform-api && python -m pytest tests/test_observability_contract.py tests/test_observability.py -x -v`
**Commit:** `refactor: promote storage metric names to observability contract module`

---

## Task Group 4: Backend Code Quality

### Task 4.1: Validate `value_kind` on secret update

**File:** `services/platform-api/app/api/routes/secrets.py`

**Step 1:** Change `UpdateSecretRequest.value_kind` from `str | None` to `SecretValueKind | None`:
```python
# Before (line ~89):
value_kind: str | None = None

# After:
value_kind: SecretValueKind | None = None
```

**Test command:** `cd services/platform-api && python -m pytest tests/test_secrets.py -x -v`
**Commit:** `fix: validate value_kind on secret update to match create constraint`

### Task 4.2: Verify disconnect row exists before returning success

**File:** `services/platform-api/app/api/routes/connections.py`

**Step 1:** After the update call (line ~87), check result:
```python
result = sb.table("user_provider_connections").update(
    {"status": "disconnected", ...}
).eq("provider", provider).eq("connection_type", connection_type).eq("user_id", auth.user_id).execute()

if not result.data:
    raise HTTPException(status_code=404, detail="Connection not found")
```

**Test command:** `cd services/platform-api && python -m pytest tests/test_connections.py -x -v`
**Commit:** `fix: return 404 when disconnect targets a non-existent connection`

### Task 4.3: Guard empty PATCH body on secrets

**File:** `services/platform-api/app/api/routes/secrets.py`

**Step 1:** After `updates = body.model_dump(exclude_none=True)` (line ~154), add:
```python
if not updates:
    raise HTTPException(status_code=422, detail="No fields to update")
```

**Test command:** `cd services/platform-api && python -m pytest tests/test_secrets.py -x -v`
**Commit:** `fix: reject empty PATCH body on secrets update`

### Task 4.4: Add conftest fixture for get_settings cache clearing

**File:** `services/platform-api/tests/conftest.py` (create if not exists, or append)

**Step 1:** Add autouse fixture:
```python
@pytest.fixture(autouse=True)
def _clear_settings_cache():
    from app.core.config import get_settings
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
```

**Step 2:** Remove manual `cache_clear()` calls from individual test files (optional cleanup pass).

**Test command:** `cd services/platform-api && python -m pytest tests/ -x -q`
**Commit:** `fix: add autouse conftest fixture for get_settings cache clearing`

### Task 4.5: Fix N+1 in list_model_targets with batch credential lookup

**File:** `services/platform-api/app/domain/agchain/model_registry.py`

**Step 1:** Extract credential resolution into a batch function that queries `user_api_keys` and `user_provider_connections` once each for all rows, then distribute results per row.

This is the largest single refactor task. Sketch:
```python
def _batch_resolve_credential_statuses(sb, user_id: str, rows: list[dict]) -> dict[str, str]:
    """Returns {model_target_id: credential_status} for all rows in one pass."""
    # Group rows by auth_kind
    api_key_rows = [r for r in rows if _catalog_auth_kind(r) == "api_key"]
    connection_rows = [r for r in rows if _catalog_auth_kind(r) == "connection"]

    # One query for api_key rows
    api_key_statuses = {}
    if api_key_rows:
        providers = list({r["provider"] for r in api_key_rows})
        keys_result = sb.table("user_api_keys").select("provider").eq("user_id", user_id).in_("provider", providers).execute()
        existing_providers = {row["provider"] for row in (keys_result.data or [])}
        for r in api_key_rows:
            api_key_statuses[r["model_target_id"]] = "ready" if r["provider"] in existing_providers else "missing"

    # One query for connection rows
    conn_statuses = {}
    if connection_rows:
        providers = list({r["provider"] for r in connection_rows})
        conns_result = sb.table("user_provider_connections").select("provider, status").eq("user_id", user_id).in_("provider", providers).execute()
        conn_map = {row["provider"]: row["status"] for row in (conns_result.data or [])}
        for r in connection_rows:
            conn = conn_map.get(r["provider"])
            if not conn:
                conn_statuses[r["model_target_id"]] = "missing"
            elif conn == "connected":
                conn_statuses[r["model_target_id"]] = "ready"
            else:
                conn_statuses[r["model_target_id"]] = "disconnected"

    # Merge
    not_required = {r["model_target_id"]: "not_required" for r in rows if _catalog_auth_kind(r) == "none"}
    return {**not_required, **api_key_statuses, **conn_statuses}
```

**Step 2:** Wire `list_model_targets` to use batch function instead of per-row `_normalize_row`.

**Test command:** `cd services/platform-api && python -m pytest tests/test_agchain_models.py -x -v`
**Commit:** `perf: batch credential status resolution in list_model_targets (fix N+1)`

### Task 4.6: Fix N+1 in list_benchmarks with batch model count

**File:** `services/platform-api/app/domain/agchain/benchmark_registry.py`

**Step 1:** Replace per-benchmark `_get_selected_eval_model_count` call with a single batch query:
```python
# Before the loop:
model_counts_result = sb.table("agchain_benchmark_model_targets").select(
    "benchmark_version_id", count="exact"
).in_("benchmark_version_id", list(version_ids)).execute()
# Build a dict: {version_id: count}

# In the loop:
"selected_eval_model_count": model_count_map.get(version_id, 0),
```

**Test command:** `cd services/platform-api && python -m pytest tests/test_agchain_benchmarks.py -x -v`
**Commit:** `perf: batch model count query in list_benchmarks (fix N+1)`

### Task 4.7: Wrap step reorder in an RPC for atomicity

**File:** `services/platform-api/app/domain/agchain/benchmark_registry.py`

**Step 1:** Create a Supabase RPC (`reorder_benchmark_steps_atomic`) that accepts an array of `{step_id, step_order}` and executes all updates in a single transaction.

**Step 2:** Add a migration for the RPC:
```sql
CREATE OR REPLACE FUNCTION public.reorder_benchmark_steps_atomic(
  p_benchmark_version_id UUID,
  p_step_orders JSONB  -- array of {step_id, step_order}
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_step_orders)
  LOOP
    UPDATE public.agchain_benchmark_steps
    SET step_order = (item->>'step_order')::INT,
        updated_at = now()
    WHERE benchmark_step_id = (item->>'step_id')::UUID
      AND benchmark_version_id = p_benchmark_version_id;
  END LOOP;
END;
$$;
```

**Step 3:** Call the RPC from Python instead of the per-row update loop.

**Test command:** `cd services/platform-api && python -m pytest tests/test_agchain_benchmarks.py -x -v`
**Commit:** `fix: wrap step reorder in atomic RPC to prevent partial updates`

Note: This task requires a new migration file. Migration filename: `supabase/migrations/20260328000000_reorder_benchmark_steps_atomic.sql`.

---

## Task Group 5: Frontend Fixes

### Task 5.1: Fix badge key maps to match backend values

**File:** `web/src/components/agchain/models/AgchainModelsTable.tsx`

**Step 1:** Replace HEALTH_BADGE:
```typescript
// Before:
const HEALTH_BADGE: Record<string, 'green' | 'red' | 'yellow' | 'gray'> = {
  healthy: 'green',
  unhealthy: 'red',
  degraded: 'yellow',
  unknown: 'gray',
};

// After:
const HEALTH_BADGE: Record<string, 'green' | 'red' | 'yellow' | 'gray'> = {
  healthy: 'green',
  error: 'red',
  degraded: 'yellow',
};
```

**Step 2:** Replace AUTH_BADGE:
```typescript
// Before:
const AUTH_BADGE: Record<string, 'green' | 'yellow' | 'gray'> = {
  configured: 'green',
  missing: 'yellow',
  unknown: 'gray',
};

// After:
const AUTH_BADGE: Record<string, 'green' | 'red' | 'yellow' | 'gray'> = {
  ready: 'green',
  not_required: 'green',
  missing: 'yellow',
  invalid: 'red',
  disconnected: 'red',
};
```

**Test command:** `cd web && npx vitest run src/components/agchain --reporter=verbose`
**Commit:** `fix: align health and auth badge keys with backend status values`

### Task 5.2: Add delete confirmation to secrets page

**File:** `web/src/pages/settings/SettingsSecrets.tsx`

**Step 1:** In `handleDelete`, add a confirm before the API call:
```typescript
const handleDelete = async (secret: SecretMetadata) => {
  if (!window.confirm(`Delete secret "${secret.name}"? This cannot be undone.`)) return;
  // ... rest of existing logic
```

**Test command:** `cd web && npx vitest run src/pages/settings/SettingsSecrets.test.tsx --reporter=verbose`
**Commit:** `fix: add delete confirmation dialog for secrets`

### Task 5.3: Fix stale closure in useDirectUpload

**File:** `web/src/hooks/useDirectUpload.ts`

**Step 1:** Use a ref instead of the state value for the pending filter:
```typescript
const filesRef = useRef(files);
filesRef.current = files;

const startUpload = useCallback(async (): Promise<string[]> => {
  // ...
  const pending = filesRef.current.filter((f) => f.status === 'pending');
  // ... rest unchanged
}, [projectId]);  // Remove files from dependency array
```

**Test command:** `cd web && npx vitest run src/hooks/useDirectUpload.test.tsx --reporter=verbose`
**Commit:** `fix: use ref for files in startUpload to avoid stale closure`

### Task 5.4: Remove dead conditional in router

**File:** `web/src/router.tsx`

**Step 1:** Replace:
```typescript
// Before:
const target = projectId ? `/app/transform` : '/app/transform';

// After:
const target = '/app/transform';
```

Remove the unused `projectId` extraction if it has no other consumers.

**Commit:** `fix: remove dead conditional in LegacyToTransform router component`

### Task 5.5: Add JSON parse error handling in step form

**File:** `web/src/lib/agchainBenchmarks.ts`

**Step 1:** Wrap the `JSON.parse` call in `stepFormValuesToDraft` (line ~256):
```typescript
// Before:
const parsed = JSON.parse(trimmedJson);

// After:
let parsed: unknown;
try {
  parsed = JSON.parse(trimmedJson);
} catch {
  throw new Error('Step config is not valid JSON. Check syntax and try again.');
}
```

**Commit:** `fix: surface user-friendly error for invalid JSON in step config`

### Task 5.6: Remove unconditional notification dot

**File:** `web/src/components/shell/LeftRailShadcn.tsx`

**Step 1:** Remove the hardcoded blue dot at line ~799:
```tsx
// Remove this line:
<span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
```

**Test command:** `cd web && npx vitest run src/components/shell/LeftRailShadcn.test.tsx --reporter=verbose`
**Commit:** `fix: remove placeholder notification dot until notifications are wired`

---

## Task Group 6: Agchain Runtime Hardening

### Task 6.1: Fix DirectBackend to use asyncio.to_thread

**File:** `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py`

**Step 1:** Replace the synchronous call in `execute`:
```python
# Before:
response_text = self._adapter.call_model(messages, temperature=temperature, max_tokens=max_tokens)

# After:
import asyncio
response_text = await asyncio.to_thread(
    self._adapter.call_model, messages, temperature=temperature, max_tokens=max_tokens
)
```

**Test command:** `cd _agchain/legal-10 && python -m pytest tests/test_execution_backend.py -x -v`
**Commit:** `fix: use asyncio.to_thread in DirectBackend.execute to avoid blocking event loop`

### Task 6.2: Move HTTP client creation to adapter __init__

**File:** `_agchain/legal-10/runspecs/3-STEP-RUN/adapters/model_adapter.py`

**Step 1 (OpenAIAdapter):** Move `OpenAI()` from `call_model` to `__init__`:
```python
def __init__(self, *, model: str, api_key: str | None = None, base_url: str | None = None):
    self._model = model
    self._api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
    self._base_url = base_url
    from openai import OpenAI
    self._client = OpenAI(api_key=self._api_key, base_url=self._base_url)
```

**Step 2 (AnthropicAdapter):** Same pattern:
```python
def __init__(self, *, model: str, api_key: str | None = None):
    self._model = model
    self._api_key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")
    from anthropic import Anthropic
    self._client = Anthropic(api_key=self._api_key)
```

**Step 3:** Update `call_model` in both to use `self._client` instead of creating a new one.

**Test command:** `cd _agchain/legal-10 && python -m pytest tests/test_execution_backend.py -x -v`
**Commit:** `perf: create OpenAI/Anthropic clients once in adapter __init__, not per call`

### Task 6.3: Fix AnthropicAdapter to concatenate system messages

**File:** `_agchain/legal-10/runspecs/3-STEP-RUN/adapters/model_adapter.py`

**Step 1:** Replace the loop that overwrites:
```python
# Before:
system_msg = ""
for msg in messages:
    if msg["role"] == "system":
        system_msg = msg["content"]

# After:
system_parts = []
api_messages = []
for msg in messages:
    if msg["role"] == "system":
        system_parts.append(msg["content"])
    else:
        api_messages.append(msg)
system_msg = "\n\n".join(system_parts)
```

**Test command:** `cd _agchain/legal-10 && python -m pytest tests/test_execution_backend.py -x -v`
**Commit:** `fix: concatenate multiple system messages in AnthropicAdapter instead of dropping`

### Task 6.4: Document phase-gate behavior in from_profile and add test

**File:** `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/runtime_config.py`

**Step 1:** Add docstring clarification to `from_profile`:
```python
@classmethod
def from_profile(cls, profile: Any, *, backend: str = "direct") -> "RuntimeConfig":
    """Build a RuntimeConfig from an existing Profile object.

    Note: The phase-gate validator will reject capabilities not yet permitted
    (e.g., tool_mode != 'none'). This is intentional — from_profile faithfully
    translates the Profile, and the validator enforces the current phase boundary.
    Callers should catch ValidationError if they need to handle this gracefully.
    """
```

**Step 2:** Add test in `_agchain/legal-10/tests/test_runtime_config.py`:
```python
def test_from_profile_rejects_non_baseline_tool_mode():
    """Non-baseline profile with tool_mode != 'none' is rejected by phase gate."""
    # ... construct a profile with tool_strategy.strategy_id = "standard"
    with pytest.raises(ValidationError, match="tool_mode.*not permitted"):
        RuntimeConfig.from_profile(modified_profile)
```

**Test command:** `cd _agchain/legal-10 && python -m pytest tests/test_runtime_config.py -x -v`
**Commit:** `docs: document phase-gate behavior in from_profile, add rejection test`

---

## Task Group 7: Miscellaneous Cleanup

### Task 7.1: Remove source_documents bridge dead parameter

**File:** `services/platform-api/app/services/storage_source_documents.py`

**Step 1:** Remove `storage_object_id` from the function signature and the `del` statement. Update all callers (in `services/platform-api/app/api/routes/storage.py`) to stop passing it.

**Test command:** `cd services/platform-api && python -m pytest tests/test_storage_source_documents.py tests/test_storage_routes.py -x -v`
**Commit:** `fix: remove unused storage_object_id parameter from source document bridge`

### Task 7.2: Extract shared _set_span_attrs helper

**Files:**
- `services/platform-api/app/api/routes/agchain_models.py`
- `services/platform-api/app/api/routes/agchain_benchmarks.py`

**Step 1:** The identical `_set_span_attrs` function exists in both files. Move it to `services/platform-api/app/observability/contract.py` and import from there.

**Commit:** `refactor: extract shared _set_span_attrs to observability contract module`

### Task 7.3: Drop old reserve_user_storage function overload

**File:** New migration `supabase/migrations/20260328000100_drop_old_reserve_user_storage_overload.sql`

**Step 1:** Check if the old 8-parameter overload exists and drop it:
```sql
-- Drop the original 8-parameter overload if it still exists alongside the new 11-parameter version
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'reserve_user_storage'
      AND array_length(p.proargtypes, 1) = 8
  ) THEN
    DROP FUNCTION public.reserve_user_storage(UUID, UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT);
  END IF;
END;
$$;
```

**Commit:** `fix: drop stale 8-parameter reserve_user_storage overload`

---

## Completion Criteria

The work is complete only when all of the following are true:

1. All 7 critical issues (C1-C7) are resolved.
2. All significant issues addressed in this plan have passing tests.
3. The checklist in `docs/refactor-issue-checklist.md` has every item checked.
4. No new regressions are introduced — all existing test suites pass.
5. Every fix has its own commit with a descriptive message.

---

## Explicit Risks Accepted In This Plan

1. **KDF migration (C2)** is documented but not changed in this plan because the scheme must remain compatible with the Deno implementation. A separate migration plan is needed to transition to HKDF with re-encryption.
2. **resolve_connection_sync blocking (S8)** is noted but not changed here because it would require changing the plugin test_connection call chain. Tracked for a future async conversion pass.
3. **InspectBackend assistant role (S19)** is not changed here because the current runner never sends assistant messages. Tracked for when multi-turn support is added.
4. **No pagination on list endpoints (M15)** is tracked but not implemented here — it requires frontend changes to support paginated fetching. Separate plan needed.
