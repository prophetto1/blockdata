# Platform AI Provider Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move AI provider API key management and model role configuration from user settings to the superuser area, add platform-level API key storage backed by FastAPI, and fix the assistant chat to use platform keys — so chat works for all users without individual key configuration.

**Architecture:** Currently, API keys are per-user (`user_api_keys` table) and the chat fails for OpenAI/Google when no user key exists. This plan adds a `platform_api_keys` table, a FastAPI admin route for CRUD (`/admin/ai-providers`), a small update to the existing `assistant-chat` edge function to fall back to platform keys, superuser UI pages for provider and model role management, and removes these pages from user settings. The chat panel stays front-facing for all users. FastAPI is chosen over edge functions because the chat backend will evolve into an agent execution environment (MCP tool calls, vector search, KG context) that edge functions cannot support — building key management on FastAPI now avoids a rewrite later.

**Tech Stack:** Supabase Postgres migrations, Python FastAPI (`services/platform-api/`) for admin key management, existing Deno `assistant-chat` edge function for current chat streaming (minimal change: read platform keys from shared table), React/TypeScript frontend (Vite), AES-GCM encryption (Python `app/infra/crypto.py` from load-activation plan, cross-compatible with Deno `api_key_crypto.ts`).

**Parallel plan dependency:** `docs/plans/2026-03-15-load-activation.md` creates shared infrastructure this plan reuses:
- `services/platform-api/app/infra/crypto.py` — `encrypt_with_context()` / `decrypt_with_context()` (Task 5/8)
- `cryptography>=42.0.0` in `requirements.txt` (Task 8)
- `require_role("platform_admin")` auth pattern (from `app/auth/dependencies.py`)
- Router registration pattern in `app/main.py`

If load-activation has not yet been implemented when this plan executes, Task 2 below includes the crypto module creation as a fallback. If it already exists, skip that step.

**Existing patterns reused:**
- Encryption cross-compat: Python `crypto.py` and Deno `api_key_crypto.ts` use the same AES-GCM algorithm, same key derivation (SHA-256 of `secret\ncontext\n` in Deno / `secret + context` in Python). FastAPI encrypts, edge function decrypts — proven compatible by load-activation plan design.
- Admin route pattern: `services/platform-api/app/api/routes/admin_services.py` — uses `require_superuser` (alias for `require_role("platform_admin")`), `get_supabase_admin()`, `openapi_extra={"x-required-role": "platform_admin"}`.
- Frontend edge calls: `web/src/lib/edge.ts` — `edgeFetch()` / `edgeJson()` for edge functions. `web/src/lib/platformApi.ts` — `platformApiFetch()` for FastAPI calls.
- Superuser UI: Pages under `/app/superuser/` use lazy imports in `router.tsx` (line 234+), gated by `SuperuserGuard`. Nav items in `SUPERUSER_DRILL` config in `nav-config.ts` (line 143).

**Key files referenced:**
- `supabase/functions/assistant-chat/index.ts` — chat edge function (409 lines). `getUserApiKey()` at line 74, provider dispatch at lines 315-333, Vertex AI fallback at line 321.
- `supabase/functions/_shared/api_key_crypto.ts` — `encryptWithContext()` / `decryptWithContext()` with context-scoped key derivation (70 lines). User keys use context `"user-api-keys-v1"`.
- `supabase/functions/_shared/superuser.ts` — `requireSuperuser(req)` checks `registry_superuser_profiles` (69 lines).
- `supabase/functions/test-api-key/index.ts` — per-provider key validation (168 lines). Supports: anthropic, openai, google, voyage, cohere, jina, custom.
- `services/platform-api/app/api/routes/admin_services.py` — admin CRUD pattern with `require_superuser` auth (536 lines).
- `services/platform-api/app/auth/dependencies.py` — `require_auth`, `require_role()`, `require_superuser` alias (189 lines).
- `services/platform-api/app/infra/supabase_client.py` — `get_supabase_admin()` cached singleton (19 lines).
- `web/src/pages/settings/SettingsAiOverview.tsx` — provider dashboard (120 lines).
- `web/src/pages/settings/SettingsProviderForm.tsx` — provider detail form with PROVIDERS array at lines 59-163 (749 lines).
- `web/src/pages/settings/SettingsModelRoles.tsx` — model role assignments UI (186 lines).
- `web/src/hooks/useAssistantChat.ts` — chat state + SSE streaming via `edgeFetch('assistant-chat')` (203 lines).
- `web/src/components/shell/RightRailChatPanel.tsx` — chat panel UI, settings link at line 88, hardcoded "Sonnet 4.5" at line 175 (182 lines).
- `web/src/components/shell/nav-config.ts` — `SETTINGS_DRILL` (line 118), `SUPERUSER_DRILL` (line 143) (177 lines).
- `web/src/router.tsx` — settings routes at lines 188-190, superuser routes at lines 234-245 (259 lines).
- `web/src/lib/edge.ts` — `edgeFetch()` / `edgeJson()` (185 lines).

