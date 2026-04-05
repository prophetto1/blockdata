# Admin Surface Final Evaluation Bundle

- Date: 2026-04-04
- Purpose: single-file bundle for final outside evaluation of the admin-surface remediation chain
- Scope: edited files plus the adjacent backend/frontend context files required to evaluate access resolution, route ancestry, and admin-config contract alignment

## Evaluator Note

This bundle is organized to reduce reconstruction work for the evaluator. The core review questions for this slice are:

1. Are admin surface guards mounted outside the admin shell?
2. Is admin-surface access resolved once per logged-in user session and reused across selector + guards?
3. Does same-session token refresh avoid visibly re-verifying the UI while still allowing a background refresh?
4. Do transient access-probe failures preserve last-known access instead of acting like definitive authorization loss?
5. Is the Blockdata Admin config contract named consistently after the auth-surface split?

The most important files for those questions are:
- `web/src/hooks/useAdminSurfaceAccess.ts`
- `web/src/pages/superuser/SuperuserGuard.tsx`
- `web/src/components/shell/ShellWorkspaceSelector.tsx`
- `web/src/router.tsx`
- `services/platform-api/app/api/routes/auth_access.py`
- `supabase/functions/admin-config/index.ts`

## Verification Commands

```powershell
cd web
npm run test -- src/router.admin-surfaces.test.ts src/components/layout/__tests__/AdminShellLayout.test.tsx src/hooks/useAdminSurfaceAccess.test.tsx src/components/shell/ShellWorkspaceSelector.test.tsx src/pages/superuser/SuperuserGuard.test.tsx
npx eslint src/hooks/useAdminSurfaceAccess.ts src/hooks/useAdminSurfaceAccess.test.tsx src/hooks/useSuperuserProbe.ts src/components/shell/ShellWorkspaceSelector.tsx src/components/shell/ShellWorkspaceSelector.test.tsx src/pages/superuser/SuperuserGuard.tsx src/pages/superuser/SuperuserGuard.test.tsx src/pages/settings/SettingsAdmin.tsx src/pages/superuser/SuperuserAuditHistory.tsx
cd ..\supabase
deno test functions/admin-config/index.test.ts
deno fmt --check functions/admin-config/index.ts
```

## File Map

- `supabase/functions/admin-config/index.ts`: Edge function for Blockdata Admin config/audit. Relevant because auth error mapping and actor payload naming were corrected here.
- `supabase/functions/admin-config/index.test.ts`: Focused regression tests for admin-config auth error mapping.
- `services/platform-api/app/api/routes/auth_access.py`: Platform API endpoint consumed by the frontend access store. Returns blockdata_admin/agchain_admin/superuser booleans.
- `services/platform-api/app/auth/dependencies.py`: Backend role-resolution layer. Included as context because admin surface access ultimately depends on these role checks.
- `web/src/lib/platformApi.ts`: Authenticated frontend fetch wrapper used by the access store.
- `web/src/auth/AuthContext.tsx`: Frontend session/bootstrap source. Included because access resolution is keyed off the authenticated user/session lifecycle.
- `web/src/hooks/useAdminSurfaceAccess.ts`: Shared session-scoped admin access store. This is the core remediation file for repeated verification behavior.
- `web/src/hooks/useAdminSurfaceAccess.test.tsx`: Main behavior contract tests: shared probe reuse, remount reuse, token refresh behavior, refresh failure preservation, selector+guard integration.
- `web/src/hooks/useSuperuserProbe.ts`: Legacy compatibility hook now backed by the shared access store.
- `web/src/components/shell/ShellWorkspaceSelector.tsx`: Workspace selector consumer of shared admin access. Must not trigger independent access resolution loops.
- `web/src/components/shell/ShellWorkspaceSelector.test.tsx`: Selector coverage for persona visibility and fallback behavior.
- `web/src/pages/superuser/SuperuserGuard.tsx`: Guard layer for Blockdata Admin, AGChain Admin, and Superuser routes. Must preserve last-known access on transient failures.
- `web/src/pages/superuser/SuperuserGuard.test.tsx`: Guard coverage for loading, allowed/forbidden personas, and transient error behavior.
- `web/src/router.tsx`: Route ancestry source of truth. Guards are mounted outside AdminShellLayout here.
- `web/src/router.admin-surfaces.test.ts`: Route-level regression test proving the admin shell is not mounted before the surface guards.
- `web/src/components/layout/AdminShellLayout.tsx`: Admin shell chrome. Included so the evaluator can verify shell placement relative to the guards.
- `web/src/components/layout/__tests__/AdminShellLayout.test.tsx`: Smoke coverage for the admin shell frame and secondary rail behavior.
- `web/src/components/admin/AdminLeftNav.tsx`: Admin surface navigation definitions and secondary rail logic. Included because route/surface identity flows through pathname here.
- `web/src/pages/settings/SettingsAdmin.tsx`: Legacy admin settings consumer of admin-config payload. Included because the actor field rename had to stay type-consistent here.
- `web/src/pages/superuser/SuperuserAuditHistory.tsx`: Blockdata Admin audit-history consumer of admin-config payload. Included for the same contract-alignment reason.

## `supabase/functions/admin-config/index.ts`

Note: Edge function for Blockdata Admin config/audit. Relevant because auth error mapping and actor payload naming were corrected here.

```ts
import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import {
  applyPolicyValue,
  buildRuntimePolicySnapshot,
  listAdminPolicyRows,
  loadRuntimePolicy,
  validateRuntimePolicy,
} from "../_shared/admin_policy.ts";
import { requireBlockdataAdmin } from "../_shared/superuser.ts";

type PolicyUpdate = {
  policy_key: string;
  value: unknown;
  reason?: string | null;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function mapAdminConfigErrorToResponse(error: unknown): Response {
  const msg = getErrorMessage(error);
  if (
    msg.includes("Missing Authorization header") ||
    msg.startsWith("Invalid auth")
  ) {
    return json(401, { error: msg });
  }
  if (
    msg.includes("Forbidden: blockdata admin access required") ||
    msg.includes("Forbidden: superuser access required")
  ) {
    return json(403, { error: msg });
  }
  if (
    msg.includes("Blockdata Admin access is not configured") ||
    msg.includes("Superuser access is not configured")
  ) {
    return json(503, { error: msg });
  }
  return json(500, { error: msg });
}

function parseAuditLimit(req: Request): number {
  const url = new URL(req.url);
  const raw = Number(url.searchParams.get("audit_limit") ?? "100");
  if (!Number.isFinite(raw)) return 100;
  return Math.min(Math.max(Math.floor(raw), 1), 500);
}

function parseUpdates(body: unknown): PolicyUpdate[] | null {
  if (
    body && typeof body === "object" &&
    Array.isArray((body as Record<string, unknown>).updates)
  ) {
    const updates = (body as { updates: unknown[] }).updates;
    const parsed: PolicyUpdate[] = [];
    for (const item of updates) {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const policyKey = typeof obj.policy_key === "string"
        ? obj.policy_key.trim()
        : "";
      if (!policyKey) return null;
      parsed.push({
        policy_key: policyKey,
        value: obj.value,
        reason: typeof obj.reason === "string" ? obj.reason.trim() : null,
      });
    }
    return parsed;
  }

  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    const policyKey = typeof obj.policy_key === "string"
      ? obj.policy_key.trim()
      : "";
    if (!policyKey) return null;
    return [{
      policy_key: policyKey,
      value: obj.value,
      reason: typeof obj.reason === "string" ? obj.reason.trim() : null,
    }];
  }

  return null;
}

function valueTypeMatches(value: unknown, valueType: string): boolean {
  if (valueType === "boolean") return typeof value === "boolean";
  if (valueType === "integer") {
    return typeof value === "number" && Number.isInteger(value) &&
      Number.isFinite(value);
  }
  if (valueType === "number") {
    return typeof value === "number" && Number.isFinite(value);
  }
  if (valueType === "string") return typeof value === "string";
  if (valueType === "object") {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }
  if (valueType === "array") return Array.isArray(value);
  return false;
}

export async function adminConfigHandler(req: Request): Promise<Response> {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    const admin = await requireBlockdataAdmin(req);
    const supabaseAdmin = createAdminClient();

    if (req.method === "GET") {
      const auditLimit = parseAuditLimit(req);
      const policyRows = await listAdminPolicyRows(supabaseAdmin);
      const { data: auditRows, error: auditErr } = await supabaseAdmin
        .from("admin_runtime_policy_audit")
        .select(
          "audit_id, policy_key, old_value_jsonb, new_value_jsonb, changed_by, changed_at, reason",
        )
        .order("changed_at", { ascending: false })
        .limit(auditLimit);
      if (
        auditErr &&
        !auditErr.message.toLowerCase().includes("admin_runtime_policy_audit")
      ) {
        return json(500, {
          error: `Failed to load policy audit: ${auditErr.message}`,
        });
      }

      const runtimePolicy = await loadRuntimePolicy(supabaseAdmin);
      return json(200, {
        blockdata_admin: {
          user_id: admin.userId,
          email: admin.email,
        },
        policy_snapshot_preview: buildRuntimePolicySnapshot(
          runtimePolicy,
          new Date().toISOString(),
        ),
        policies: policyRows.map((row) => ({
          policy_key: row.policy_key,
          value: row.value_jsonb,
          value_type: row.value_type,
          description: row.description,
          updated_at: row.updated_at,
          updated_by: row.updated_by,
        })),
        audit: (auditRows ?? []).map((row: Record<string, unknown>) => ({
          audit_id: row.audit_id,
          policy_key: row.policy_key,
          old_value: row.old_value_jsonb,
          new_value: row.new_value_jsonb,
          changed_by: row.changed_by,
          changed_at: row.changed_at,
          reason: row.reason,
        })),
      });
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const body = await req.json().catch(() => null);
      const updates = parseUpdates(body);
      if (!updates || updates.length === 0) {
        return json(400, {
          error:
            "Invalid update payload. Provide policy_key/value or updates[]",
        });
      }

      const policyRows = await listAdminPolicyRows(supabaseAdmin);
      const rowByKey = new Map(policyRows.map((row) => [row.policy_key, row]));

      // Validate keys and value types first.
      for (const update of updates) {
        const row = rowByKey.get(update.policy_key);
        if (!row) {
          return json(400, {
            error: `Unknown policy key: ${update.policy_key}`,
          });
        }
        if (!valueTypeMatches(update.value, row.value_type)) {
          return json(400, {
            error:
              `Type mismatch for ${update.policy_key}: expected ${row.value_type}, got ${typeof update
                .value}`,
          });
        }
      }

      // Build candidate policy and validate cross-field constraints before writes.
      const candidatePolicy = await loadRuntimePolicy(supabaseAdmin);
      for (const update of updates) {
        const ok = applyPolicyValue(
          candidatePolicy,
          update.policy_key,
          update.value,
        );
        if (!ok) {
          return json(400, { error: `Invalid value for ${update.policy_key}` });
        }
      }
      const validationErrors = validateRuntimePolicy(candidatePolicy);
      if (validationErrors.length > 0) {
        return json(400, {
          error: "Policy validation failed",
          details: validationErrors,
        });
      }

      const applied: string[] = [];
      for (const update of updates) {
        const row = rowByKey.get(update.policy_key);
        if (!row) continue;
        const oldValue = row.value_jsonb;
        const newValue = update.value;

        if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
          continue;
        }

        const { error: updateErr } = await supabaseAdmin
          .from("admin_runtime_policy")
          .update({
            value_jsonb: newValue,
            updated_by: admin.userId,
          })
          .eq("policy_key", update.policy_key);
        if (updateErr) {
          return json(500, {
            error:
              `Failed to update ${update.policy_key}: ${updateErr.message}`,
          });
        }

        const { error: auditErr } = await supabaseAdmin
          .from("admin_runtime_policy_audit")
          .insert({
            policy_key: update.policy_key,
            old_value_jsonb: oldValue,
            new_value_jsonb: newValue,
            changed_by: admin.userId,
            reason: update.reason ?? null,
          });
        if (auditErr) {
          return json(500, {
            error:
              `Failed to write audit for ${update.policy_key}: ${auditErr.message}`,
          });
        }
        applied.push(update.policy_key);
      }

      const refreshedRows = await listAdminPolicyRows(supabaseAdmin);
      return json(200, {
        ok: true,
        applied_count: applied.length,
        applied_keys: applied,
        policies: refreshedRows.map((row) => ({
          policy_key: row.policy_key,
          value: row.value_jsonb,
          value_type: row.value_type,
          description: row.description,
          updated_at: row.updated_at,
          updated_by: row.updated_by,
        })),
      });
    }

    return json(405, { error: "Method not allowed" });
  } catch (e) {
    return mapAdminConfigErrorToResponse(e);
  }
}

if (import.meta.main) {
  Deno.serve(adminConfigHandler);
}
```

## `supabase/functions/admin-config/index.test.ts`

Note: Focused regression tests for admin-config auth error mapping.

```ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapAdminConfigErrorToResponse } from "./index.ts";

Deno.test("mapAdminConfigErrorToResponse maps Blockdata Admin forbidden errors to 403", async () => {
  const response = mapAdminConfigErrorToResponse(
    new Error("Forbidden: blockdata admin access required"),
  );

  assertEquals(response.status, 403);
  assertEquals(await response.json(), {
    error: "Forbidden: blockdata admin access required",
  });
});

Deno.test("mapAdminConfigErrorToResponse maps Blockdata Admin configuration errors to 503", async () => {
  const response = mapAdminConfigErrorToResponse(
    new Error("Blockdata Admin access is not configured"),
  );

  assertEquals(response.status, 503);
  assertEquals(await response.json(), {
    error: "Blockdata Admin access is not configured",
  });
});
```

## `services/platform-api/app/api/routes/auth_access.py`

Note: Platform API endpoint consumed by the frontend access store. Returns blockdata_admin/agchain_admin/superuser booleans.

