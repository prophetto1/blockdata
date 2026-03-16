# Platform AI Provider Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create platform-level AI provider key management entirely through FastAPI, with superuser UI pages that are bidirectionally synced with the `platform_api_keys` table. No edge functions are created or modified.

**Architecture:** New `platform_api_keys` table (service_role only). FastAPI owns all backend work: encrypted key CRUD, key validation (replaces `test-api-key` edge function), and model role CRUD (replaces direct browser supabase writes). Frontend superuser pages call FastAPI via `platformApiFetch`. Chat streaming migration to FastAPI is Phase 2 (separate plan).

**Tech Stack:** Supabase Postgres migration, Python FastAPI (`services/platform-api/`), AES-GCM encryption (`app/infra/crypto.py`), `httpx` for provider API validation, React/TypeScript frontend (Vite).

---

## Architectural Alignment

This plan follows the FastAPI Execution Plane direction (`docs/plans/2026-03-15-fastapi-execution-plane-systematic-buildout.md`):

- **No new edge functions.** No modifications to existing edge functions.
- **All new backend work lands in FastAPI.** Key validation, key CRUD, model role CRUD.
- **Edge functions are not the future pattern.** The existing `assistant-chat` and `test-api-key` edge functions are untouched here and scheduled for migration in Phase 2.

## Scope

### In scope (this plan)
- `platform_api_keys` table migration
- FastAPI routes: key CRUD, key validation, model role CRUD
- Superuser UI: AI Providers overview + detail form, Model Roles page
- Router/nav rewire: move from settings to superuser, redirects for old URLs
- Chat panel cleanup: remove settings gear and hardcoded model name

### Out of scope (Phase 2 — separate plan)
- `assistant-chat` edge function migration to FastAPI (requires SSE streaming, `sse-starlette`, porting 4 provider streaming implementations to Python, client-side streaming support in `platformApiFetch`)
- `test-api-key` edge function deprecation (replaced by FastAPI route in this plan, but edge function stays for backward compat)
- Vertex SA credential migration into `platform_api_keys`

---

## Crypto Cross-Compatibility

Python `crypto.py` and Deno `api_key_crypto.ts` have **different key derivation**:

- **Python** (`crypto.py:22`): `SHA256(secret + context)`
- **Deno** (`api_key_crypto.ts:18`): `SHA256(secret + "\n" + context + "\n")`

Phase 2 will need Deno to decrypt platform keys. This plan adds `encrypt_for_deno()` to Python so keys are encrypted with Deno-compatible derivation, avoiding a re-encryption migration later.

**Encryption secret:** `SUPABASE_SERVICE_ROLE_KEY` from environment, matching the established pattern in the connections route (`app/api/routes/connections.py`) and connection resolver (`app/infra/connection.py`). No policy table indirection.

**Two derivation functions, two purposes:**
- `encrypt_with_context` — Python-to-Python round-trips (user provider connections)
- `encrypt_for_deno` — Python-encrypts, Deno-decrypts (platform API keys, consumed by `assistant-chat` in Phase 2)

**Test route is side-effect-free.** The `/{provider}/test` endpoint validates a key against the provider API but does not update `is_valid` in the database. Only the save route (`PUT /{provider}`) should set validation state, ensuring a tested ad-hoc key cannot mark a different saved key as valid.

---

## Existing infrastructure reused

- `services/platform-api/app/infra/crypto.py` — AES-GCM encrypt/decrypt (exists)
- `services/platform-api/app/auth/dependencies.py` — `require_superuser`, `require_user_auth` (exists)
- `services/platform-api/app/infra/supabase_client.py` — `get_supabase_admin()` (exists)
- `services/platform-api/requirements.txt` — `httpx>=0.26` (exists, used for provider validation calls)
- `web/src/lib/platformApi.ts` — `platformApiFetch()` (exists)
- `web/src/pages/settings/SettingsProviderForm.tsx` — `PROVIDERS` array lines 59-163 (reference for provider metadata)
- `web/src/pages/settings/SettingsModelRoles.tsx` — reference for model role UI (186 lines)
- `web/src/pages/settings/SettingsPageHeader.tsx` — `SettingsPageFrame` / `SettingsSection` components