---

## Scope Guardrails

- Platform API keys are admin-managed via FastAPI. Regular users never see or configure API keys.
- `user_api_keys` table stays (backward compat). Its UI is removed from settings. The `assistant-chat` resolution chain still checks user keys first, then platform keys — respecting any existing per-user overrides.
- `test-api-key` edge function is unchanged — the superuser form calls it directly for key validation (superusers are authenticated users, same auth flow).
- Model role assignments (`model_role_catalog` + `model_role_assignments`) stay as-is in the database. Only the UI moves from settings to superuser.
- Chat panel stays in the right rail, works for all users. Current chat stays on the edge function — it just gains a platform key fallback. Full chat migration to FastAPI is a future plan when MCP/vector/KG scope solidifies.
- The existing Vertex AI Claude fallback (line 321 of assistant-chat) remains as the last-resort for Anthropic.
- No new edge functions are created. The only edge function change is a small addition to `assistant-chat` to query `platform_api_keys`.

---

# Part A — Database

### Task 1: Create platform_api_keys table

**Files:**
- Create: `supabase/migrations/20260316100000_096_platform_api_keys.sql`

**Step 1: Write the migration**

```sql
-- Platform-level API keys for AI providers.
-- Admin-managed via FastAPI admin route. One row per provider.
-- Regular users never access this table — RLS blocks all non-service-role access.

CREATE TABLE IF NOT EXISTS public.platform_api_keys (
  provider            text PRIMARY KEY,
  api_key_encrypted   text NOT NULL,
  key_suffix          text,            -- last 4 chars for admin display
  is_valid            boolean,         -- null=untested, true=valid, false=invalid
  default_model       text,
  base_url            text,            -- custom/self-hosted providers only
  configured_by       uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_api_keys IS
  'Platform-level API keys for AI providers. One row per provider. Admin-managed via FastAPI.';

-- Lock down: service_role only. No user access.
ALTER TABLE public.platform_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_api_keys_service_role
  ON public.platform_api_keys FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.platform_api_keys FROM anon, authenticated;
GRANT ALL ON TABLE public.platform_api_keys TO service_role;
```

**Step 2: Verify**

Run: `npx supabase db reset`
Expected: PASS

**Step 3: Commit**

```bash
git add supabase/migrations/20260316100000_096_platform_api_keys.sql
git commit -m "feat: add platform_api_keys table for admin-managed AI provider keys"
```

---

# Part B — FastAPI Backend

### Task 2: Admin AI provider route in FastAPI

**Files:**
- Create: `services/platform-api/app/api/routes/admin_ai_providers.py`
- Modify: `services/platform-api/app/main.py` (register router)

**Prerequisite check:** Verify `services/platform-api/app/infra/crypto.py` exists (created by load-activation Task 5). If it does not exist yet, create it with `encrypt_with_context` and `decrypt_with_context` following the load-activation plan's spec. The functions must be cross-compatible with the Deno `api_key_crypto.ts` — same AES-GCM-256, SHA-256 key derivation.

**Step 1: Implement the admin AI provider route**

Create `services/platform-api/app/api/routes/admin_ai_providers.py`:

```python
"""Admin AI provider key management — CRUD for platform_api_keys.

Superuser-only. These keys are used by all AI features (chat, extraction,
embedding, etc.) as the platform default. Individual users do not configure keys.
"""
import json as json_mod
import logging
import os
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.dependencies import require_superuser, SuperuserContext
from app.infra.crypto import encrypt_with_context, decrypt_with_context
from app.infra.supabase_client import get_supabase_admin

logger = logging.getLogger("admin-ai-providers")
router = APIRouter(prefix="/admin/ai-providers", tags=["admin-ai-providers"])

CRYPTO_CONTEXT = "platform-api-keys-v1"

VALID_PROVIDERS = {
    "anthropic", "openai", "google", "voyage", "cohere", "jina", "custom",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SaveKeyRequest(BaseModel):
    provider: str
    api_key: str
    default_model: str | None = None
    base_url: str | None = None


class DeleteKeyRequest(BaseModel):
    provider: str


@router.get("", summary="List platform AI provider keys", openapi_extra={"x-required-role": "platform_admin"})
async def list_platform_keys(su: SuperuserContext = Depends(require_superuser)):
    """Return all platform keys with safe fields only (never the encrypted key)."""
    sb = get_supabase_admin()
    result = sb.table("platform_api_keys").select(
        "provider, key_suffix, is_valid, default_model, base_url, configured_by, updated_at"
    ).order("provider").execute()
    return {"keys": result.data or []}


@router.post("", summary="Save platform AI provider key", openapi_extra={"x-required-role": "platform_admin"})
async def save_platform_key(body: SaveKeyRequest, su: SuperuserContext = Depends(require_superuser)):
    """Encrypt and upsert a platform API key for a provider."""
    if body.provider not in VALID_PROVIDERS:
        raise HTTPException(400, f"Invalid provider. Must be one of: {', '.join(sorted(VALID_PROVIDERS))}")

    api_key = body.api_key.strip()
    if not api_key:
        raise HTTPException(400, "Missing api_key")

    if body.provider == "custom" and not body.base_url:
        raise HTTPException(400, "Custom provider requires base_url")

    if body.base_url:
        base_url = body.base_url.strip()
        if not base_url.startswith(("http://", "https://")):
            raise HTTPException(400, "base_url must use http or https")
    else:
        base_url = None

    secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not secret:
        raise HTTPException(500, "Encryption secret not configured")

    key_suffix = api_key[-4:]
    encrypted = encrypt_with_context(api_key, secret, CRYPTO_CONTEXT)

    sb = get_supabase_admin()
    sb.table("platform_api_keys").upsert({
        "provider": body.provider,
        "api_key_encrypted": encrypted,
        "key_suffix": key_suffix,
        "is_valid": None,
        "default_model": body.default_model,
        "base_url": base_url,
        "configured_by": su.user_id,
        "updated_at": _now(),
    }, on_conflict="provider").execute()

    return {"ok": True, "provider": body.provider, "key_suffix": key_suffix}


@router.delete("", summary="Delete platform AI provider key", openapi_extra={"x-required-role": "platform_admin"})
async def delete_platform_key(body: DeleteKeyRequest, su: SuperuserContext = Depends(require_superuser)):
    """Remove a platform API key."""
    if body.provider not in VALID_PROVIDERS:
        raise HTTPException(400, f"Invalid provider")

    sb = get_supabase_admin()
    sb.table("platform_api_keys").delete().eq("provider", body.provider).execute()
    return {"ok": True, "deleted": body.provider}
```

**Step 2: Register the router**

In `services/platform-api/app/main.py`, add alongside the other admin routes (after the admin_router include):

```python
    # Admin AI provider keys (platform_admin role required)
    from app.api.routes.admin_ai_providers import router as admin_ai_router
    app.include_router(admin_ai_router)
```

**Step 3: Verify**

Run: `cd services/platform-api && python -c "from app.main import create_app; app = create_app(); print('OK')"`
Expected: `OK` (no import errors)

**Step 4: Commit**

```bash
git add services/platform-api/app/api/routes/admin_ai_providers.py services/platform-api/app/main.py
git commit -m "feat: add FastAPI admin route for platform AI provider key management"
```

---

### Task 3: Update assistant-chat edge function to read platform keys

**Files:**
- Modify: `supabase/functions/assistant-chat/index.ts`
- Modify: `supabase/functions/_shared/api_key_crypto.ts`

**Step 1: Add platform key decryption helper**

In `supabase/functions/_shared/api_key_crypto.ts`, after line 69, add:

```typescript
const PLATFORM_API_KEYS_CONTEXT = "platform-api-keys-v1";

export async function decryptPlatformApiKey(encrypted: string, secret: string): Promise<string> {
  return decryptWithContext(encrypted, secret, PLATFORM_API_KEYS_CONTEXT);
}
```

**Step 2: Add the platform key resolver to assistant-chat**

In `supabase/functions/assistant-chat/index.ts`, add the import at line 12:

Change:
```typescript
import { decryptApiKey } from "../_shared/api_key_crypto.ts";
```
to:
```typescript
import { decryptApiKey, decryptPlatformApiKey } from "../_shared/api_key_crypto.ts";
```

After the `getUserApiKey` function (after line 94), add:

```typescript
/** Get platform-level API key for a provider (admin-configured via FastAPI). */
async function getPlatformApiKey(
  supabase: ReturnType<typeof createAdminClient>,
  provider: string,
): Promise<{ key: string; baseUrl?: string } | null> {
  const { data: row } = await supabase
    .from("platform_api_keys")
    .select("api_key_encrypted, is_valid, base_url")
    .eq("provider", provider)
    .maybeSingle();

  if (!row?.api_key_encrypted) return null;
  if (row.is_valid === false) return null;

  const secret = getEnv("API_KEY_ENCRYPTION_SECRET", "");
  if (!secret) return null;

  const key = await decryptPlatformApiKey(row.api_key_encrypted, secret);
  return { key, baseUrl: row.base_url ?? undefined };
}
```

**Step 3: Update the provider dispatch**

Replace the provider dispatch block (lines 315-333) with:

```typescript
    if (provider === "anthropic") {
      const userKey = await getUserApiKey(supabase, userId, "anthropic");
      const platformKey = !userKey ? await getPlatformApiKey(supabase, "anthropic") : null;
      const apiKey = userKey ?? platformKey?.key;
      if (apiKey) {
        rawStream = await callAnthropicStream(apiKey, model, messages, maxTokens);
      } else {
        // Last resort: Vertex AI Claude (platform GCP service account)
        rawStream = await callVertexClaudeStream({ model, max_tokens: maxTokens, messages });
      }
    } else if (provider === "openai" || provider === "custom") {
      const userKey = await getUserApiKey(supabase, userId, provider);
      const platformKey = !userKey ? await getPlatformApiKey(supabase, provider) : null;
      const apiKey = userKey ?? platformKey?.key;
      if (!apiKey) return json(400, { error: `No ${provider} API key configured. Contact your administrator.` });
      const baseUrl = platformKey?.baseUrl;
      rawStream = await callOpenAIStream(apiKey, model, messages, maxTokens, baseUrl);
    } else if (provider === "google") {
      const userKey = await getUserApiKey(supabase, userId, "google");
      const platformKey = !userKey ? await getPlatformApiKey(supabase, "google") : null;
      const apiKey = userKey ?? platformKey?.key;
      if (!apiKey) return json(400, { error: "No Google AI API key configured. Contact your administrator." });
      rawStream = await callGeminiStream(apiKey, model, messages);
    } else {
      return json(400, { error: `Unsupported provider for chat: ${provider}` });
    }
```

**Step 4: Verify**

Run: `cd supabase && deno check functions/assistant-chat/index.ts`
Expected: No errors.

**Step 5: Commit**

```bash
git add supabase/functions/_shared/api_key_crypto.ts supabase/functions/assistant-chat/index.ts
git commit -m "feat: assistant-chat falls back to platform API keys before erroring"
```

---

# Part C — Frontend

### Task 4: Create Superuser AI Providers pages

**Files:**
- Create: `web/src/pages/superuser/SuperuserAiProviders.tsx`
- Create: `web/src/pages/superuser/SuperuserProviderForm.tsx`

The existing `SettingsAiOverview.tsx` (120 lines) and `SettingsProviderForm.tsx` (749 lines) are the reference. The superuser versions call the FastAPI admin route via `platformApiFetch` instead of the `user-api-keys` edge function.

**Step 1: Create the provider overview page**

Create `web/src/pages/superuser/SuperuserAiProviders.tsx`. This page:

- Fetches platform keys via `platformApiFetch('/admin/ai-providers')` (GET)
- Displays a card grid: provider label, status badge (Connected / Not configured), key suffix, default model
- Each card links to `/app/superuser/ai-providers/:providerId`
- Uses `useShellHeaderTitle` with breadcrumbs `['Superuser', 'AI Providers']`
- Exports `Component` function (lazy-import convention)

The PROVIDERS array from `SettingsProviderForm.tsx` (lines 59-163) defines provider metadata (id, label, icon, models). Copy this array into the new file — it's the only consumer after the settings pages are removed from routing.

Reference `SettingsAiOverview.tsx` for the card layout. The data source changes from supabase client querying `user_api_keys` to `platformApiFetch` calling the FastAPI admin route.