```py
from __future__ import annotations

from time import perf_counter

from fastapi import APIRouter, Depends
from opentelemetry import metrics, trace

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.observability.contract import safe_attributes, set_span_attributes

router = APIRouter(prefix="/auth", tags=["auth-access"])
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

access_read_counter = meter.create_counter("platform.auth.access.read.count")
access_read_duration_ms = meter.create_histogram("platform.auth.access.read.duration_ms")


@router.get("/access")
async def get_auth_access(auth: AuthPrincipal = Depends(require_user_auth)):
    started = perf_counter()
    with tracer.start_as_current_span("auth.access.read") as span:
        payload = {
            "blockdata_admin": auth.has_role("blockdata_admin"),
            "agchain_admin": auth.has_role("agchain_admin"),
            "superuser": auth.has_role("platform_admin"),
        }
        duration_ms = max(0, int((perf_counter() - started) * 1000))
        attrs = {**payload, "result": "ok", "http.status_code": 200}
        set_span_attributes(span, attrs)
        metric_attrs = safe_attributes(attrs)
        access_read_counter.add(1, metric_attrs)
        access_read_duration_ms.record(duration_ms, metric_attrs)
        return payload
```

## `services/platform-api/app/auth/dependencies.py`

Note: Backend role-resolution layer. Included as context because admin surface access ultimately depends on these role checks.

```py
"""FastAPI auth dependencies â€” M2M bearer, legacy header, and Supabase JWT auth.

Security schemes are declared as module-level objects so OpenAPI documents
them automatically. require_auth consumes them via Security(), which means
any route using Depends(require_auth) or Depends(require_role(...)) inherits
the security metadata in the OpenAPI spec through the dependency chain.
"""

import logging
from typing import Any, Callable

from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer

from app.auth.principals import AuthPrincipal
from app.core.config import get_settings

logger = logging.getLogger("platform-api.auth")

# ---------------------------------------------------------------------------
#  OpenAPI security scheme declarations
# ---------------------------------------------------------------------------

bearer_scheme = HTTPBearer(
    auto_error=False,
    description="M2M token or Supabase JWT",
)
api_key_scheme = APIKeyHeader(
    name="X-Conversion-Service-Key",
    auto_error=False,
    description="Deprecated. Legacy machine-to-machine key â€” use Bearer token instead.",
)


class SupabaseAuthConfigError(RuntimeError):
    """Raised when server-side Supabase auth settings are missing."""


def _require_supabase_auth_settings() -> tuple[str, str]:
    settings = get_settings()
    missing: list[str] = []
    if not settings.supabase_url:
        missing.append("SUPABASE_URL")
    if not settings.supabase_service_role_key:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if missing:
        raise SupabaseAuthConfigError(
            f"Missing required Supabase auth settings: {', '.join(missing)}"
        )
    return settings.supabase_url, settings.supabase_service_role_key


def _verify_supabase_jwt(token: str) -> Any:
    """Validate a Supabase JWT and return the user object.

    Uses the Supabase Python SDK with service_role key to call auth.get_user(token).
    This validates the JWT signature and expiry server-side.
    """
    from supabase import create_client

    supabase_url, service_role_key = _require_supabase_auth_settings()
    client = create_client(supabase_url, service_role_key)
    response = client.auth.get_user(token)
    if not response or not response.user:
        raise ValueError("Invalid JWT: no user returned")
    return response.user


def _check_registry_role(email: str, table_name: str) -> bool:
    """Check if email is designated in a registry table with is_active=True.

    Mirrors the TypeScript registry-backed access helpers from
    supabase/functions/_shared/superuser.ts.
    """
    from supabase import create_client

    supabase_url, service_role_key = _require_supabase_auth_settings()
    admin = create_client(supabase_url, service_role_key)

    # First check if any active designated profiles exist at all
    any_active = (
        admin.table(table_name)
        .select("email_normalized")
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    if not any_active.data:
        return False

    # Check if this specific email is designated for the surface
    normalized = email.strip().lower()
    match = (
        admin.table(table_name)
        .select("email_normalized")
        .eq("email_normalized", normalized)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    return bool(match.data)


def _check_superuser(email: str) -> bool:
    """Check if email is in registry_superuser_profiles with is_active=True."""
    return _check_registry_role(email, "registry_superuser_profiles")


def _check_blockdata_admin(email: str) -> bool:
    """Check if email is in registry_blockdata_admin_profiles with is_active=True."""
    return _check_registry_role(email, "registry_blockdata_admin_profiles")


def _check_agchain_admin(email: str) -> bool:
    """Check if email is in registry_agchain_admin_profiles with is_active=True."""
    return _check_registry_role(email, "registry_agchain_admin_profiles")


async def require_auth(
    bearer_creds: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    api_key: str | None = Security(api_key_scheme),
) -> AuthPrincipal:
    """Authenticate via Bearer token (M2M or JWT) or legacy X-Conversion-Service-Key header.

    Auth resolution order:
    1. Bearer token that exactly matches PLATFORM_API_M2M_TOKEN -> machine M2M
    2. Bearer token that does NOT match M2M -> validate as Supabase JWT
    3. X-Conversion-Service-Key header -> legacy machine auth (deprecated)
    4. No credentials -> 401
    """
    settings = get_settings()

    # --- Path 1 & 2: Bearer token ---
    if bearer_creds is not None:
        token = bearer_creds.credentials

        # Path 1: M2M bearer (exact match)
        if settings.platform_api_m2m_token and token == settings.platform_api_m2m_token:
            return AuthPrincipal(
                subject_type="machine",
                subject_id="m2m-caller",
                roles=frozenset({"platform_admin", "blockdata_admin", "agchain_admin"}),
                auth_source="m2m_bearer",
            )

        # Path 2: Supabase JWT
        try:
            user = _verify_supabase_jwt(token)
        except SupabaseAuthConfigError as e:
            logger.error("Supabase JWT validation unavailable: %s", e)
            raise HTTPException(status_code=500, detail="Server auth configuration error")
        except Exception as e:
            logger.debug(f"JWT validation failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid bearer token")

        email = (user.email or "").strip().lower()
        roles: set[str] = {"authenticated"}

        for role_name, checker, label in (
            ("platform_admin", _check_superuser, "superuser"),
            ("blockdata_admin", _check_blockdata_admin, "blockdata_admin"),
            ("agchain_admin", _check_agchain_admin, "agchain_admin"),
        ):
            try:
                if email and checker(email):
                    roles.add(role_name)
            except Exception as e:
                logger.warning(f"{label} check failed for {email}: {e}")
                # Non-fatal: user still gets any successfully resolved roles

        return AuthPrincipal(
            subject_type="user",
            subject_id=user.id,
            roles=frozenset(roles),
            auth_source="supabase_jwt",
            email=email,
        )

    # --- Path 3: Legacy header (deprecated) ---
    if api_key:
        if settings.conversion_service_key and api_key == settings.conversion_service_key:
            return AuthPrincipal(
                subject_type="machine",
                subject_id="legacy-caller",
                roles=frozenset({"platform_admin", "blockdata_admin", "agchain_admin"}),
                auth_source="legacy_header",
            )
        raise HTTPException(status_code=401, detail="Unauthorized")

    # --- Path 4: No credentials ---
    raise HTTPException(status_code=401, detail="Authentication required")


def require_role(role: str) -> Callable:
    """Factory that returns a dependency requiring a specific role."""

    async def _check(auth: AuthPrincipal = Depends(require_auth)) -> AuthPrincipal:
        if not auth.has_role(role):
            raise HTTPException(status_code=403, detail=f"Role required: {role}")
        return auth

    return _check


# Backward-compatible aliases for admin_services.py migration
SuperuserContext = AuthPrincipal
require_superuser = require_role("platform_admin")
require_blockdata_admin = require_role("blockdata_admin")
require_agchain_admin = require_role("agchain_admin")


async def require_user_auth(
    auth: AuthPrincipal = Depends(require_auth),
) -> AuthPrincipal:
    """Require human user authentication. Rejects M2M and legacy machine tokens."""
    if auth.subject_type != "user":
        raise HTTPException(status_code=403, detail="User authentication required")
    return auth
```

## `web/src/lib/platformApi.ts`

Note: Authenticated frontend fetch wrapper used by the access store.

```ts
/**
 * Shared authenticated fetch for platform-api (VITE_PLATFORM_API_URL).
 *
 * Reuses requireAccessToken() from lib/edge.ts â€” the same token helper
 * that edgeFetch uses for Supabase Edge Functions. This module targets
 * the platform-api base URL instead.
 */
import { requireAccessToken } from '@/lib/edge';
import type { PlatformApiBaseMode } from '@/lib/operationalReadiness';
import { supabase } from '@/lib/supabase';

export function resolvePlatformApiTarget(): {
  platformApiTarget: string;
  baseMode: PlatformApiBaseMode;
} {
  const configured = import.meta.env.VITE_PLATFORM_API_URL?.trim();
  if (configured) {
    return {
      platformApiTarget: configured.replace(/\/+$/, ''),
      baseMode: 'absolute_direct',
    };
  }

  return {
    platformApiTarget: '/platform-api',
    baseMode: 'relative_proxy',
  };
}

export function buildPlatformApiUrl(
  path: string,
  platformApiTarget = resolvePlatformApiTarget().platformApiTarget,
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${platformApiTarget}${normalizedPath}`;
}

/**
 * Authenticated fetch against platform-api. Automatically attaches
 * the Supabase JWT as a Bearer token. On 401 with "Invalid JWT",
 * refreshes the session and retries once (matching edgeFetch behavior).
 */
export async function platformApiFetch(
  path: string,
  init: RequestInit = {},
  options: {
    platformApiTarget?: string;
  } = {},
): Promise<Response> {
  const url = buildPlatformApiUrl(path, options.platformApiTarget);

  const doFetch = async (token: string): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };

  let token = await requireAccessToken();
  let resp = await doFetch(token);

  if (resp.status !== 401) return resp;

  // Check if it's a JWT issue worth retrying
  const bodyText = await resp.clone().text().catch(() => '');
  if (!bodyText.includes('Invalid JWT') && !bodyText.includes('token')) return resp;

  // Refresh session and retry once
  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.error || !refreshed.data.session?.access_token) return resp;

  token = refreshed.data.session.access_token;
  resp = await doFetch(token);

  return resp;
}
```

## `web/src/auth/AuthContext.tsx`

Note: Frontend session/bootstrap source. Included because access resolution is keyed off the authenticated user/session lifecycle.

```tsx
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  createOAuthAttempt,
  finalizeStoredOAuthAttemptFailure,
  type OAuthAttemptFailureCategory,
  storeOAuthAttempt,
} from '@/lib/authOAuthAttempts';
import { getAuthRedirectUrl } from '@/lib/authRedirects';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { ProfileRow } from '@/lib/types';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profile: ProfileRow | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: { email: string; password: string; displayName?: string }) => Promise<{ needsEmailConfirmation: boolean }>;
  resendSignupConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const DEV_AUTO_LOGIN_ENABLED = import.meta.env.VITE_DEV_AUTO_LOGIN_ENABLED === 'true';
const DEV_AUTO_LOGIN_EMAIL = (
  import.meta.env.VITE_DEV_AUTO_LOGIN_EMAIL as string | undefined
)?.trim() || 'jondev717@gmail.com';
const DEV_AUTO_LOGIN_PASSWORD = (
  import.meta.env.VITE_DEV_AUTO_LOGIN_PASSWORD as string | undefined
) || 'TestPass123!';

function getOAuthNextPath(): string {
  const next = new URL(window.location.href).searchParams.get('next');
  return next && next.startsWith('/') ? next : '/app';
}