---

# Part A — Database

### Task 1: Create platform_api_keys table

**Files:**
- Create: `supabase/migrations/20260316100000_097_platform_api_keys.sql`

**Step 1: Write the migration**

```sql
-- Platform-level API keys for AI providers.
-- Admin-managed via FastAPI admin route. One row per provider.
-- Regular users never access this table — RLS blocks all non-service-role access.

CREATE TABLE IF NOT EXISTS public.platform_api_keys (
  provider            text PRIMARY KEY,
  api_key_encrypted   text NOT NULL,
  key_suffix          text,
  is_valid            boolean,
  default_model       text,
  base_url            text,
  configured_by       uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_api_keys IS
  'Platform-level API keys for AI providers. One row per provider. Admin-managed via FastAPI.';

ALTER TABLE public.platform_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_api_keys_service_role
  ON public.platform_api_keys FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.platform_api_keys FROM anon, authenticated;
GRANT ALL ON TABLE public.platform_api_keys TO service_role;
```

**Step 2: Verify**

Run: `cd supabase && npx supabase db reset`
Expected: PASS

**Step 3: Commit**

```bash
git add supabase/migrations/20260316100000_097_platform_api_keys.sql
git commit -m "feat: add platform_api_keys table for admin-managed AI provider keys"
```

---

# Part B — FastAPI Backend

### Task 2: Add Deno-compatible encryption to crypto.py

**Files:**
- Modify: `services/platform-api/app/infra/crypto.py`

**Step 1: Add Deno-compatible key derivation and encrypt function**

Add after the existing `_derive_key` function (after line 22):

```python
def _derive_key_deno_compat(secret: str, context: str) -> bytes:
    """Key derivation matching Deno api_key_crypto.ts deriveAesKey format."""
    return hashlib.sha256(f"{secret}\n{context}\n".encode("utf-8")).digest()


def encrypt_for_deno(plaintext: str, secret: str, context: str) -> str:
    """Encrypt a value that Deno's decryptWithContext can decrypt.

    Uses the Deno key derivation convention: SHA256(secret + '\\n' + context + '\\n').
    Format: enc:v1:{base64url(iv)}:{base64url(ciphertext)}
    """
    key = _derive_key_deno_compat(secret, context)
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    ct = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    return f"enc:v1:{_b64url_encode(iv)}:{_b64url_encode(ct)}"
```

**Step 2: Verify**

Run: `cd services/platform-api && python -c "from app.infra.crypto import encrypt_for_deno; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add services/platform-api/app/infra/crypto.py
git commit -m "feat: add Deno-compatible encryption for cross-runtime key sharing"
```

---

### Task 3: Create admin AI providers route (CRUD + validation)

**Files:**
- Create: `services/platform-api/app/api/routes/admin_ai_providers.py`
- Modify: `services/platform-api/app/main.py` (register router)

**Step 1: Create the route**

Create `services/platform-api/app/api/routes/admin_ai_providers.py`:

```python
"""Admin AI provider key management — CRUD + validation for platform_api_keys.

Superuser-only. These keys are the platform default for all AI features.
Key validation uses httpx to probe each provider's API directly.
"""
import logging
import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import require_superuser
from app.auth.principals import AuthPrincipal
from app.infra.crypto import encrypt_for_deno
from app.infra.supabase_client import get_supabase_admin

logger = logging.getLogger("admin-ai-providers")
router = APIRouter(prefix="/admin/ai-providers", tags=["admin-ai-providers"])

CRYPTO_CONTEXT = "platform-api-keys-v1"

VALID_PROVIDERS = {
    "anthropic", "openai", "google", "voyage", "cohere", "jina", "custom",
}

# Provider validation endpoints
PROVIDER_VALIDATION = {
    "anthropic": {
        "method": "POST",
        "url": "https://api.anthropic.com/v1/messages",
        "headers": lambda key: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        "body": {
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 1,
            "messages": [{"role": "user", "content": "ping"}],
        },
    },
    "openai": {
        "method": "GET",
        "url": "https://api.openai.com/v1/models",
        "headers": lambda key: {"Authorization": f"Bearer {key}"},
    },
    "google": {
        "method": "GET",
        "url": "https://generativelanguage.googleapis.com/v1beta/models",
        "headers": lambda key: {"x-goog-api-key": key},
    },
    "voyage": {
        "method": "GET",
        "url": "https://api.voyageai.com/v1/models",
        "headers": lambda key: {"Authorization": f"Bearer {key}"},
    },
    "cohere": {
        "method": "GET",
        "url": "https://api.cohere.com/v2/models",
        "headers": lambda key: {"Authorization": f"Bearer {key}"},
    },
    "jina": {
        "method": "GET",
        "url": "https://api.jina.ai/v1/models",
        "headers": lambda key: {"Authorization": f"Bearer {key}"},
    },
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SaveKeyRequest(BaseModel):
    api_key: str
    default_model: str | None = None
    base_url: str | None = None


class TestKeyRequest(BaseModel):
    api_key: str
    base_url: str | None = None


@router.get("", summary="List platform AI provider keys",
            openapi_extra={"x-required-role": "platform_admin"})
async def list_platform_keys(su: AuthPrincipal = Depends(require_superuser)):
    """Return all platform keys with safe fields only (never the encrypted key)."""
    sb = get_supabase_admin()
    result = sb.table("platform_api_keys").select(
        "provider, key_suffix, is_valid, default_model, base_url, configured_by, updated_at"
    ).order("provider").execute()
    return {"keys": result.data or []}


@router.put("/{provider}", summary="Save platform AI provider key",
            openapi_extra={"x-required-role": "platform_admin"})
async def save_platform_key(provider: str, body: SaveKeyRequest,
                            su: AuthPrincipal = Depends(require_superuser)):
    """Encrypt and upsert a platform API key for a provider."""
    if provider not in VALID_PROVIDERS:
        raise HTTPException(400, f"Invalid provider. Must be one of: {', '.join(sorted(VALID_PROVIDERS))}")

    api_key = body.api_key.strip()
    if not api_key:
        raise HTTPException(400, "Missing api_key")

    if provider == "custom" and not body.base_url:
        raise HTTPException(400, "Custom provider requires base_url")

    base_url = None
    if body.base_url:
        base_url = body.base_url.strip()
        if not base_url.startswith(("http://", "https://")):
            raise HTTPException(400, "base_url must use http or https")

    secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not secret:
        raise HTTPException(500, "SUPABASE_SERVICE_ROLE_KEY not set")

    key_suffix = api_key[-4:]
    encrypted = encrypt_for_deno(api_key, secret, CRYPTO_CONTEXT)

    sb = get_supabase_admin()
    sb.table("platform_api_keys").upsert({
        "provider": provider,
        "api_key_encrypted": encrypted,
        "key_suffix": key_suffix,
        "is_valid": None,
        "default_model": body.default_model,
        "base_url": base_url,
        "configured_by": su.user_id,
        "updated_at": _now(),
    }, on_conflict="provider").execute()

    return {"ok": True, "provider": provider, "key_suffix": key_suffix}


@router.delete("/{provider}", summary="Delete platform AI provider key",
               openapi_extra={"x-required-role": "platform_admin"})
async def delete_platform_key(provider: str,
                              su: AuthPrincipal = Depends(require_superuser)):
    """Remove a platform API key."""
    if provider not in VALID_PROVIDERS:
        raise HTTPException(400, "Invalid provider")

    sb = get_supabase_admin()
    sb.table("platform_api_keys").delete().eq("provider", provider).execute()
    return {"ok": True, "deleted": provider}


@router.post("/{provider}/test", summary="Test an API key against a provider",
             openapi_extra={"x-required-role": "platform_admin"})
async def test_api_key(provider: str, body: TestKeyRequest,
                       su: AuthPrincipal = Depends(require_superuser)):
    """Validate an API key by making a lightweight probe request to the provider."""
    api_key = body.api_key.strip()

    if not api_key:
        return {"valid": False, "error": "No API key provided"}

    if provider == "custom":
        if not body.base_url:
            return {"valid": False, "error": "Custom provider requires base_url"}
        base_url = body.base_url.strip().rstrip("/")
        url = f"{base_url}/models"
        headers = {"Authorization": f"Bearer {api_key}"}
        method = "GET"
        json_body = None
    elif provider in PROVIDER_VALIDATION:
        spec = PROVIDER_VALIDATION[provider]
        method = spec["method"]
        url = spec["url"]
        headers = spec["headers"](api_key)
        json_body = spec.get("body")
    else:
        return {"valid": False, "error": f"Unknown provider: {provider}"}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            if method == "POST":
                resp = await client.post(url, headers=headers, json=json_body)
            else:
                resp = await client.get(url, headers=headers)

        if resp.is_success:
            return {"valid": True}

        if resp.status_code in (401, 403):
            return {"valid": False, "error": "Invalid or disabled API key"}

        logger.warning("Provider %s validation failed: HTTP %s", provider, resp.status_code)
        return {"valid": False, "error": f"Provider returned HTTP {resp.status_code}"}

    except httpx.TimeoutException:
        return {"valid": False, "error": "Provider did not respond in time"}
    except Exception:
        logger.exception("Unexpected error validating %s key", provider)
        return {"valid": False, "error": "Validation failed unexpectedly"}
```