**Step 2: Create the provider detail form**

Create `web/src/pages/superuser/SuperuserProviderForm.tsx`. This page:

- Takes `providerId` from route params
- Loads current state via `platformApiFetch('/admin/ai-providers')`, filters to current provider
- Form sections:
  - **API Key**: password input, Test button (calls `edgeFetch('test-api-key', { method: 'POST', body: { api_key, provider } })` — reuses existing edge function), status display
  - **Default Model**: dropdown from PROVIDERS[provider].models
  - **Base URL**: text input (custom provider only)
- Save calls `platformApiFetch('/admin/ai-providers', { method: 'POST', body: { provider, api_key, default_model, base_url } })`
- Delete calls `platformApiFetch('/admin/ai-providers', { method: 'DELETE', body: { provider } })`
- Uses `useShellHeaderTitle` with breadcrumbs `['Superuser', 'AI Providers', providerLabel]`
- Exports `Component` function

Reference `SettingsProviderForm.tsx` for form layout and test-key flow. Key differences:
1. Data source: `platformApiFetch` to FastAPI, not `edgeFetch` to `user-api-keys`
2. No temperature/max_tokens controls — those are model-behavior settings managed via model role assignments
3. Table: `platform_api_keys` (via FastAPI), not `user_api_keys`

**Step 3: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add web/src/pages/superuser/SuperuserAiProviders.tsx web/src/pages/superuser/SuperuserProviderForm.tsx
git commit -m "feat: add superuser AI provider management pages"
```

---

### Task 5: Move Model Roles to superuser area

**Files:**
- Create: `web/src/pages/superuser/SuperuserModelRoles.tsx`

**Step 1: Create the superuser model roles page**

Create `web/src/pages/superuser/SuperuserModelRoles.tsx`. Same functionality as `SettingsModelRoles.tsx` (186 lines) with two changes:

1. `useShellHeaderTitle` breadcrumbs: `['Superuser', 'Model Roles']` instead of `['Settings', 'Model Roles']`
2. Export as `Component` (lazy-import convention)

The page reads directly from `model_role_catalog` and `model_role_assignments` via the supabase client. The data access pattern doesn't change — these tables allow authenticated SELECT.

Reference `SettingsModelRoles.tsx` for the complete implementation.

**Step 2: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add web/src/pages/superuser/SuperuserModelRoles.tsx
git commit -m "feat: add superuser model roles management page"
```

---

### Task 6: Update router, nav, and chat panel

**Files:**
- Modify: `web/src/router.tsx`
- Modify: `web/src/components/shell/nav-config.ts`
- Modify: `web/src/components/shell/RightRailChatPanel.tsx`

**Step 1: Add superuser routes**

In `web/src/router.tsx`, inside the superuser children array (after line 244, before the closing `]`), add:

```typescript
              { path: 'ai-providers', lazy: () => import('@/pages/superuser/SuperuserAiProviders') },
              { path: 'ai-providers/:providerId', lazy: () => import('@/pages/superuser/SuperuserProviderForm') },
              { path: 'model-roles', lazy: () => import('@/pages/superuser/SuperuserModelRoles') },
```

**Step 2: Remove settings routes, add redirects**

In `web/src/router.tsx`, replace lines 188-190:

```typescript
              { path: 'ai', element: <SettingsAiOverview /> },
              { path: 'ai/:providerId', element: <SettingsProviderForm /> },
              { path: 'model-roles', element: <SettingsModelRoles /> },
```

with redirects:

```typescript
              { path: 'ai', element: <Navigate to="/app/superuser/ai-providers" replace /> },
              { path: 'ai/:providerId', element: <Navigate to="/app/superuser/ai-providers" replace /> },
              { path: 'model-roles', element: <Navigate to="/app/superuser/model-roles" replace /> },
```

Remove the now-unused imports for `SettingsAiOverview`, `SettingsProviderForm`, and `SettingsModelRoles` at the top of `router.tsx`.

**Step 3: Update nav config**

In `web/src/components/shell/nav-config.ts`:

Remove from `SETTINGS_DRILL.sections[1].items` (Operations section, lines 134-135):
```typescript
        { label: 'AI Providers', icon: IconKey, path: '/app/settings/ai' },
        { label: 'Model Roles', icon: IconWand, path: '/app/settings/model-roles' },
```