function buildOAuthCallbackPath(nextPath: string): string {
  if (nextPath === '/app') return '/auth/callback';
  return `/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

function mapOAuthFailureCategory(error: unknown): OAuthAttemptFailureCategory {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('provider is not enabled') || message.includes('unsupported provider')) {
    return 'provider_disabled';
  }
  return 'unexpected';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const autoLoginAttemptedRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from(TABLES.profiles)
        .select('user_id, email, display_name, created_at, updated_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (!isActive) return;
      setProfile((data ?? null) as ProfileRow | null);
    };

    const bootstrapSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!isActive) return;

        setSession(data.session);
        if (data.session?.user?.id) {
          try {
            await loadProfile(data.session.user.id);
          } catch (profileErr) {
            // Profile failure must NOT wipe a valid session
            if (isActive) setProfile(null);
            console.warn('[auth] profile load failed (session preserved):', profileErr instanceof Error ? profileErr.message : String(profileErr));
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        if (!isActive) return;
        // Only clear session for actual auth failures, not AbortError
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.warn('[auth] bootstrap aborted, preserving state');
        } else {
          setSession(null);
          setProfile(null);
          console.error('[auth] session bootstrap failed:', error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void bootstrapSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user?.id) {
        loadProfile(s.user.id).catch(() => setProfile(null));
      } else {
        setProfile(null);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (session) return;
    if (!DEV_AUTO_LOGIN_ENABLED) return;
    if (!DEV_AUTO_LOGIN_EMAIL || !DEV_AUTO_LOGIN_PASSWORD) return;
    if (autoLoginAttemptedRef.current) return;
    autoLoginAttemptedRef.current = true;

    supabase.auth.signInWithPassword({
      email: DEV_AUTO_LOGIN_EMAIL,
      password: DEV_AUTO_LOGIN_PASSWORD,
    }).then(({ error }) => {
      if (error) console.error('[auto-login] failed:', error.message);
      else console.log('[auto-login] success');
    });
  }, [loading, session]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (params: { email: string; password: string; displayName?: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: params.displayName ? { display_name: params.displayName } : undefined,
        emailRedirectTo: getAuthRedirectUrl('/auth/callback'),
      },
    });
    if (error) throw error;
    return { needsEmailConfirmation: !data.session };
  };

  const resendSignupConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: getAuthRedirectUrl('/auth/callback') },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    const nextPath = getOAuthNextPath();
    const redirectTo = getAuthRedirectUrl(buildOAuthCallbackPath(nextPath));
    const redirectOrigin = new URL(redirectTo).origin;

    const attempt = await createOAuthAttempt({
      provider,
      redirectOrigin,
      nextPath,
    });
    storeOAuthAttempt({
      attemptId: attempt.attemptId,
      attemptSecret: attempt.attemptSecret,
    });

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });
      if (error) throw error;
    } catch (error) {
      await finalizeStoredOAuthAttemptFailure({
        failureCategory: mapOAuthFailureCategory(error),
        result: 'login_error',
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        profile,
        signIn,
        signUp,
        resendSignupConfirmation,
        signOut,
        signInWithOAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

## `web/src/hooks/useAdminSurfaceAccess.ts`

Note: Shared session-scoped admin access store. This is the core remediation file for repeated verification behavior.

```ts
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { platformApiFetch } from '@/lib/platformApi';

export type AdminSurfaceAccess = {
  blockdataAdmin: boolean;
  agchainAdmin: boolean;
  superuser: boolean;
};

export type AdminSurfaceAccessStatus = 'idle' | 'loading' | 'ready' | 'error';

export type AdminSurfaceAccessState = {
  access: AdminSurfaceAccess | null;
  status: AdminSurfaceAccessStatus;
  error: string | null;
  refresh: () => Promise<void>;
};

type AccessResponse = {
  blockdata_admin?: boolean;
  agchain_admin?: boolean;
  superuser?: boolean;
};

type SharedAccessState = {
  userKey: string | null;
  requestKey: string | null;
  access: AdminSurfaceAccess | null;
  status: AdminSurfaceAccessStatus;
  error: string | null;
};

const AUTH_BYPASS_ENABLED = import.meta.env.VITE_AUTH_BYPASS === 'true';

const FULL_ACCESS: AdminSurfaceAccess = {
  blockdataAdmin: true,
  agchainAdmin: true,
  superuser: true,
};

let sharedState: SharedAccessState = AUTH_BYPASS_ENABLED
  ? {
      userKey: '__auth_bypass__',
      requestKey: '__auth_bypass__',
      access: FULL_ACCESS,
      status: 'ready',
      error: null,
    }
  : {
      userKey: null,
      requestKey: null,
      access: null,
      status: 'idle',
      error: null,
    };

const listeners = new Set<() => void>();
const inFlightByRequest = new Map<string, Promise<void>>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  listeners.forEach((listener) => listener());
}

function getSnapshot() {
  return sharedState;
}

function setSharedState(next: SharedAccessState | ((current: SharedAccessState) => SharedAccessState)) {
  sharedState = typeof next === 'function' ? next(sharedState) : next;
  emit();
}

function buildUserKey(userId: string | null) {
  return userId ?? null;
}

function buildRequestKey(userKey: string | null, accessToken: string | null) {
  if (!userKey || !accessToken) return null;
  return `${userKey}:${accessToken}`;
}

function normalizeAccess(body: AccessResponse): AdminSurfaceAccess {
  return {
    blockdataAdmin: Boolean(body.blockdata_admin),
    agchainAdmin: Boolean(body.agchain_admin),
    superuser: Boolean(body.superuser),
  };
}

function describeFailure(resp: Response, bodyText: string) {
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return `Access probe failed with status ${resp.status}`;
  }
  return `Access probe failed with status ${resp.status}: ${trimmed}`;
}

function resetSharedAccessState() {
  if (AUTH_BYPASS_ENABLED) return;
  if (
    sharedState.userKey === null &&
    sharedState.requestKey === null &&
    sharedState.status === 'idle' &&
    sharedState.access === null &&
    sharedState.error === null
  ) {
    return;
  }
  inFlightByRequest.clear();
  setSharedState({
    userKey: null,
    requestKey: null,
    access: null,
    status: 'idle',
    error: null,
  });
}

async function resolveSharedAccess(userKey: string, requestKey: string, force = false): Promise<void> {
  if (AUTH_BYPASS_ENABLED) return;

  if (!force) {
    const inFlight = inFlightByRequest.get(requestKey);
    if (inFlight) return inFlight;
    if (sharedState.userKey === userKey && sharedState.requestKey === requestKey && sharedState.status === 'ready') {
      return;
    }
  }

  setSharedState((current) => {
    const hasResolvedAccess = current.userKey === userKey && current.access !== null;

    return {
      userKey,
      requestKey,
      access: hasResolvedAccess ? current.access : null,
      status: hasResolvedAccess ? 'ready' : 'loading',
      error: null,
    };
  });

  const request = (async () => {
    try {
      const resp = await platformApiFetch('/auth/access', { method: 'GET' });
      if (!resp.ok) {
        const bodyText = await resp.text().catch(() => '');
        throw new Error(describeFailure(resp, bodyText));
      }

      const body = await resp.json() as AccessResponse;
      setSharedState((current) => {
        if (current.userKey !== userKey || current.requestKey !== requestKey) return current;
        return {
          userKey,
          requestKey,
          access: normalizeAccess(body),
          status: 'ready',
          error: null,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSharedState((current) => {
        if (current.userKey !== userKey || current.requestKey !== requestKey) return current;
        return {
          userKey,
          requestKey,
          access: current.access,
          status: current.access ? 'ready' : 'error',
          error: message,
        };
      });
    } finally {
      inFlightByRequest.delete(requestKey);
    }
  })();

  inFlightByRequest.set(requestKey, request);
  return request;
}

export function useAdminSurfaceAccessState(): AdminSurfaceAccessState {
  const { loading, session, user } = useAuth();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const userId = user?.id ?? null;
  const accessToken = session?.access_token ?? null;
  const userKey = buildUserKey(userId);
  const requestKey = buildRequestKey(userKey, accessToken);

  useEffect(() => {
    if (AUTH_BYPASS_ENABLED) return;
    if (loading) return;

    if (!requestKey || !userKey) {
      resetSharedAccessState();
      return;
    }

    void resolveSharedAccess(userKey, requestKey);
  }, [loading, requestKey, userKey]);

  const refresh = useCallback(async () => {
    if (AUTH_BYPASS_ENABLED) return;
    if (!requestKey || !userKey) return;
    await resolveSharedAccess(userKey, requestKey, true);
  }, [requestKey, userKey]);

  if (AUTH_BYPASS_ENABLED) {
    return {
      access: FULL_ACCESS,
      status: 'ready',
      error: null,
      refresh,
    };
  }

  if (loading) {
    return {
      access: null,
      status: 'loading',
      error: null,
      refresh,
    };
  }

  if (!requestKey || !userKey) {
    return {
      access: null,
      status: 'idle',
      error: null,
      refresh,
    };
  }

  if (snapshot.userKey !== userKey) {
    return {
      access: null,
      status: 'loading',
      error: null,
      refresh,
    };
  }

  if (snapshot.requestKey !== requestKey && snapshot.access === null) {
    return {
      access: null,
      status: 'loading',
      error: null,
      refresh,
    };
  }

  return {
    access: snapshot.access,
    status: snapshot.status,
    error: snapshot.error,
    refresh,
  };
}

export function useAdminSurfaceAccess(): AdminSurfaceAccess | null {
  return useAdminSurfaceAccessState().access;
}
```

## `web/src/hooks/useAdminSurfaceAccess.test.tsx`

Note: Main behavior contract tests: shared probe reuse, remount reuse, token refresh behavior, refresh failure preservation, selector+guard integration.

```tsx
import { cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const platformApiFetchMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

async function importAccessHooks() {
  return import('./useAdminSurfaceAccess');
}

describe('useAdminSurfaceAccess', () => {
  beforeEach(() => {
    vi.resetModules();
    platformApiFetchMock.mockReset();
    useAuthMock.mockReset();
    if (typeof globalThis.ResizeObserver === 'undefined') {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
    }
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('waits for auth bootstrap before probing access', async () => {
    const authState = {
      loading: true,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    };
    useAuthMock.mockImplementation(() => authState);

    const { useAdminSurfaceAccessState } = await importAccessHooks();
    const { result, rerender } = renderHook(() => useAdminSurfaceAccessState());

    expect(result.current.status).toBe('loading');
    expect(platformApiFetchMock).not.toHaveBeenCalled();

    authState.loading = false;
    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: true,
        agchain_admin: false,
        superuser: true,
      }),
    });

    rerender();

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'ready',
        access: {
          blockdataAdmin: true,
          agchainAdmin: false,
          superuser: true,
        },
      });
    });
  });

  it('shares a single access probe across multiple consumers in the same session', async () => {
    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    });
    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: true,
        agchain_admin: false,
        superuser: false,
      }),
    });

    const { useAdminSurfaceAccessState } = await importAccessHooks();

    function Probe({ label }: { label: string }) {
      const state = useAdminSurfaceAccessState();
      return (
        <div data-testid={label}>
          {state.status}:{state.access?.blockdataAdmin ? 'yes' : 'no'}
        </div>
      );
    }

    render(
      <>
        <Probe label="selector" />
        <Probe label="guard" />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('selector')).toHaveTextContent('ready:yes');
      expect(screen.getByTestId('guard')).toHaveTextContent('ready:yes');
    });

    expect(platformApiFetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares one access probe across the real workspace selector and blockdata guard', async () => {
    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    });
    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: true,
        agchain_admin: false,
        superuser: false,
      }),
    });

    const [{ ShellWorkspaceSelector }, { BlockdataAdminGuard }] = await Promise.all([
      import('@/components/shell/ShellWorkspaceSelector'),
      import('@/pages/superuser/SuperuserGuard'),
    ]);

    render(
      <MemoryRouter initialEntries={['/app/blockdata-admin/instance-config']}>
        <ShellWorkspaceSelector />
        <Routes>
          <Route path="/app" element={<div data-testid="app-home">app home</div>} />
          <Route path="/app/blockdata-admin/*" element={<BlockdataAdminGuard />}>
            <Route path="*" element={<div data-testid="protected-surface">protected</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-surface')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveValue('Blockdata Admin');
    });

    expect(platformApiFetchMock).toHaveBeenCalledTimes(1);
  });

  it('reuses resolved access after a consumer remount instead of probing again', async () => {
    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    });
    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: false,
        agchain_admin: true,
        superuser: false,
      }),
    });

    const { useAdminSurfaceAccessState } = await importAccessHooks();

    function Probe({ label }: { label: string }) {
      const state = useAdminSurfaceAccessState();
      return (
        <div data-testid={label}>
          {state.status}:{state.access?.agchainAdmin ? 'yes' : 'no'}
        </div>
      );
    }

    const { rerender } = render(<Probe label="selector" />);

    await waitFor(() => {
      expect(screen.getByTestId('selector')).toHaveTextContent('ready:yes');
    });

    rerender(<Probe label="guard" />);

    expect(screen.getByTestId('guard')).toHaveTextContent('ready:yes');
    expect(platformApiFetchMock).toHaveBeenCalledTimes(1);
  });

  it('settles into an error state instead of staying null forever when the probe fails', async () => {
    useAuthMock.mockReturnValue({
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    });
    platformApiFetchMock.mockRejectedValueOnce(new Error('network down'));

    const { useAdminSurfaceAccessState } = await importAccessHooks();
    const { result } = renderHook(() => useAdminSurfaceAccessState());

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.access).toBeNull();
    expect(result.current.error).toContain('network down');
  });

  it('refreshes access when the authenticated session token changes without dropping the last ready access', async () => {
    let authState = {
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    };
    useAuthMock.mockImplementation(() => authState);

    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: false,
        agchain_admin: false,
        superuser: true,
      }),
    });

    const { useAdminSurfaceAccessState } = await importAccessHooks();
    const { result, rerender } = renderHook(() => useAdminSurfaceAccessState());

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'ready',
        access: {
          blockdataAdmin: false,
          agchainAdmin: false,
          superuser: true,
        },
      });
    });

    authState = {
      ...authState,
      session: { access_token: 'token-2' },
    };
    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: true,
        agchain_admin: true,
        superuser: false,
      }),
    });

    rerender();

    expect(result.current).toMatchObject({
      status: 'ready',
      access: {
        blockdataAdmin: false,
        agchainAdmin: false,
        superuser: true,
      },
    });

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'ready',
        access: {
          blockdataAdmin: true,
          agchainAdmin: true,
          superuser: false,
        },
      });
    });

    expect(platformApiFetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the last known access when a token-refresh probe fails', async () => {
    let authState = {
      loading: false,
      user: { id: 'user-1' },
      session: { access_token: 'token-1' },
    };
    useAuthMock.mockImplementation(() => authState);

    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: true,
        agchain_admin: false,
        superuser: false,
      }),
    });

    const { useAdminSurfaceAccessState } = await importAccessHooks();
    const { result, rerender } = renderHook(() => useAdminSurfaceAccessState());

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'ready',
        access: {
          blockdataAdmin: true,
          agchainAdmin: false,
          superuser: false,
        },
      });
    });

    authState = {
      ...authState,
      session: { access_token: 'token-2' },
    };
    platformApiFetchMock.mockRejectedValueOnce(new Error('refresh failed'));

    rerender();

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: 'ready',
        access: {
          blockdataAdmin: true,
          agchainAdmin: false,
          superuser: false,
        },
      });
      expect(result.current.error).toContain('refresh failed');
    });
  });
});
```

## `web/src/hooks/useSuperuserProbe.ts`

Note: Legacy compatibility hook now backed by the shared access store.

```ts
import { useAdminSurfaceAccessState } from '@/hooks/useAdminSurfaceAccess';

/**
 * Probes the admin-config endpoint to determine if the current user
 * is a superuser. Returns `null` while loading, then `true`/`false`.
 * Re-probes when the authenticated user changes.
 */