**Step 2: Register the router in main.py**

In `services/platform-api/app/main.py`, add alongside the other admin route includes:

```python
    from app.api.routes.admin_ai_providers import router as admin_ai_router
    app.include_router(admin_ai_router)
```

**Step 3: Verify**

Run: `cd services/platform-api && python -c "from app.main import create_app; app = create_app(); print('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add services/platform-api/app/api/routes/admin_ai_providers.py services/platform-api/app/main.py
git commit -m "feat: add FastAPI admin route for platform AI provider CRUD and key validation"
```

---

### Task 4: Create admin model roles route

**Files:**
- Create: `services/platform-api/app/api/routes/admin_model_roles.py`
- Modify: `services/platform-api/app/main.py` (register router)

**Step 1: Create the route**

Create `services/platform-api/app/api/routes/admin_model_roles.py`:

```python
"""Admin model role management — CRUD for model_role_assignments.

Superuser-only. Model roles determine which AI model is used for each
operational function (chat, extraction, embedding, etc.).
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import require_superuser
from app.auth.principals import AuthPrincipal
from app.infra.supabase_client import get_supabase_admin

logger = logging.getLogger("admin-model-roles")
router = APIRouter(prefix="/admin/model-roles", tags=["admin-model-roles"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class CreateAssignmentRequest(BaseModel):
    role_key: str
    provider: str
    model_id: str
    priority: int = 0
    config_jsonb: dict | None = None


class PatchAssignmentRequest(BaseModel):
    is_active: bool | None = None
    priority: int | None = None


@router.get("", summary="List model role catalog and assignments",
            openapi_extra={"x-required-role": "platform_admin"})
async def list_model_roles(su: AuthPrincipal = Depends(require_superuser)):
    """Return all role definitions and their current assignments."""
    sb = get_supabase_admin()
    roles = sb.table("model_role_catalog").select("*").order("role_key").execute()
    assignments = sb.table("model_role_assignments").select("*").order("role_key").order("priority").execute()
    return {
        "roles": roles.data or [],
        "assignments": assignments.data or [],
    }


@router.post("", summary="Create a model role assignment",
             openapi_extra={"x-required-role": "platform_admin"})
async def create_assignment(body: CreateAssignmentRequest,
                            su: AuthPrincipal = Depends(require_superuser)):
    """Add a new model role assignment."""
    sb = get_supabase_admin()
    result = sb.table("model_role_assignments").insert({
        "role_key": body.role_key,
        "provider": body.provider,
        "model_id": body.model_id,
        "priority": body.priority,
        "config_jsonb": body.config_jsonb or {},
        "is_active": True,
        "updated_at": _now(),
    }).execute()

    if not result.data:
        raise HTTPException(400, "Failed to create assignment")

    return {"ok": True, "assignment": result.data[0]}


@router.patch("/{assignment_id}", summary="Update a model role assignment",
              openapi_extra={"x-required-role": "platform_admin"})
async def patch_assignment(assignment_id: str, body: PatchAssignmentRequest,
                           su: AuthPrincipal = Depends(require_superuser)):
    """Partially update a model role assignment (e.g. toggle active, change priority)."""
    updates: dict = {"updated_at": _now()}
    if body.is_active is not None:
        updates["is_active"] = body.is_active
    if body.priority is not None:
        updates["priority"] = body.priority

    sb = get_supabase_admin()
    result = sb.table("model_role_assignments").update(updates).eq("id", assignment_id).execute()

    if not result.data:
        raise HTTPException(404, "Assignment not found")

    return {"ok": True}


@router.delete("/{assignment_id}", summary="Delete a model role assignment",
               openapi_extra={"x-required-role": "platform_admin"})
async def delete_assignment(assignment_id: str,
                            su: AuthPrincipal = Depends(require_superuser)):
    """Remove a model role assignment."""
    sb = get_supabase_admin()
    sb.table("model_role_assignments").delete().eq("id", assignment_id).execute()
    return {"ok": True}
```