Add to `SUPERUSER_DRILL.sections[1].items` (admin section, after line 163):
```typescript
        { label: 'AI Providers', icon: IconKey, path: '/app/superuser/ai-providers' },
        { label: 'Model Roles', icon: IconWand, path: '/app/superuser/model-roles' },
```

Verify `IconKey` and `IconWand` are in the imports. `IconKey` is already imported (line 10). Add `IconWand` if missing.

**Step 4: Remove settings gear and hardcoded model from chat panel**

In `web/src/components/shell/RightRailChatPanel.tsx`:

Remove the settings button (lines 88-90):
```typescript
          <button type="button" className={iconBtn} aria-label="AI Settings" title="AI Settings" onClick={() => navigate('/app/settings/ai')}>
            <AppIcon icon={IconSettings} size="md" />
          </button>
```

Remove the hardcoded model name (lines 174-176):
```typescript
          <span className="text-[11px] font-medium text-muted-foreground">
            Sonnet 4.5
          </span>
```

Clean up unused imports (`IconSettings`, `useNavigate`, `navigate` if no other usage remains).

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

1. `npx supabase db reset` — PASS (verifies platform_api_keys migration)
2. `cd services/platform-api && python -c "from app.main import create_app; app = create_app(); print('OK')"` — PASS (FastAPI imports clean)
3. `cd supabase && deno check functions/assistant-chat/index.ts` — PASS (edge function compiles)
4. `cd web && npx tsc --noEmit` — PASS (frontend compiles)
5. Manual smoke test — superuser flow:
   - Navigate to `/app/superuser/ai-providers` — see all providers with "Not configured" status
   - Click Anthropic → enter API key → Test (calls `test-api-key` edge function) → Save (calls FastAPI admin route)
   - Back to overview → Anthropic shows "Connected" with key suffix
   - Navigate to `/app/superuser/model-roles` — see existing role assignments
6. Manual smoke test — chat:
   - As a regular user (not superuser), open the right-rail chat panel
   - Type a message and send
   - Expect: streaming response (no "No API key configured" error)
   - Chat uses platform Anthropic key configured in step 5
7. Manual smoke test — settings area:
   - Navigate to `/app/settings` — AI Providers and Model Roles are gone from nav
   - Direct URL `/app/settings/ai` redirects to `/app/superuser/ai-providers`
8. Verify `/admin/ai-providers` visible at `/app/superuser/api-endpoints` with `platform_admin` auth badge

---

# Design Decisions

| Decision | Rationale |
|----------|-----------|
| FastAPI for key management, not edge functions | Chat will evolve into an agent execution environment (MCP tool calls, vector/KG context, long-running Python scripts). Edge functions have ~150s timeout, no persistent state, can't run Python. Building key management on FastAPI means no rewrite when chat migrates. |
| Separate `platform_api_keys` table, not a flag on `user_api_keys` | Clean separation. Different RLS (service_role only vs. user-scoped). Different encryption context. No risk of leaking platform keys through user-facing queries. |
| Edge function chat stays for now | It works as a streaming proxy. The only change is one additional DB query for platform keys. Full migration to FastAPI is a separate plan when MCP/vector/KG scope is clear. |
| Resolution chain: user key → platform key → Vertex fallback → error | Preserves backward compat for users who already saved personal keys. Platform keys serve as default. Vertex AI Claude remains last-resort for Anthropic. |
| `"platform-api-keys-v1"` encryption context | Same AES-GCM algorithm, same secret, different context. Ciphertext from one table can't be decrypted with the other's context. Python encrypts, Deno decrypts — cross-runtime compat proven by load-activation plan design. |
| `test-api-key` edge function reused | Same validation logic regardless of who's testing. Superusers are authenticated users — same auth flow. No duplication needed. |
| Settings routes redirect (not 404) | Old bookmarks still work. SuperuserGuard denies non-admin users who follow the redirect. |
| Model name removed from chat panel | Infrastructure detail managed by admins. Users just chat. Model selection UI is a separate feature if needed later. |
| No temperature/max_tokens on platform keys | Model-behavior settings belong in `model_role_assignments.config_jsonb`, not provider-auth table. `assistant-chat` hardcodes `maxTokens = 4096`; making it configurable via role config is a follow-up. |
| Depends on load-activation's `crypto.py` | Avoids duplicating AES-GCM implementation. If load-activation hasn't run yet, Task 2 includes a fallback to create it. Both plans use the same module. |