export function useSuperuserProbe(): boolean | null {
  const { access, status } = useAdminSurfaceAccessState();

  if ((status === 'loading' || status === 'idle' || status === 'error') && access === null) {
    return null;
  }

  return Boolean(access?.superuser);
}
```

## `web/src/components/shell/ShellWorkspaceSelector.tsx`

Note: Workspace selector consumer of shared admin access. Must not trigger independent access resolution loops.

```tsx
import { Combobox, createListCollection } from '@ark-ui/react/combobox';
import { IconChevronDown } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminSurfaceAccessState } from '@/hooks/useAdminSurfaceAccess';

type WorkspaceValue = 'blockdata' | 'agchain' | 'blockdata-admin' | 'agchain-admin' | 'superuser';

type WorkspaceOption = {
  label: string;
  value: WorkspaceValue;
  path: string;
  adminKey?: 'blockdataAdmin' | 'agchainAdmin' | 'superuser';
};

const BASE_WORKSPACE_OPTIONS: WorkspaceOption[] = [
  { label: 'Blockdata', value: 'blockdata', path: '/app' },
  { label: 'AG chain', value: 'agchain', path: '/app/agchain' },
];

const ADMIN_WORKSPACE_OPTIONS: WorkspaceOption[] = [
  { label: 'Blockdata Admin', value: 'blockdata-admin', path: '/app/blockdata-admin', adminKey: 'blockdataAdmin' },
  { label: 'AGChain Admin', value: 'agchain-admin', path: '/app/agchain-admin', adminKey: 'agchainAdmin' },
  { label: 'Superuser', value: 'superuser', path: '/app/superuser', adminKey: 'superuser' },
];

const ADMIN_WORKSPACE_FALLBACKS: Record<Extract<WorkspaceValue, 'blockdata-admin' | 'agchain-admin' | 'superuser'>, Extract<WorkspaceValue, 'blockdata' | 'agchain'>> = {
  'blockdata-admin': 'blockdata',
  'agchain-admin': 'agchain',
  superuser: 'blockdata',
};

function isAdminWorkspaceValue(
  value: WorkspaceValue,
): value is Extract<WorkspaceValue, 'blockdata-admin' | 'agchain-admin' | 'superuser'> {
  return value in ADMIN_WORKSPACE_FALLBACKS;
}

export function ShellWorkspaceSelector() {
  const location = useLocation();
  const navigate = useNavigate();
  const { access, status } = useAdminSurfaceAccessState();

  const currentValue: WorkspaceValue = location.pathname.startsWith('/app/blockdata-admin')
    ? 'blockdata-admin'
    : location.pathname.startsWith('/app/agchain-admin')
      ? 'agchain-admin'
      : location.pathname.startsWith('/app/superuser')
    ? 'superuser'
    : location.pathname.startsWith('/app/agchain')
      ? 'agchain'
      : 'blockdata';

  const workspaceOptions = useMemo(() => (
    [
      ...BASE_WORKSPACE_OPTIONS,
      ...ADMIN_WORKSPACE_OPTIONS.filter((option) => (
        status === 'loading' || status === 'idle'
          ? option.value === currentValue
          : (option.adminKey ? Boolean(access?.[option.adminKey]) : false)
      )),
    ]
  ), [access, currentValue, status]);

  const selectedValue = useMemo<WorkspaceValue>(() => {
    if (!isAdminWorkspaceValue(currentValue)) return currentValue;
    if (workspaceOptions.some((option) => option.value === currentValue)) {
      return currentValue;
    }
    return ADMIN_WORKSPACE_FALLBACKS[currentValue];
  }, [currentValue, workspaceOptions]);

  const workspaceCollection = useMemo(
    () => createListCollection({ items: workspaceOptions }),
    [workspaceOptions],
  );

  const currentOption = workspaceOptions.find((option) => option.value === selectedValue);

  return (
    <Combobox.Root
      collection={workspaceCollection}
      value={[selectedValue]}
      inputValue={currentOption?.label ?? ''}
      onValueChange={(details) => {
        const nextValue = details.value[0] as WorkspaceValue | undefined;
        const next = workspaceOptions.find((option) => option.value === nextValue);
        if (next && next.path !== location.pathname && next.value !== selectedValue) {
          navigate(next.path);
        }
      }}
      closeOnSelect
      openOnClick
      selectionBehavior="preserve"
      positioning={{ placement: 'bottom-end', sameWidth: true, offset: { mainAxis: 6 } }}
      className="shell-workspace-selector"
    >
      <Combobox.Control className="shell-workspace-selector-control">
        <Combobox.Input
          aria-label="Workspace"
          className="shell-workspace-selector-input"
          placeholder="Select workspace"
          readOnly
          spellCheck={false}
        />
        <Combobox.Trigger
          aria-label="Open workspace selector"
          className="shell-workspace-selector-trigger"
        >
          <IconChevronDown size={14} stroke={1.8} />
        </Combobox.Trigger>
      </Combobox.Control>
      <Combobox.Positioner className="shell-workspace-selector-positioner">
        <Combobox.Content className="shell-workspace-selector-content">
          {workspaceOptions.map((option) => (
            <Combobox.Item
              key={option.value}
              item={option}
              className="shell-workspace-selector-item"
            >
              <Combobox.ItemText>{option.label}</Combobox.ItemText>
            </Combobox.Item>
          ))}
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>
  );
}
```

## `web/src/components/shell/ShellWorkspaceSelector.test.tsx`

Note: Selector coverage for persona visibility and fallback behavior.

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ShellWorkspaceSelector } from './ShellWorkspaceSelector';

const navigateMock = vi.fn();
type AccessState = {
  access: { blockdataAdmin: boolean; agchainAdmin: boolean; superuser: boolean } | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  refresh: () => Promise<void>;
};

const useAdminSurfaceAccessStateMock = vi.fn<() => AccessState>(() => ({
  access: {
    blockdataAdmin: false,
    agchainAdmin: false,
    superuser: false,
  },
  status: 'ready',
  error: null,
  refresh: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/hooks/useAdminSurfaceAccess', () => ({
  useAdminSurfaceAccessState: () => useAdminSurfaceAccessStateMock(),
}));

beforeEach(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
  useAdminSurfaceAccessStateMock.mockReset();
  useAdminSurfaceAccessStateMock.mockReturnValue({
    access: {
      blockdataAdmin: false,
      agchainAdmin: false,
      superuser: false,
    },
    status: 'ready',
    error: null,
    refresh: vi.fn(),
  });
});

describe('ShellWorkspaceSelector', () => {
  it('shows Blockdata as the selected workspace on standard app routes', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveValue('Blockdata');
  });

  it('shows AG chain as the selected workspace on agchain routes', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/runs']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveValue('AG chain');
  });

  it('navigates to agchain when AG chain is selected', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));
    fireEvent.click(await screen.findByRole('option', { name: /ag chain/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/agchain');
    });
  });

  it('navigates to blockdata when Blockdata is selected from agchain', async () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));
    fireEvent.click(await screen.findByRole('option', { name: /blockdata/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app');
    });
  });

  it('hides the elevated admin surfaces when the probe is not authorized', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(screen.queryByRole('option', { name: /blockdata admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /agchain admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /superuser/i })).not.toBeInTheDocument();
  });

  it('shows the three elevated admin surfaces when the probe is authorized', async () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: true,
        agchainAdmin: true,
        superuser: true,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(await screen.findByRole('option', { name: /blockdata admin/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /agchain admin/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /superuser/i })).toBeInTheDocument();
  });

  it('shows only Blockdata Admin for a blockdata-only admin persona', async () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: true,
        agchainAdmin: false,
        superuser: false,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(await screen.findByRole('option', { name: /blockdata admin/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /agchain admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^superuser$/i })).not.toBeInTheDocument();
  });

  it('shows only AGChain Admin for an agchain-only admin persona', async () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: false,
        agchainAdmin: true,
        superuser: false,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(await screen.findByRole('option', { name: /agchain admin/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /blockdata admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^superuser$/i })).not.toBeInTheDocument();
  });

  it('shows only Superuser for a superuser-only persona', async () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: false,
        agchainAdmin: false,
        superuser: true,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(await screen.findByRole('option', { name: /^superuser$/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /blockdata admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /agchain admin/i })).not.toBeInTheDocument();
  });

  it('falls back to a visible workspace when the current admin route is forbidden', () => {
    render(
      <MemoryRouter initialEntries={['/app/blockdata-admin/instance-config']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveValue('Blockdata');

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));

    expect(screen.queryByRole('option', { name: /blockdata admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /agchain admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^superuser$/i })).not.toBeInTheDocument();
  });

  it('navigates to the blockdata admin shell when Blockdata Admin is selected', async () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: true,
        agchainAdmin: true,
        superuser: true,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));
    fireEvent.click(await screen.findByRole('option', { name: /blockdata admin/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/blockdata-admin');
    });
  });

  it('navigates to the agchain admin shell when AGChain Admin is selected', async () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: true,
        agchainAdmin: true,
        superuser: true,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));
    fireEvent.click(await screen.findByRole('option', { name: /agchain admin/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/agchain-admin');
    });
  });

  it('navigates to the superuser shell when Superuser is selected', async () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: true,
        agchainAdmin: true,
        superuser: true,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <ShellWorkspaceSelector />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('combobox', { name: /workspace/i }));
    fireEvent.click(await screen.findByRole('option', { name: /^superuser$/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/superuser');
    });
  });
});
```

## `web/src/pages/superuser/SuperuserGuard.tsx`

Note: Guard layer for Blockdata Admin, AGChain Admin, and Superuser routes. Must preserve last-known access on transient failures.

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminSurfaceAccessState } from '@/hooks/useAdminSurfaceAccess';

// Mirror the auth bypass flag from AuthGuard â€” when auth is bypassed,
// superuser gating is also bypassed so the page is accessible in dev.
// Off by default. Set VITE_AUTH_BYPASS=true in .env.local to enable.
const AUTH_BYPASS_ENABLED = import.meta.env.VITE_AUTH_BYPASS === 'true';

type SurfaceKey = 'blockdataAdmin' | 'agchainAdmin' | 'superuser';

function AdminSurfaceGuard({ surface }: { surface: SurfaceKey }) {
  const { access, status, refresh } = useAdminSurfaceAccessState();

  if (AUTH_BYPASS_ENABLED) {
    return <Outlet />;
  }

  if ((status === 'loading' || status === 'idle') && access === null) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Verifying accessâ€¦
      </div>
    );
  }

  if (access?.[surface]) {
    return <Outlet />;
  }

  if (status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">Unable to verify admin access right now.</p>
        <button
          type="button"
          onClick={() => { void refresh(); }}
          className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!access?.[surface]) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}

export function SuperuserGuard() {
  return <AdminSurfaceGuard surface="superuser" />;
}

export function BlockdataAdminGuard() {
  return <AdminSurfaceGuard surface="blockdataAdmin" />;
}

export function AgchainAdminGuard() {
  return <AdminSurfaceGuard surface="agchainAdmin" />;
}
```

## `web/src/pages/superuser/SuperuserGuard.test.tsx`

Note: Guard coverage for loading, allowed/forbidden personas, and transient error behavior.

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  AgchainAdminGuard,
  BlockdataAdminGuard,
  SuperuserGuard,
} from './SuperuserGuard';

type AccessState = {
  access: { blockdataAdmin: boolean; agchainAdmin: boolean; superuser: boolean } | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  refresh: () => Promise<void>;
};

const useAdminSurfaceAccessStateMock = vi.fn<() => AccessState>(() => ({
  access: {
    blockdataAdmin: false,
    agchainAdmin: false,
    superuser: false,
  },
  status: 'ready',
  error: null,
  refresh: vi.fn(),
}));

vi.mock('@/hooks/useAdminSurfaceAccess', () => ({
  useAdminSurfaceAccessState: () => useAdminSurfaceAccessStateMock(),
}));

afterEach(() => {
  cleanup();
  useAdminSurfaceAccessStateMock.mockReset();
  useAdminSurfaceAccessStateMock.mockReturnValue({
    access: {
      blockdataAdmin: false,
      agchainAdmin: false,
      superuser: false,
    },
    status: 'ready',
    error: null,
    refresh: vi.fn(),
  });
});

function renderGuard(
  path: string,
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app" element={<div data-testid="app-home">app home</div>} />
        <Route path="/app/blockdata-admin/*" element={<BlockdataAdminGuard />}>
          <Route path="*" element={<div data-testid="protected-surface">blockdata admin</div>} />
        </Route>
        <Route path="/app/agchain-admin/*" element={<AgchainAdminGuard />}>
          <Route path="*" element={<div data-testid="protected-surface">agchain admin</div>} />
        </Route>
        <Route path="/app/superuser/*" element={<SuperuserGuard />}>
          <Route path="*" element={<div data-testid="protected-surface">superuser</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('SuperuserGuard surfaces', () => {
  it('shows a verification state while access is still resolving', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: null,
      status: 'loading',
      error: null,
      refresh: vi.fn(),
    });

    renderGuard('/app/blockdata-admin');

    expect(screen.getByText(/verifying access/i)).toBeInTheDocument();
  });

  it('allows a blockdata-only admin into the blockdata admin surface', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: true,
        agchainAdmin: false,
        superuser: false,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    renderGuard('/app/blockdata-admin');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('blockdata admin');
  });

  it('does not let a superuser-only persona into the blockdata admin surface', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: false,
        agchainAdmin: false,
        superuser: true,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    renderGuard('/app/blockdata-admin');

    expect(screen.getByTestId('app-home')).toBeInTheDocument();
  });

  it('allows an agchain-only admin into the AGChain admin surface', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: false,
        agchainAdmin: true,
        superuser: false,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    renderGuard('/app/agchain-admin/models');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('agchain admin');
  });

  it('does not let a blockdata-only persona into the AGChain admin surface', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: true,
        agchainAdmin: false,
        superuser: false,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    renderGuard('/app/agchain-admin/models');

    expect(screen.getByTestId('app-home')).toBeInTheDocument();
  });

  it('allows a superuser-only persona into the superuser surface', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: false,
        agchainAdmin: false,
        superuser: true,
      },
      status: 'ready',
      error: null,
      refresh: vi.fn(),
    });

    renderGuard('/app/superuser/operational-readiness');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('superuser');
  });

  it('does not keep showing verification after the access probe has failed', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: null,
      status: 'error',
      error: 'network down',
      refresh: vi.fn(),
    });

    renderGuard('/app/superuser/operational-readiness');

    expect(screen.getByText(/unable to verify admin access/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('preserves a previously resolved surface grant even when a background refresh has errored', () => {
    useAdminSurfaceAccessStateMock.mockReturnValue({
      access: {
        blockdataAdmin: true,
        agchainAdmin: false,
        superuser: false,
      },
      status: 'ready',
      error: 'network down',
      refresh: vi.fn(),
    });

    renderGuard('/app/blockdata-admin');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('blockdata admin');
  });
});
```