**Step 2: Register the router in main.py**

In `services/platform-api/app/main.py`, add alongside the other admin route includes:

```python
    from app.api.routes.admin_model_roles import router as admin_model_roles_router
    app.include_router(admin_model_roles_router)
```

**Step 3: Verify**

Run: `cd services/platform-api && python -c "from app.main import create_app; app = create_app(); print('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add services/platform-api/app/api/routes/admin_model_roles.py services/platform-api/app/main.py
git commit -m "feat: add FastAPI admin route for model role CRUD"
```

---

# Part C — Frontend

### Task 5: Create Superuser AI Providers overview page

**Files:**
- Create: `web/src/pages/superuser/SuperuserAiProviders.tsx`

**Step 1: Create the page**

Create `web/src/pages/superuser/SuperuserAiProviders.tsx`. This page:

- Uses `useShellHeaderTitle({ title: 'AI Providers', breadcrumbs: ['Superuser', 'AI Providers'] })`
- Fetches platform keys via `platformApiFetch('/admin/ai-providers')` (GET). Response: `{ keys: [{ provider, key_suffix, is_valid, default_model, base_url, updated_at }] }`
- Displays a card grid matching `SettingsAiOverview.tsx` layout: provider icon, label, status badge (Connected / Not configured / Invalid), key suffix, default model
- Each card links to `/app/superuser/ai-providers/:providerId`
- Copy the `PROVIDERS` array from `SettingsProviderForm.tsx` lines 59-163 into this file and export it as `PROVIDERS` (with `ProviderDef` and `ProviderModelOption` types)
- Exports `Component` function (lazy-import convention)

Reference `SettingsAiOverview.tsx` for layout. Data source change: `platformApiFetch('/admin/ai-providers')` instead of `supabase.from(TABLES.userApiKeys)`.