## `web/src/router.tsx`

Note: Route ancestry source of truth. Guards are mounted outside AdminShellLayout here.

```tsx
/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PublicFullBleedLayout } from '@/components/layout/PublicFullBleedLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthGuard } from '@/auth/AuthGuard';


import MarketingIntegrations from '@/pages/MarketingIntegrations';
import AuthCallback from '@/pages/AuthCallback';
import AuthWelcome from '@/pages/AuthWelcome';
import LoginSplit from '@/pages/LoginSplit';
import Projects from '@/pages/Projects';
import FlowDetail from '@/pages/FlowDetail';
import FlowsList from '@/pages/FlowsList';

import Schemas from '@/pages/Schemas';
import SchemaLayout from '@/pages/SchemaLayout';

import { SettingsLayout, SettingsAccount, SettingsAiOverview, SettingsProviderForm, SettingsModelRoles, SettingsGridSample, SettingsSecrets, SettingsThemes } from '@/pages/settings';
import PlatformLanding from '@/pages/experiments/PlatformLanding';
import Landing from '@/pages/Landing';
import Agents from '@/pages/Agents';
import ModelRegistrationPreview from '@/pages/ModelRegistrationPreview';
import AgentOnboarding from '@/pages/AgentOnboarding';
import AgentOnboardingAuth from '@/pages/AgentOnboardingAuth';
import AgentOnboardingConnect from '@/pages/AgentOnboardingConnect';
import AgentOnboardingSelect from '@/pages/AgentOnboardingSelect';
import McpServers from '@/pages/settings/McpServers';
import ConnectionsPanel from '@/pages/settings/ConnectionsPanel';
import { ScalarApiPlaygroundPage } from '@/pages/settings/ScalarApiPlaygroundPage';
import Commands from '@/pages/Commands';

import DatabasePlaceholder from '@/pages/DatabasePlaceholder';
import ProjectAssetsPage from '@/pages/ProjectAssetsPage';
import ParsePage from '@/pages/ParsePage';
import PipelineServicesPage from '@/pages/PipelineServicesPage';
import IndexBuilderPage from '@/pages/IndexBuilderPage';
import { Component as Workspace } from '@/pages/Workspace';
import ExtractPage from '@/pages/ExtractPage';
import ConvertPage from '@/pages/ConvertPage';
import TransformPage from '@/pages/TransformPage';
import SecretsPage from '@/pages/SecretsPage';
import LoadPage from '@/pages/LoadPage';
import AppHome from '@/pages/AppHome';
import EarlyAccess from '@/pages/EarlyAccess';

import IntegrationsCatalog from '@/pages/marketplace/IntegrationsCatalog';
import ServicesCatalog from '@/pages/marketplace/ServicesCatalog';
import ServiceDetailPage from '@/pages/marketplace/ServiceDetailPage';
import FunctionCatalogPage from '@/pages/marketplace/FunctionCatalogPage';
import LogsPage from '@/pages/kestra/LogsPage';
import TestsPage from '@/pages/kestra/TestsPage';
import { FlowsShellLayout } from '@/components/layout/FlowsShellLayout';
import { featureFlags } from '@/lib/featureFlags';
import { BlockdataAdminGuard, AgchainAdminGuard, SuperuserGuard } from '@/pages/superuser/SuperuserGuard';
import NotFound from '@/pages/NotFound';
import { AdminShellLayout } from '@/components/layout/AdminShellLayout';
import { AgchainShellLayout } from '@/components/layout/AgchainShellLayout';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';


function LegacyToTransform() {
  useParams<{ projectId: string }>();
  return <Navigate to="/app/transform" replace />;
}


function LegacySettingsAdminRedirect() {
  const { category } = useParams<{ category?: string }>();
  const targetByCategory: Record<string, string> = {
    'instance-config': '/app/blockdata-admin/instance-config',
    'worker-config': '/app/blockdata-admin/worker-config',
    audit: '/app/blockdata-admin/audit',
    'parsers-docling': '/app/blockdata-admin/parsers-docling',
    'platform-config': '/app/blockdata-admin/instance-config',
  };

  return <Navigate to={targetByCategory[category ?? ''] ?? '/app/blockdata-admin/instance-config'} replace />;
}

function LegacyPipelineServicesRedirect() {
  const { serviceSlug } = useParams<{ serviceSlug?: string }>();
  const target = serviceSlug
    ? `/app/pipeline-services/${encodeURIComponent(serviceSlug)}`
    : '/app/pipeline-services';
  return <Navigate to={target} replace />;
}

function UnsupportedPipelineServiceRedirect() {
  return <Navigate to="/app/pipeline-services" replace />;
}

function AgchainIndexRedirect() {
  const { focusedProject, status } = useAgchainProjectFocus();

  if (status === 'bootstrapping') {
    return (
      <div className="flex min-h-full items-center justify-center bg-background px-6 py-12 text-sm text-muted-foreground">
        Loading AGChain project context...
      </div>
    );
  }

  if (status === 'ready' && focusedProject) {
    return <Navigate to="/app/agchain/overview" replace />;
  }

  // no-organization, no-project, and error all land on the projects registry surface
  return <Navigate to="/app/agchain/projects" replace />;
}

function agchainSettingsPlaceholderRoute(spec: {
  scope: 'organization' | 'project' | 'personal';
  title: string;
  description: string;
  note: string;
}) {
  return async () => {
    const { AgchainSettingsPlaceholderPage } = await import('@/components/agchain/settings/AgchainSettingsPlaceholderPage');
    const Component = () => <AgchainSettingsPlaceholderPage {...spec} />;
    return { Component };
  };
}

export const router = createBrowserRouter([
  // Marketing pages: full-width with PublicNav
  {
    element: <MarketingLayout />,
    children: [
      { path: '/integrations', element: <MarketingIntegrations /> },
      { path: '/experiments/platform', element: <PlatformLanding /> },
    ],
  },
  // Landing: marketing layout with nav + footer
  {
    element: <MarketingLayout />,
    children: [
      { path: '/', element: <Landing /> },
    ],
  },
  // Auth pages: full-bleed (use the split concepts)
  {
    element: <PublicFullBleedLayout />,
    children: [
      { path: '/login', element: <LoginSplit /> },
      { path: '/register', element: <Navigate to="/early-access" replace /> },
      { path: '/early-access', element: <EarlyAccess /> },
    ],
  },
  // Auth callback: PublicNav + centered content
  {
    element: <PublicLayout />,
    children: [
      { path: '/auth/callback', element: <AuthCallback /> },
      { path: '/auth/welcome', element: <AuthWelcome /> },
    ],
  },

  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // App landing + projects
          { path: '/app', element: <AppHome /> },

          { path: '/app/projects/list', element: <Projects /> },
          { path: '/app/database', element: <DatabasePlaceholder /> },
          { path: '/app/assets', element: <ProjectAssetsPage /> },
          { path: '/app/parse', element: <ParsePage /> },
          { path: '/app/pipeline-services', element: <PipelineServicesPage /> },
          { path: '/app/pipeline-services/index-builder', element: <IndexBuilderPage /> },
          { path: '/app/pipeline-services/knowledge-bases', lazy: () => import('@/pages/KnowledgeBases') },
          { path: '/app/pipeline-services/:serviceSlug', element: <UnsupportedPipelineServiceRedirect /> },
          { path: '/app/rag', element: <LegacyPipelineServicesRedirect /> },
          { path: '/app/rag/:serviceSlug', element: <LegacyPipelineServicesRedirect /> },
          { path: '/app/knowledge-bases', element: <Navigate to="/app/pipeline-services/knowledge-bases" replace /> },
          { path: '/app/workspace', element: <Workspace /> },
          { path: '/app/extract', element: <ExtractPage /> },
          { path: '/app/convert', element: <ConvertPage /> },
          { path: '/app/secrets', element: <SecretsPage /> },
          { path: '/app/tests', element: <TestsPage /> },
          { path: '/app/logs', element: <LogsPage /> },
          { path: '/app/test-integrations', element: <Navigate to="/app/blockdata-admin/test-integrations" replace /> },
          { path: '/app/marketplace/integrations', element: <IntegrationsCatalog /> },
          { path: '/app/marketplace/services', element: <ServicesCatalog /> },
          { path: '/app/marketplace/services/:serviceId', element: <ServiceDetailPage /> },
          { path: '/app/marketplace/functions', element: <FunctionCatalogPage /> },
          { path: '/app/flows', element: <FlowsList /> },

          { path: '/app/ui', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/ui/:section', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/transform', element: <TransformPage /> },
          { path: '/app/transform/:projectId', element: <LegacyToTransform /> },

          // Global schemas (not project-scoped)
          { path: '/app/schemas', element: <Schemas /> },
          { path: '/app/schemas/layout', element: <SchemaLayout /> },
          { path: '/app/schemas/start', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/wizard', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/templates', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/templates/:templateId', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/apply', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/advanced', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/advanced/:schemaId', element: <Navigate to="/app/schemas" replace /> },
          // API Editor (Scalar playground)
          { path: '/app/api-editor', element: <ScalarApiPlaygroundPage /> },

          // Load (GCS â†’ ArangoDB wizard)
          { path: '/app/load', element: <LoadPage /> },

          // Pipeline nav pages
          { path: '/app/skills', lazy: () => import('@/pages/Skills') },
          { path: '/app/mcp-tools', lazy: () => import('@/pages/McpTools') },
          { path: '/app/observability', element: <Navigate to="/app/observability/telemetry" replace /> },
          { path: '/app/observability/telemetry', lazy: () => import('@/pages/ObservabilityTelemetry') },
          { path: '/app/observability/traces', lazy: () => import('@/pages/ObservabilityTraces') },

          // Settings (API keys, model defaults, MCP)
          {
            path: '/app/settings',
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="/app/settings/profile" replace /> },
              { path: 'profile', element: <SettingsAccount /> },
              { path: 'themes', element: <SettingsThemes /> },
              { path: 'secrets', element: <SettingsSecrets /> },
              { path: 'ai', element: <Navigate to="/app/blockdata-admin/ai-providers" replace /> },
              { path: 'ai/:providerId', element: <Navigate to="/app/blockdata-admin/ai-providers" replace /> },
              { path: 'model-roles', element: <Navigate to="/app/blockdata-admin/model-roles" replace /> },
              { path: 'mcp', element: <Navigate to="/app/blockdata-admin/mcp" replace /> },
              { path: 'connections', element: <Navigate to="/app/blockdata-admin/connections" replace /> },
              { path: 'grid-sample', element: <SettingsGridSample /> },
              { path: 'admin', element: <Navigate to="/app/blockdata-admin/instance-config" replace /> },
              { path: 'admin/:category', element: <LegacySettingsAdminRedirect /> },
            ],
          },

          // Agents + MCP (config surfaces; execution deferred)
          {
            path: '/app/agents',
            element: featureFlags.agentsConfigUI ? <Agents /> : <Navigate to="/app/settings" replace />,
          },
          {
            path: '/app/agents/preview',
            element: <ModelRegistrationPreview />,
          },
          {
            path: '/app/onboarding/agents',
            element: featureFlags.agentsConfigUI ? <AgentOnboarding /> : <Navigate to="/app/settings" replace />,
          },
          {
            path: '/app/onboarding/agents/select',
            element: featureFlags.agentsConfigUI ? <AgentOnboardingSelect /> : <Navigate to="/app/settings" replace />,
          },
          {
            path: '/app/onboarding/agents/auth/:agentSlug',
            element: featureFlags.agentsConfigUI ? <AgentOnboardingAuth /> : <Navigate to="/app/settings" replace />,
          },
          {
            path: '/app/onboarding/agents/connect/:agentSlug/:authMethod',
            element: featureFlags.agentsConfigUI ? <AgentOnboardingConnect /> : <Navigate to="/app/settings" replace />,
          },
          // /app/mcp removed â€” MCP now lives at /app/blockdata-admin/mcp
          { path: '/app/mcp', element: <Navigate to="/app/blockdata-admin/mcp" replace /> },
          {
            path: '/app/commands',
            element: featureFlags.commandsUI ? <Commands /> : <Navigate to="/app/settings" replace />,
          },

          { path: '*', element: <NotFound /> },
        ],
      },
      // Admin shell â€” separate from AppLayout, no inherited header/rail
      {
        element: <FlowsShellLayout />,
        children: [
          {
            path: '/app/flows/:namespace/:flowId/:tab?',
            element: <FlowDetail />,
          },
        ],
      },
      {
        path: '/app/superuser/parsers-docling',
        element: <Navigate to="/app/blockdata-admin/parsers-docling" replace />,
      },
      {
        path: '/app/superuser/instance-config',
        element: <Navigate to="/app/blockdata-admin/instance-config" replace />,
      },
      {
        path: '/app/superuser/worker-config',
        element: <Navigate to="/app/blockdata-admin/worker-config" replace />,
      },
      {
        path: '/app/superuser/audit',
        element: <Navigate to="/app/blockdata-admin/audit" replace />,
      },
      {
        path: '/app/superuser/api-endpoints',
        element: <Navigate to="/app/blockdata-admin/api-endpoints" replace />,
      },
      {
        path: '/app/superuser/test-integrations',
        element: <Navigate to="/app/blockdata-admin/test-integrations" replace />,
      },
      {
        path: '/app/superuser/ai-providers',
        element: <Navigate to="/app/blockdata-admin/ai-providers" replace />,
      },
      {
        path: '/app/superuser/ai-providers/:providerId',
        element: <Navigate to="/app/blockdata-admin/ai-providers" replace />,
      },
      {
        path: '/app/superuser/model-roles',
        element: <Navigate to="/app/blockdata-admin/model-roles" replace />,
      },
      {
        path: '/app/superuser/connections',
        element: <Navigate to="/app/blockdata-admin/connections" replace />,
      },
      {
        path: '/app/superuser/mcp',
        element: <Navigate to="/app/blockdata-admin/mcp" replace />,
      },
      {
        path: '/app/blockdata-admin',
        element: <BlockdataAdminGuard />,
        children: [
          {
            element: <AdminShellLayout />,
            children: [
              { index: true, lazy: () => import('@/pages/superuser/SuperuserWorkspace') },
              { path: 'parsers-docling', lazy: () => import('@/pages/settings/DoclingConfigPanel') },
              { path: 'instance-config', lazy: () => import('@/pages/superuser/SuperuserInstanceConfig') },
              { path: 'worker-config', lazy: () => import('@/pages/superuser/SuperuserWorkerConfig') },
              { path: 'audit', lazy: () => import('@/pages/superuser/SuperuserAuditHistory') },
              { path: 'api-endpoints', lazy: () => import('@/pages/superuser/SuperuserApiEndpoints') },
              { path: 'test-integrations', lazy: () => import('@/pages/superuser/TestIntegrations') },
              { path: 'ai-providers', element: <SettingsAiOverview /> },
              { path: 'ai-providers/:providerId', element: <SettingsProviderForm /> },
              { path: 'model-roles', element: <SettingsModelRoles /> },
              { path: 'connections', element: <ConnectionsPanel /> },
              { path: 'mcp', element: <McpServers /> },
            ],
          },
        ],
      },
      {
        path: '/app/agchain-admin',
        element: <AgchainAdminGuard />,
        children: [
          {
            element: <AdminShellLayout />,
            children: [
              { index: true, element: <Navigate to="/app/agchain-admin/models" replace /> },
              {
                path: 'models',
                lazy: async () => ({ Component: (await import('@/pages/admin/AgchainAdminModelsPage')).default }),
              },
            ],
          },
        ],
      },
      {
        path: '/app/superuser',
        element: <SuperuserGuard />,
        children: [
          {
            element: <AdminShellLayout />,
            children: [
              { index: true, element: <Navigate to="/app/superuser/operational-readiness" replace /> },
              { path: 'operational-readiness', lazy: () => import('@/pages/superuser/SuperuserOperationalReadiness') },
              { path: 'design-layout-captures', lazy: () => import('@/pages/superuser/DesignLayoutCaptures') },
              { path: 'plan-tracker', lazy: () => import('@/pages/superuser/PlanTracker') },
            ],
          },
        ],
      },
      {
        element: <AgchainShellLayout />,
        children: [
          {
            path: '/app/agchain',
            children: [
              {
                index: true,
                element: <AgchainIndexRedirect />,
              },
              {
                path: 'overview',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainOverviewPage')).default }),
              },
              {
                path: 'projects',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainProjectsPage')).default }),
              },
              {
                path: 'datasets',
                children: [
                  {
                    index: true,
                    lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainDatasetsPage')).default }),
                  },
                  {
                    path: 'new',
                    lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainDatasetCreatePage')).default }),
                  },
                  {
                    path: ':datasetId',
                    lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainDatasetDetailPage')).default }),
                  },
                  {
                    path: ':datasetId/versions/new/:draftId',
                    lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainDatasetVersionDraftPage')).default }),
                  },
                ],
              },
              {
                path: 'prompts',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainPromptsPage')).default }),
              },
              {
                path: 'scorers',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainScorersPage')).default }),
              },
              {
                path: 'parameters',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainParametersPage')).default }),
              },
              {
                path: 'tools',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainToolsPage')).default }),
              },
              {
                path: 'benchmarks',
                element: <Navigate to="/app/agchain/settings/project/benchmark-definition" replace />,
              },
              {
                path: 'benchmarks/:benchmarkId',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainBenchmarkWorkbenchPage')).default }),
              },
              {
                path: 'models',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainModelsPage')).default }),
              },
              {
                path: 'runs',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainRunsPage')).default }),
              },
              {
                path: 'results',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainResultsPage')).default }),
              },
              {
                path: 'observability',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainObservabilityPage')).default }),
              },
              {
                path: 'settings',
                children: [
                  {
                    index: true,
                    lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainSettingsPage')).default }),
                  },
                  {
                    path: 'organization/members',
                    lazy: async () => ({ Component: (await import('@/pages/agchain/settings/AgchainOrganizationMembersPage')).default }),
                  },
                  {
                    path: 'organization/permission-groups',
                    lazy: async () => ({ Component: (await import('@/pages/agchain/settings/AgchainPermissionGroupsPage')).default }),
                  },
                  {
                    path: 'organization/api-keys',
                    lazy: agchainSettingsPlaceholderRoute({
                      scope: 'organization',
                      title: 'Organization API Keys',
                      description: 'Organization-owned API credentials and shared issuance policies will live here.',
                      note: 'This scoped settings page is visible now so the settings information architecture stays stable as organization-owned credentials arrive.',
                    }),
                  },
                  {
                    path: 'organization/ai-providers',
                    lazy: agchainSettingsPlaceholderRoute({
                      scope: 'organization',
                      title: 'Organization AI Providers',
                      description: 'Shared provider defaults and organization-owned model access policies will live here.',
                      note: 'This section remains visible so future organization-level provider controls do not require reshaping the AGChain settings shell.',
                    }),
                  },
                  {
                    path: 'project/general',
                    lazy: agchainSettingsPlaceholderRoute({
                      scope: 'project',
                      title: 'Project General',
                      description: 'Project-level identity, defaults, and descriptive metadata will converge here.',
                      note: 'Benchmark definition remains the live project-level settings child page in this implementation wave.',
                    }),
                  },
                  {
                    path: 'project/members',
                    lazy: agchainSettingsPlaceholderRoute({
                      scope: 'project',
                      title: 'Project Members',
                      description: 'Project-specific membership overlays and participation controls will live here.',
                      note: 'This page is visible now to lock the project settings taxonomy before project-level access overlays are implemented.',
                    }),
                  },
                  {
                    path: 'project/access',
                    lazy: agchainSettingsPlaceholderRoute({
                      scope: 'project',
                      title: 'Project Access',
                      description: 'Project-specific access rules, sharing posture, and exceptions will live here.',
                      note: 'Organization-level permission groups land first. Project-specific access controls remain a later batch.',
                    }),
                  },
                  {
                    path: 'project/benchmark-definition',
                    lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainBenchmarksPage')).default }),
                  },
                  {
                    path: 'personal/preferences',
                    lazy: agchainSettingsPlaceholderRoute({
                      scope: 'personal',
                      title: 'Personal Preferences',
                      description: 'AGChain-specific user defaults, shortcuts, and local preferences will live here.',
                      note: 'This page stays visible so user-scoped controls do not get absorbed into organization or project settings.',
                    }),
                  },
                  {
                    path: 'personal/credentials',
                    lazy: agchainSettingsPlaceholderRoute({
                      scope: 'personal',
                      title: 'Personal Credentials',
                      description: 'User-owned AGChain credentials and per-user provider overrides will live here.',
                      note: 'Global account settings remain outside AGChain. This surface is reserved for AGChain-specific personal credentials only.',
                    }),
                  },
                ],
              },
              // Removed routes â€” redirect to nearest equivalent
              { path: 'build',     element: <Navigate to="/app/agchain/settings/project/benchmark-definition" replace /> },
              { path: 'artifacts', element: <Navigate to="/app/agchain/observability" replace /> },
            ],
          },
        ],
      },
    ],
  },
  // Catch-all 404 for routes outside /app
  { path: '*', element: <NotFound /> },
]);


```

## `web/src/router.admin-surfaces.test.ts`

Note: Route-level regression test proving the admin shell is not mounted before the surface guards.

```ts
import { describe, expect, it, vi } from 'vitest';
import { AdminShellLayout } from '@/components/layout/AdminShellLayout';
import { router } from '@/router';
import { AgchainAdminGuard, BlockdataAdminGuard, SuperuserGuard } from '@/pages/superuser/SuperuserGuard';

vi.mock('react-pdf-highlighter', () => ({
  AreaHighlight: () => null,
  Highlight: () => null,
  PdfHighlighter: () => null,
  PdfLoader: () => null,
  Popup: () => null,
}));

vi.mock('react-pdf-highlighter/dist/style.css', () => ({}));

type RouteNode = {
  path?: string;
  children?: RouteNode[];
  element?: unknown;
};

function getElementType(route: RouteNode): unknown {
  if (!route.element || typeof route.element !== 'object' || !('type' in route.element)) {
    return null;
  }
  return (route.element as { type?: unknown }).type ?? null;
}

function findRouteChain(routes: RouteNode[], targetPath: string, ancestors: RouteNode[] = []): RouteNode[] | null {
  for (const route of routes) {
    const chain = [...ancestors, route];
    if (route.path === targetPath) {
      return chain;
    }
    if (route.children) {
      const match = findRouteChain(route.children, targetPath, chain);
      if (match) return match;
    }
  }
  return null;
}

function expectGuardOutsideAdminShell(path: string, expectedGuard: unknown) {
  const chain = findRouteChain(router.routes as RouteNode[], path);
  expect(chain, `expected to find route ${path}`).not.toBeNull();
  const resolvedChain = chain!;

  expect(getElementType(resolvedChain.at(-1)!)).toBe(expectedGuard);
  expect(resolvedChain.slice(0, -1).map(getElementType)).not.toContain(AdminShellLayout);
}

describe('admin surface route ancestry', () => {
  it('keeps Blockdata Admin guarded before the admin shell mounts', () => {
    expectGuardOutsideAdminShell('/app/blockdata-admin', BlockdataAdminGuard);
  });

  it('keeps AGChain Admin guarded before the admin shell mounts', () => {
    expectGuardOutsideAdminShell('/app/agchain-admin', AgchainAdminGuard);
  });

  it('keeps Superuser guarded before the admin shell mounts', () => {
    expectGuardOutsideAdminShell('/app/superuser', SuperuserGuard);
  });
});
```

## `web/src/components/layout/AdminShellLayout.tsx`

Note: Admin shell chrome. Included so the evaluator can verify shell placement relative to the guards.

```tsx
import { useCallback, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { AdminLeftNav, getAdminNavSections, getSecondaryNav } from '@/components/admin/AdminLeftNav';
import { LeftRailShadcn as AdminChromeRail } from '@/components/shell/LeftRailShadcn';
import { styleTokens } from '@/lib/styleTokens';

const SIDEBAR_WIDTH_KEY = 'blockdata.shell.sidebar_width';
const ADMIN_SECONDARY_RAIL_WIDTH = 184;

export function AdminShellLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, profile, signOut } = useAuth();
  const hasSecondaryRail = getSecondaryNav(pathname).length > 0;
  const navSections = getAdminNavSections(pathname);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return styleTokens.shell.navbarWidth;
    const stored = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) {
        return Math.max(styleTokens.shell.navbarMinWidth, Math.min(parsed, styleTokens.shell.navbarMaxWidth));
      }
    }
    return styleTokens.shell.navbarWidth;
  });
  const isResizingRef = useRef(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleResizeStart = useCallback((event: ReactMouseEvent) => {
    event.preventDefault();
    isResizingRef.current = true;
    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(
        styleTokens.shell.navbarMinWidth,
        Math.min(startWidth + delta, styleTokens.shell.navbarMaxWidth),
      );
      setSidebarWidth(nextWidth);
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setSidebarWidth((width) => {
        window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
        return width;
      });
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth]);

  const mainStyle: CSSProperties = {
    position: 'absolute',
    insetBlock: 0,
    insetInlineEnd: 0,
    insetInlineStart: hasSecondaryRail
      ? `${sidebarWidth + ADMIN_SECONDARY_RAIL_WIDTH}px`
      : `${sidebarWidth}px`,
    overflow: 'auto',
    backgroundColor: 'var(--background)',
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-foreground">
      <aside
        data-testid="admin-platform-rail"
        style={{
          position: 'fixed',
          insetInlineStart: 0,
          insetBlock: 0,
          width: `${sidebarWidth}px`,
          borderInlineEnd: '1px solid var(--border)',
          backgroundColor: 'var(--chrome, var(--background))',
          zIndex: 20,
        }}
      >
        <AdminChromeRail
          userLabel={profile?.display_name || profile?.email || user?.email}
          onSignOut={handleSignOut}
          disableAutoDrill
          navSections={navSections}
        />
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            insetInlineEnd: -2,
            width: 4,
            cursor: 'col-resize',
            zIndex: 21,
          }}
          className="group"
        >
          <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-primary/30" />
        </div>
      </aside>

      {hasSecondaryRail && (
        <aside
          style={{
            position: 'fixed',
            insetBlock: 0,
            insetInlineStart: `${sidebarWidth}px`,
            width: `${ADMIN_SECONDARY_RAIL_WIDTH}px`,
            zIndex: 19,
          }}
        >
          <AdminLeftNav />
        </aside>
      )}

      <main style={mainStyle}>
        <div data-testid="admin-shell-frame" className="h-full min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

## `web/src/components/layout/__tests__/AdminShellLayout.test.tsx`

Note: Smoke coverage for the admin shell frame and secondary rail behavior.

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { AdminShellLayout } from '../AdminShellLayout';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'jon@example.com' },
    profile: null,
    signOut: vi.fn(),
  }),
}));

vi.mock('@/components/shell/LeftRailShadcn', () => ({
  LeftRailShadcn: () => <div data-testid="mock-platform-rail-content">platform rail</div>,
}));

afterEach(cleanup);

function renderWithRouter(path = '/app/superuser') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/superuser/*" element={<AdminShellLayout />}>
          <Route index element={<div data-testid="outlet-child">outlet</div>} />
          <Route path="*" element={<div data-testid="outlet-child">outlet</div>} />
        </Route>
        <Route path="/app/blockdata-admin/*" element={<AdminShellLayout />}>
          <Route index element={<div data-testid="outlet-child">outlet</div>} />
          <Route path="*" element={<div data-testid="outlet-child">outlet</div>} />
        </Route>
        <Route path="/app/agchain-admin/*" element={<AdminShellLayout />}>
          <Route index element={<div data-testid="outlet-child">outlet</div>} />
          <Route path="*" element={<div data-testid="outlet-child">outlet</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminShellLayout', () => {
  it('renders the platform rail and main area on the index route', () => {
    renderWithRouter();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('admin-platform-rail')).toBeInTheDocument();
  });

  it('does not render the secondary rail on routes without secondary nav', () => {
    renderWithRouter('/app/superuser/operational-readiness');
    expect(screen.queryByTestId('admin-secondary-rail')).not.toBeInTheDocument();
  });

  it('renders the secondary rail on routes with secondary nav', () => {
    renderWithRouter('/app/blockdata-admin/instance-config');
    expect(screen.getByTestId('admin-secondary-rail')).toBeInTheDocument();
  });

  it('renders the outlet inside the admin workspace frame', () => {
    renderWithRouter();
    expect(screen.getByTestId('admin-shell-frame')).toBeInTheDocument();
  });

  it('renders the outlet child', () => {
    renderWithRouter();
    expect(screen.getByTestId('outlet-child')).toBeInTheDocument();
  });
});
```