**Step 2: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add web/src/pages/superuser/SuperuserAiProviders.tsx
git commit -m "feat: add superuser AI providers overview page"
```

---

### Task 6: Create Superuser Provider detail form

**Files:**
- Create: `web/src/pages/superuser/SuperuserProviderForm.tsx`

**Step 1: Create the page**

Create `web/src/pages/superuser/SuperuserProviderForm.tsx`. This page:

- Uses `useShellHeaderTitle({ title: providerLabel, breadcrumbs: ['Superuser', 'AI Providers', providerLabel] })`
- Takes `providerId` from route params
- Loads current state via `platformApiFetch('/admin/ai-providers')`, filters to current provider
- Imports `PROVIDERS` from `./SuperuserAiProviders`
- Form sections:
  - **API Key**: password input + Test button + status indicator
    - Test calls `platformApiFetch('/admin/ai-providers/${provider}/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key, base_url }) })`
    - Response: `{ valid: boolean, error?: string }`
  - **Default Model**: dropdown from provider's models array
  - **Base URL**: text input (visible only when `provider.id === 'custom'`)
- Save calls `platformApiFetch('/admin/ai-providers/${provider}', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key, default_model, base_url }) })`
- Delete calls `platformApiFetch('/admin/ai-providers/${provider}', { method: 'DELETE' })`
- Back button navigates to `/app/superuser/ai-providers`
- Exports `Component` function

Reference `SettingsProviderForm.tsx` for form layout and test flow. Key differences:
1. All calls use `platformApiFetch` to FastAPI — no `edgeFetch` or `edgeJson`
2. No temperature/max_tokens controls (belong in model role config, not provider keys)
3. Breadcrumbs: `['Superuser', 'AI Providers', label]`
4. Back button: `/app/superuser/ai-providers`

**Step 2: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add web/src/pages/superuser/SuperuserProviderForm.tsx
git commit -m "feat: add superuser AI provider detail form"
```

---

### Task 7: Create Superuser Model Roles page

**Files:**
- Create: `web/src/pages/superuser/SuperuserModelRoles.tsx`

**Step 1: Create the page**

Create `web/src/pages/superuser/SuperuserModelRoles.tsx`. Same visual layout as `SettingsModelRoles.tsx` but all data operations go through FastAPI:

- Uses `useShellHeaderTitle({ title: 'Model Roles', breadcrumbs: ['Superuser', 'Model Roles'] })`
- Loads data via `platformApiFetch('/admin/model-roles')` (GET). Response: `{ roles: [...], assignments: [...] }`
- Toggle active: `platformApiFetch('/admin/model-roles/${id}', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active }) })`
- Delete: `platformApiFetch('/admin/model-roles/${id}', { method: 'DELETE' })`
- Import `SettingsPageFrame` and `SettingsSection` from `@/pages/settings/SettingsPageHeader`
- Exports `Component` function

Reference `SettingsModelRoles.tsx` for the complete visual layout. Key difference: all writes go through `platformApiFetch` to FastAPI instead of `supabase.from('model_role_assignments').update()/.delete()`.

**Step 2: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add web/src/pages/superuser/SuperuserModelRoles.tsx
git commit -m "feat: add superuser model roles page with FastAPI backend"
```

---

### Task 8: Update router, nav config, and chat panel

**Files:**
- Modify: `web/src/router.tsx` (lines 193-195 settings routes, lines 240-251 superuser routes)
- Modify: `web/src/components/shell/nav-config.ts` (lines 135-136 settings, lines 160-166 superuser)
- Modify: `web/src/components/shell/RightRailChatPanel.tsx` (line 88 settings button, line 175 model name)

**Step 1: Add superuser routes**

In `web/src/router.tsx`, inside the superuser children array (after line 250 `api-endpoints` route, before the closing `]`), add:

```typescript
              { path: 'ai-providers', lazy: () => import('@/pages/superuser/SuperuserAiProviders') },
              { path: 'ai-providers/:providerId', lazy: () => import('@/pages/superuser/SuperuserProviderForm') },
              { path: 'model-roles', lazy: () => import('@/pages/superuser/SuperuserModelRoles') },
```

**Step 2: Replace settings routes with redirects**

In `web/src/router.tsx`, replace lines 193-195:

```typescript
              { path: 'ai', element: <SettingsAiOverview /> },
              { path: 'ai/:providerId', element: <SettingsProviderForm /> },
              { path: 'model-roles', element: <SettingsModelRoles /> },
```

with:

```typescript
              { path: 'ai', element: <Navigate to="/app/superuser/ai-providers" replace /> },
              { path: 'ai/:providerId', element: <Navigate to="/app/superuser/ai-providers" replace /> },
              { path: 'model-roles', element: <Navigate to="/app/superuser/model-roles" replace /> },
```

Remove the now-unused imports for `SettingsAiOverview`, `SettingsProviderForm`, and `SettingsModelRoles`.

**Step 3: Update nav config**

In `web/src/components/shell/nav-config.ts`:

Remove from `SETTINGS_DRILL.sections[1].items` (lines 135-136):
```typescript
        { label: 'AI Providers', icon: IconKey, path: '/app/settings/ai' },
        { label: 'Model Roles', icon: IconWand, path: '/app/settings/model-roles' },
```

Add to `SUPERUSER_DRILL.sections[1].items` (after line 165 `API Endpoints`, before the closing `]`):
```typescript
        { label: 'AI Providers', icon: IconKey, path: '/app/superuser/ai-providers' },
        { label: 'Model Roles', icon: IconWand, path: '/app/superuser/model-roles' },
```