## `web/src/components/admin/AdminLeftNav.tsx`

Note: Admin surface navigation definitions and secondary rail logic. Included because route/surface identity flows through pathname here.

```tsx
/* eslint-disable react-refresh/only-export-components */
import { Link, useLocation } from 'react-router-dom';
import {
  IconServer,
  IconSettings,
  IconClipboardList,
  IconCode,
  IconTestPipe,
  IconCamera,
  IconKey,
  IconWand,
  IconDatabase,
  IconPlugConnected,
  type Icon,
} from '@tabler/icons-react';

export type AdminNavItem = {
  label: string;
  icon: Icon;
  path: string;
  drillId?: string;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

export const BLOCKDATA_ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    label: 'CONFIG',
    items: [
      { label: 'Instance', icon: IconServer, path: '/app/blockdata-admin/instance-config' },
      { label: 'Workers', icon: IconServer, path: '/app/blockdata-admin/worker-config' },
      { label: 'Docling', icon: IconSettings, path: '/app/blockdata-admin/parsers-docling' },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { label: 'AI Providers', icon: IconKey, path: '/app/blockdata-admin/ai-providers' },
      { label: 'Model Roles', icon: IconWand, path: '/app/blockdata-admin/model-roles' },
      { label: 'Connections', icon: IconDatabase, path: '/app/blockdata-admin/connections' },
      { label: 'MCP Servers', icon: IconPlugConnected, path: '/app/blockdata-admin/mcp' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Audit History', icon: IconClipboardList, path: '/app/blockdata-admin/audit' },
      { label: 'API Endpoints', icon: IconCode, path: '/app/blockdata-admin/api-endpoints' },
      { label: 'Test Integrations', icon: IconTestPipe, path: '/app/blockdata-admin/test-integrations' },
    ],
  },
];

export const SUPERUSER_NAV_SECTIONS: AdminNavSection[] = [
  {
    label: 'DEV ONLY',
    items: [
      { label: 'Operational Readiness', icon: IconServer, path: '/app/superuser/operational-readiness' },
      { label: 'Layout Captures', icon: IconCamera, path: '/app/superuser/design-layout-captures' },
      { label: 'Plan Tracker', icon: IconClipboardList, path: '/app/superuser/plan-tracker' },
    ],
  },
];

export const AGCHAIN_ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    label: '',
    items: [
      { label: 'Models', icon: IconWand, path: '/app/agchain-admin/models' },
    ],
  },
];

export function getAdminNavSections(pathname: string): AdminNavSection[] {
  if (pathname.startsWith('/app/blockdata-admin')) return BLOCKDATA_ADMIN_NAV_SECTIONS;
  if (pathname.startsWith('/app/agchain-admin')) return AGCHAIN_ADMIN_NAV_SECTIONS;
  return SUPERUSER_NAV_SECTIONS;
}

/* ------------------------------------------------------------------ */
/*  Per-page secondary rail menus (former third rails)                 */
/* ------------------------------------------------------------------ */

type SecondaryItem = { label: string; href: string };
type SecondarySection = { label: string; items: SecondaryItem[] };

const INSTANCE_SECTIONS: SecondarySection[] = [
  {
    label: 'INSTANCE',
    items: [
      { label: 'Jobs', href: '#jobs' },
      { label: 'Workers', href: '#workers' },
      { label: 'Registries', href: '#registries' },
      { label: 'Alerts', href: '#alerts' },
      { label: 'Observability', href: '#observability' },
      { label: 'Secret Storage', href: '#secret-storage' },
    ],
  },
];

const WORKER_SECTIONS: SecondarySection[] = [
  {
    label: 'WORKER',
    items: [
      { label: 'Batching', href: '#batching' },
      { label: 'Queue Claims', href: '#queue' },
      { label: 'General', href: '#general' },
    ],
  },
];

export function getSecondaryNav(pathname: string): SecondarySection[] {
  if (pathname.startsWith('/app/blockdata-admin/instance-config')) return INSTANCE_SECTIONS;
  if (pathname.startsWith('/app/blockdata-admin/worker-config')) return WORKER_SECTIONS;
  return [];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminLeftNav() {
  const { pathname, hash } = useLocation();
  const sections = getSecondaryNav(pathname);

  return (
    <nav
      aria-label="Admin secondary navigation"
      data-testid="admin-secondary-rail"
      className="flex h-full w-[184px] min-w-[184px] flex-col overflow-y-auto overflow-x-hidden border-r border-sidebar-border px-2 py-3"
      style={{ backgroundColor: 'var(--sidebar-accent)' }}
    >
      {sections.length === 0 ? (
        <div className="px-2.5 py-2 text-xs text-sidebar-foreground/40" />
      ) : (
        <div className="flex flex-1 flex-col gap-4 px-1 pb-2">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
                {section.label}
              </p>
              {section.items.map((item, idx) => {
                const isHash = item.href.startsWith('#');
                const firstHashIdx = section.items.findIndex((i) => i.href.startsWith('#'));
                const isActive = isHash
                  ? hash ? hash === item.href : idx === firstHashIdx
                  : pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.href}
                    to={isHash ? `${pathname}${item.href}` : item.href}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'flex items-center rounded-md px-2.5 py-2 text-[13px] transition-colors',
                      isActive
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-sidebar-foreground/72 hover:bg-background/60 hover:text-foreground',
                    ].join(' ')}
                  >
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
```

## `web/src/pages/settings/SettingsAdmin.tsx`

Note: Legacy admin settings consumer of admin-config payload. Included because the actor field rename had to stay type-consistent here.

```tsx
import { Field } from '@ark-ui/react/field';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { cn } from '@/lib/utils';
import { edgeFetch } from '@/lib/edge';
import { InstanceConfigPanel } from './InstanceConfigPanel';
import { WorkerConfigPanel } from './WorkerConfigPanel';
import { CATEGORY_IDS, type CategoryId } from './settings-tabs';

type AuditRow = {
  audit_id: number;
  policy_key: string;
  old_value: unknown;
  new_value: unknown;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
};

type AdminConfigResponse = {
  blockdata_admin: { user_id: string; email: string };
  audit: AuditRow[];
};

type Category = {
  id: CategoryId;
  label: string;
};

const CATEGORIES: Category[] = [
  { id: 'instance-config', label: 'Instance Config' },
  { id: 'worker-config', label: 'Worker Config' },
  { id: 'audit', label: 'Audit History' },
];

function toCategoryId(value: string | undefined): CategoryId | null {
  if (!value) return null;
  return CATEGORY_IDS.includes(value as CategoryId) ? (value as CategoryId) : null;
}

function formatTimestamp(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function stringifyValue(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2);
  return serialized ?? 'null';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function summarizePreviewValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value.length > 28 ? `${value.slice(0, 28)}...` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return '{...}';
  return String(value);
}

function summarizeAuditChange(row: AuditRow): string {
  const oldRecord = asRecord(row.old_value);
  const newRecord = asRecord(row.new_value);

  if (oldRecord && newRecord) {
    const keys = Array.from(new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]));
    const changedKeys = keys.filter((key) => JSON.stringify(oldRecord[key]) !== JSON.stringify(newRecord[key]));
    if (changedKeys.length === 0) return 'No value delta';

    const key = changedKeys[0];
    if (!key) return 'No value delta';
    const oldPreview = summarizePreviewValue(oldRecord[key]);
    const newPreview = summarizePreviewValue(newRecord[key]);
    const extraCount = changedKeys.length - 1;
    return extraCount > 0
      ? `${key}: ${oldPreview} -> ${newPreview} (+${extraCount} more)`
      : `${key}: ${oldPreview} -> ${newPreview}`;
  }

  const oldPreview = summarizePreviewValue(row.old_value);
  const newPreview = summarizePreviewValue(row.new_value);
  if (oldPreview === newPreview) return 'No value delta';
  return `${oldPreview} -> ${newPreview}`;
}

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

type AuditTimeRange = '24h' | '7d' | '30d' | 'all';

function isAuditRowInRange(changedAt: string, range: AuditTimeRange): boolean {
  if (range === 'all') return true;
  const timestamp = new Date(changedAt).getTime();
  if (Number.isNaN(timestamp)) return true;
  const now = Date.now();
  const rangeMs = range === '24h'
    ? 24 * 60 * 60 * 1000
    : range === '7d'
      ? 7 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;
  return now - timestamp <= rangeMs;
}

export default function SettingsAdmin() {
  useShellHeaderTitle({ title: 'Admin', breadcrumbs: ['Settings', 'Admin'] });
  const { category } = useParams<{ category?: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState<string>('all');
  const [auditRangeFilter, setAuditRangeFilter] = useState<AuditTimeRange>('7d');
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);

  const auditActorOptions = useMemo(() => {
    const actors = Array.from(new Set(
      auditRows
        .map((row) => row.changed_by?.trim() ?? '')
        .filter((value) => value.length > 0),
    )).sort((a, b) => a.localeCompare(b));
    return ['all', ...actors];
  }, [auditRows]);

  const filteredAuditRows = useMemo(() => {
    const query = auditSearch.trim().toLowerCase();
    return auditRows.filter((row) => {
      if (!isAuditRowInRange(row.changed_at, auditRangeFilter)) return false;
      if (auditActorFilter !== 'all' && (row.changed_by ?? '') !== auditActorFilter) return false;
      if (!query) return true;

      const haystack = [
        row.policy_key,
        row.changed_by ?? '',
        row.reason ?? '',
        summarizeAuditChange(row),
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [auditActorFilter, auditRangeFilter, auditRows, auditSearch]);

  const selectedAuditRow = useMemo(() => {
    if (filteredAuditRows.length === 0) return null;
    if (selectedAuditId !== null) {
      const found = filteredAuditRows.find((row) => row.audit_id === selectedAuditId);
      if (found) return found;
    }
    return filteredAuditRows[0] ?? null;
  }, [filteredAuditRows, selectedAuditId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await edgeFetch('admin-config?audit_limit=100', { method: 'GET' });
      const text = await resp.text();
      let payload: { error?: string } | AdminConfigResponse = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // Keep raw text fallback below.
      }

      if (!resp.ok) {
        // Non-superusers get 403 â€” skip audit data but don't block panels
        setAuditRows([]);
        setLoading(false);
        return;
      }

      const data = payload as AdminConfigResponse;
      setAuditRows(data.audit);
    } catch {
      // Failed to load admin config â€” panels still render, audit tab is empty
      setAuditRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedCategory = useMemo(() => toCategoryId(category), [category]);

  const selectedCategoryDef = useMemo(() => {
    if (!selectedCategory) return null;
    return CATEGORIES.find((c) => c.id === selectedCategory) ?? null;
  }, [selectedCategory]);

  if (!selectedCategory) {
    return <Navigate to="/app/settings/admin/instance-config" replace />;
  }

  return (
    <div className="flex h-full min-h-0 gap-0 overflow-hidden">
      {/* Category side rail */}
      <nav className="w-44 shrink-0 border-r border-border pr-2">
        <ScrollArea>
          <ul className="space-y-0.5 py-1">
            {CATEGORIES.map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/app/settings/admin/${cat.id}`)}
                  className={cn(
                    'flex w-full items-center rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                    cat.id === selectedCategory
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </nav>

      {/* Content area */}
      <div className="min-w-0 flex-1 overflow-hidden">
        {error && <ErrorAlert message={error} />}
        {loading && !error && (
          <p className="p-4 text-sm text-muted-foreground">Loading admin configuration...</p>
        )}

        {!loading && !error && selectedCategoryDef && (
          <>
            {selectedCategory === 'instance-config' ? (
              <div className="h-full overflow-hidden">
                <InstanceConfigPanel />
              </div>
            ) : selectedCategory === 'worker-config' ? (
              <div className="h-full overflow-hidden">
                <WorkerConfigPanel />
              </div>
            ) : selectedCategory === 'audit' ? (
              <ScrollArea className="h-full" contentClass="p-3 md:p-4">
                <div className="space-y-4">
                  <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_220px_130px_auto]">
                    <Field.Root>
                      <Field.Input
                        className={inputClass}
                        value={auditSearch}
                        onChange={(event) => setAuditSearch(event.currentTarget.value)}
                        placeholder="Search policy, actor, reason, change"
                      />
                    </Field.Root>
                    <select
                      className={inputClass}
                      value={auditActorFilter}
                      onChange={(event) => setAuditActorFilter(event.currentTarget.value)}
                    >
                      {auditActorOptions.map((actor) => (
                        <option key={actor} value={actor}>
                          {actor === 'all' ? 'All actors' : actor}
                        </option>
                      ))}
                    </select>
                    <select
                      className={inputClass}
                      value={auditRangeFilter}
                      onChange={(event) => setAuditRangeFilter(event.currentTarget.value as AuditTimeRange)}
                    >
                      <option value="24h">Last 24h</option>
                      <option value="7d">Last 7d</option>
                      <option value="30d">Last 30d</option>
                      <option value="all">All time</option>
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAuditSearch('');
                        setAuditActorFilter('all');
                        setAuditRangeFilter('7d');
                      }}
                    >
                      Reset filters
                    </Button>
                  </div>

                  <ScrollArea className="rounded-md border border-border">
                    <table className="min-w-full border-collapse text-left text-xs">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">When</th>
                          <th className="px-3 py-2 font-medium">Policy</th>
                          <th className="px-3 py-2 font-medium">Actor</th>
                          <th className="px-3 py-2 font-medium">Reason</th>
                          <th className="px-3 py-2 font-medium">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAuditRows.map((row) => {
                          const selected = selectedAuditRow?.audit_id === row.audit_id;
                          return (
                            <tr
                              key={row.audit_id}
                              className={cn(
                                'cursor-pointer border-t border-border align-top hover:bg-accent/40',
                                selected && 'bg-accent/55',
                              )}
                              onClick={() => setSelectedAuditId(row.audit_id)}
                            >
                              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                                {formatTimestamp(row.changed_at)}
                              </td>
                              <td className="px-3 py-2 font-medium text-foreground">{row.policy_key}</td>
                              <td className="px-3 py-2 text-muted-foreground">{row.changed_by ?? 'system'}</td>
                              <td className="max-w-[320px] truncate px-3 py-2 text-muted-foreground" title={row.reason ?? ''}>
                                {row.reason?.trim() || '-'}
                              </td>
                              <td className="max-w-[420px] truncate px-3 py-2 text-foreground" title={summarizeAuditChange(row)}>
                                {summarizeAuditChange(row)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </ScrollArea>

                  {filteredAuditRows.length === 0 && (
                    <p className="text-sm text-muted-foreground">No audit entries match current filters.</p>
                  )}

                  {selectedAuditRow && (
                    <article className="rounded-lg border border-border bg-background p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{selectedAuditRow.policy_key}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatTimestamp(selectedAuditRow.changed_at)}
                            {' Â· '}
                            {selectedAuditRow.changed_by ?? 'system'}
                            {' Â· '}
                            audit_id={selectedAuditRow.audit_id}
                          </p>
                        </div>
                        <span className="rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground">
                          {summarizeAuditChange(selectedAuditRow)}
                        </span>
                      </div>

                      {selectedAuditRow.reason?.trim() && (
                        <p className="mt-3 text-sm text-foreground">{selectedAuditRow.reason}</p>
                      )}

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">Old</p>
                          <textarea
                            readOnly
                            rows={14}
                            className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground"
                            value={stringifyValue(selectedAuditRow.old_value)}
                          />
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">New</p>
                          <textarea
                            readOnly
                            rows={14}
                            className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground"
                            value={stringifyValue(selectedAuditRow.new_value)}
                          />
                        </div>
                      </div>
                    </article>
                  )}
                </div>
              </ScrollArea>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
```

## `web/src/pages/superuser/SuperuserAuditHistory.tsx`

Note: Blockdata Admin audit-history consumer of admin-config payload. Included for the same contract-alignment reason.

```tsx
import { Field } from '@ark-ui/react/field';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SelectRoot, SelectControl, SelectTrigger, SelectValueText, SelectContent, SelectItem, SelectItemText, createListCollection } from '@/components/ui/select';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { cn } from '@/lib/utils';
import { edgeFetch } from '@/lib/edge';

type AuditRow = {
  audit_id: number;
  policy_key: string;
  old_value: unknown;
  new_value: unknown;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
};

type AdminConfigResponse = {
  blockdata_admin: { user_id: string; email: string };
  audit: AuditRow[];
};

type AuditTimeRange = '24h' | '7d' | '30d' | 'all';

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

function formatTimestamp(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function stringifyValue(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2);
  return serialized ?? 'null';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function summarizePreviewValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value.length > 28 ? `${value.slice(0, 28)}...` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return '{...}';
  return String(value);
}

function summarizeAuditChange(row: AuditRow): string {
  const oldRecord = asRecord(row.old_value);
  const newRecord = asRecord(row.new_value);

  if (oldRecord && newRecord) {
    const keys = Array.from(new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]));
    const changedKeys = keys.filter((key) => JSON.stringify(oldRecord[key]) !== JSON.stringify(newRecord[key]));
    if (changedKeys.length === 0) return 'No value delta';

    const key = changedKeys[0];
    if (!key) return 'No value delta';
    const oldPreview = summarizePreviewValue(oldRecord[key]);
    const newPreview = summarizePreviewValue(newRecord[key]);
    const extraCount = changedKeys.length - 1;
    return extraCount > 0
      ? `${key}: ${oldPreview} -> ${newPreview} (+${extraCount} more)`
      : `${key}: ${oldPreview} -> ${newPreview}`;
  }

  const oldPreview = summarizePreviewValue(row.old_value);
  const newPreview = summarizePreviewValue(row.new_value);
  if (oldPreview === newPreview) return 'No value delta';
  return `${oldPreview} -> ${newPreview}`;
}

function isAuditRowInRange(changedAt: string, range: AuditTimeRange): boolean {
  if (range === 'all') return true;
  const timestamp = new Date(changedAt).getTime();
  if (Number.isNaN(timestamp)) return true;
  const now = Date.now();
  const rangeMs = range === '24h'
    ? 24 * 60 * 60 * 1000
    : range === '7d'
      ? 7 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;
  return now - timestamp <= rangeMs;
}

export function Component() {
  useShellHeaderTitle({ title: 'Audit History', breadcrumbs: ['Blockdata Admin', 'Audit History'] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState<string>('all');
  const [auditRangeFilter, setAuditRangeFilter] = useState<AuditTimeRange>('7d');
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);

  const auditActorOptions = useMemo(() => {
    const actors = Array.from(new Set(
      auditRows
        .map((row) => row.changed_by?.trim() ?? '')
        .filter((value) => value.length > 0),
    )).sort((a, b) => a.localeCompare(b));
    return ['all', ...actors];
  }, [auditRows]);

  const filteredAuditRows = useMemo(() => {
    const query = auditSearch.trim().toLowerCase();
    return auditRows.filter((row) => {
      if (!isAuditRowInRange(row.changed_at, auditRangeFilter)) return false;
      if (auditActorFilter !== 'all' && (row.changed_by ?? '') !== auditActorFilter) return false;
      if (!query) return true;

      const haystack = [
        row.policy_key,
        row.changed_by ?? '',
        row.reason ?? '',
        summarizeAuditChange(row),
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [auditActorFilter, auditRangeFilter, auditRows, auditSearch]);

  const selectedAuditRow = useMemo(() => {
    if (filteredAuditRows.length === 0) return null;
    if (selectedAuditId !== null) {
      const found = filteredAuditRows.find((row) => row.audit_id === selectedAuditId);
      if (found) return found;
    }
    return filteredAuditRows[0] ?? null;
  }, [filteredAuditRows, selectedAuditId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await edgeFetch('admin-config?audit_limit=100', { method: 'GET' });
        const text = await resp.text();
        let payload: { error?: string } | AdminConfigResponse = {};
        try {
          payload = text ? JSON.parse(text) : {};
        } catch {
          // Keep raw text fallback below.
        }

        if (!resp.ok) {
          throw new Error(typeof payload === 'object' && payload && 'error' in payload ? payload.error ?? 'Failed to load audit history' : 'Failed to load audit history');
        }

        const data = payload as AdminConfigResponse;
        setAuditRows(Array.isArray(data.audit) ? data.audit : []);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : String(nextError));
        setAuditRows([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <div className="min-w-0 h-full overflow-hidden">
        {error && <ErrorAlert message={error} />}
        {loading && !error && (
          <p className="p-4 text-sm text-muted-foreground">Loading audit history...</p>
        )}

        {!loading && !error && (
          <ScrollArea className="h-full" contentClass="p-3 md:p-4">
            <div className="space-y-4">
              <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_220px_130px_auto]">
                <Field.Root>
                  <Field.Input
                    className={inputClass}
                    value={auditSearch}
                    onChange={(event) => setAuditSearch(event.currentTarget.value)}
                    placeholder="Search policy, actor, reason, change"
                  />
                </Field.Root>
                <SelectRoot
                  collection={createListCollection({
                    items: auditActorOptions.map((actor) => ({
                      label: actor === 'all' ? 'All actors' : actor,
                      value: actor,
                    })),
                  })}
                  value={[auditActorFilter]}
                  onValueChange={(details) => {
                    const val = details.value[0];
                    if (val) setAuditActorFilter(val);
                  }}
                >
                  <SelectControl>
                    <SelectTrigger className={inputClass}>
                      <SelectValueText />
                    </SelectTrigger>
                  </SelectControl>
                  <SelectContent>
                    {auditActorOptions.map((actor) => (
                      <SelectItem key={actor} item={{ label: actor === 'all' ? 'All actors' : actor, value: actor }}>
                        <SelectItemText>{actor === 'all' ? 'All actors' : actor}</SelectItemText>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
                <SelectRoot
                  collection={createListCollection({
                    items: [
                      { label: 'Last 24h', value: '24h' },
                      { label: 'Last 7d', value: '7d' },
                      { label: 'Last 30d', value: '30d' },
                      { label: 'All time', value: 'all' },
                    ],
                  })}
                  value={[auditRangeFilter]}
                  onValueChange={(details) => {
                    const val = details.value[0];
                    if (val) setAuditRangeFilter(val as AuditTimeRange);
                  }}
                >
                  <SelectControl>
                    <SelectTrigger className={inputClass}>
                      <SelectValueText />
                    </SelectTrigger>
                  </SelectControl>
                  <SelectContent>
                    <SelectItem item={{ label: 'Last 24h', value: '24h' }}><SelectItemText>Last 24h</SelectItemText></SelectItem>
                    <SelectItem item={{ label: 'Last 7d', value: '7d' }}><SelectItemText>Last 7d</SelectItemText></SelectItem>
                    <SelectItem item={{ label: 'Last 30d', value: '30d' }}><SelectItemText>Last 30d</SelectItemText></SelectItem>
                    <SelectItem item={{ label: 'All time', value: 'all' }}><SelectItemText>All time</SelectItemText></SelectItem>
                  </SelectContent>
                </SelectRoot>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAuditSearch('');
                    setAuditActorFilter('all');
                    setAuditRangeFilter('7d');
                  }}
                >
                  Reset filters
                </Button>
              </div>

              <ScrollArea className="rounded-md border border-border">
                <table className="min-w-full border-collapse text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">When</th>
                      <th className="px-3 py-2 font-medium">Policy</th>
                      <th className="px-3 py-2 font-medium">Actor</th>
                      <th className="px-3 py-2 font-medium">Reason</th>
                      <th className="px-3 py-2 font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditRows.map((row) => {
                      const selected = selectedAuditRow?.audit_id === row.audit_id;
                      return (
                        <tr
                          key={row.audit_id}
                          className={cn(
                            'cursor-pointer border-t border-border align-top hover:bg-accent/40',
                            selected && 'bg-accent/55',
                          )}
                          onClick={() => setSelectedAuditId(row.audit_id)}
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                            {formatTimestamp(row.changed_at)}
                          </td>
                          <td className="px-3 py-2 font-medium text-foreground">{row.policy_key}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.changed_by ?? 'system'}</td>
                          <td className="max-w-[320px] truncate px-3 py-2 text-muted-foreground" title={row.reason ?? ''}>
                            {row.reason?.trim() || '-'}
                          </td>
                          <td className="max-w-[420px] truncate px-3 py-2 text-foreground" title={summarizeAuditChange(row)}>
                            {summarizeAuditChange(row)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>

              {filteredAuditRows.length === 0 && (
                <p className="text-sm text-muted-foreground">No audit entries match current filters.</p>
              )}

              {selectedAuditRow && (
                <article className="rounded-lg border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{selectedAuditRow.policy_key}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatTimestamp(selectedAuditRow.changed_at)}
                        {' | '}
                        {selectedAuditRow.changed_by ?? 'system'}
                        {' | '}
                        audit_id={selectedAuditRow.audit_id}
                      </p>
                    </div>
                    <span className="rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground">
                      {summarizeAuditChange(selectedAuditRow)}
                    </span>
                  </div>

                  {selectedAuditRow.reason?.trim() && (
                    <p className="mt-3 text-sm text-foreground">{selectedAuditRow.reason}</p>
                  )}

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Old</p>
                      <textarea
                        readOnly
                        rows={14}
                        className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground"
                        value={stringifyValue(selectedAuditRow.old_value)}
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">New</p>
                      <textarea
                        readOnly
                        rows={14}
                        className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground"
                        value={stringifyValue(selectedAuditRow.new_value)}
                      />
                    </div>
                  </div>
                </article>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
```