**Step 4: Remove settings gear and hardcoded model from chat panel**

In `web/src/components/shell/RightRailChatPanel.tsx`:

Remove the settings button (lines 88-90):
```tsx
          <button type="button" className={iconBtn} aria-label="AI Settings" title="AI Settings" onClick={() => navigate('/app/settings/ai')}>
            <AppIcon icon={IconSettings} size="md" />
          </button>
```

Remove the hardcoded model name (lines 174-176):
```tsx
          <span className="text-[11px] font-medium text-muted-foreground">
            Sonnet 4.5
          </span>
```

Clean up unused imports (`IconSettings`, and `navigate`/`useNavigate` if no other usage remains).

**Step 5: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add web/src/router.tsx web/src/components/shell/nav-config.ts web/src/components/shell/RightRailChatPanel.tsx
git commit -m "feat: move AI providers and model roles to superuser area, clean up chat panel"
```

---

# Verification

1. `cd supabase && npx supabase db reset` — PASS (platform_api_keys migration)
2. `cd services/platform-api && python -c "from app.main import create_app; app = create_app(); print('OK')"` — PASS
3. `cd web && npx tsc --noEmit` — PASS
4. Manual smoke test — superuser flow:
   - Navigate to `/app/superuser/ai-providers` — see all 7 providers with "Not configured"
   - Click Anthropic → enter API key → Test (calls FastAPI `/admin/ai-providers/test`) → Save (calls FastAPI `/admin/ai-providers`)
   - Back to overview → Anthropic shows "Connected" with key suffix and default model
   - Navigate to `/app/superuser/model-roles` — see role assignments, toggle/remove via FastAPI
5. Manual smoke test — bidirectional sync:
   - Save a key via UI → verify row in `platform_api_keys` table
   - Delete a key via UI → verify row removed
   - Refresh page → UI reflects current table state
6. Manual smoke test — settings area:
   - Navigate to `/app/settings` — AI Providers and Model Roles gone from nav
   - Direct URL `/app/settings/ai` redirects to `/app/superuser/ai-providers`
7. Chat panel: no settings gear, no "Sonnet 4.5" label

---

# Phase 2 — Chat Streaming Migration (separate plan)

When this plan is complete, the next step is migrating `assistant-chat` to FastAPI:

1. Add `sse-starlette` to `requirements.txt`
2. Port `callAnthropicStream`, `callOpenAIStream`, `callGeminiStream`, `callVertexClaudeStream` to Python using `httpx` streaming
3. Port `normalizeStreamForClient` SSE normalization to Python
4. Create FastAPI `/chat` route with SSE streaming, platform key resolution (platform key → Vertex fallback → error)
5. Update `platformApiFetch` or create `platformApiStream` for client-side SSE consumption
6. Update `useAssistantChat.ts` to call FastAPI instead of `edgeFetch('assistant-chat')`
7. Deprecate `assistant-chat` edge function

---

# Design Decisions

| Decision | Rationale |
|----------|-----------|
| All backend in FastAPI | Follows execution plane direction. No new edge function work. |
| Key validation in FastAPI | Same `httpx` probes as the edge function, but lives where all future AI execution will live. |
| Model role CRUD via FastAPI | Browser shouldn't write directly to tables. Consistent with platform_api_keys pattern. |
| `encrypt_for_deno` in Python | Key derivation differs between runtimes. Platform keys encrypted Deno-compatible for Phase 2. |
| `SUPABASE_SERVICE_ROLE_KEY` as encryption secret | Matches connections route and connection resolver. No policy table indirection — one established pattern for all encryption. |
| Test route is side-effect-free | Prevents ad-hoc tested keys from marking a different saved key as valid. Save route owns `is_valid` state. |
| No edge function changes | Clean separation. This plan builds the new surface. Phase 2 migrates the old. |
| Chat streaming deferred | Requires SSE infrastructure, 4 provider ports, client streaming support. Separate scope. |
| Settings routes redirect | Old bookmarks work. SuperuserGuard denies non-admin users. |
