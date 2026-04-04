# Admin Surface Split Code Bundle

Current contents of the files touched for the admin-surface split implementation and the subsequent auth/visibility fixes.

Generated on 2026-04-04.

Included files: 31

## `supabase/migrations/20260404153000_registry_admin_surface_profiles.sql`

```sql
-- Admin surface registry split
-- Purpose:
-- - Create separate designated-email registries for Blockdata Admin and AGChain Admin.
-- - Preserve the existing email-based gating pattern used by registry_superuser_profiles.
-- - Backfill current active superusers into both new registries for rollout continuity.

CREATE TABLE IF NOT EXISTS public.registry_blockdata_admin_profiles (
  blockdata_admin_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  email_normalized TEXT GENERATED ALWAYS AS (lower(btrim(email))) STORED,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_name TEXT,
  notes TEXT,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT registry_blockdata_admin_profiles_email_not_blank CHECK (btrim(email) <> '')
);

COMMENT ON TABLE public.registry_blockdata_admin_profiles IS
  'Registry of designated Blockdata Admin identities. Access is granted by normalized email match.';

CREATE UNIQUE INDEX IF NOT EXISTS registry_blockdata_admin_profiles_email_normalized_idx
  ON public.registry_blockdata_admin_profiles (email_normalized);

CREATE INDEX IF NOT EXISTS registry_blockdata_admin_profiles_active_idx
  ON public.registry_blockdata_admin_profiles (is_active, email_normalized);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_registry_blockdata_admin_profiles_updated_at'
  ) THEN
    CREATE TRIGGER set_registry_blockdata_admin_profiles_updated_at
    BEFORE UPDATE ON public.registry_blockdata_admin_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.registry_blockdata_admin_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.registry_blockdata_admin_profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.registry_blockdata_admin_profiles TO service_role;

CREATE TABLE IF NOT EXISTS public.registry_agchain_admin_profiles (
  agchain_admin_profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  email_normalized TEXT GENERATED ALWAYS AS (lower(btrim(email))) STORED,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_name TEXT,
  notes TEXT,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT registry_agchain_admin_profiles_email_not_blank CHECK (btrim(email) <> '')
);

COMMENT ON TABLE public.registry_agchain_admin_profiles IS
  'Registry of designated AGChain Admin identities. Access is granted by normalized email match.';

CREATE UNIQUE INDEX IF NOT EXISTS registry_agchain_admin_profiles_email_normalized_idx
  ON public.registry_agchain_admin_profiles (email_normalized);

CREATE INDEX IF NOT EXISTS registry_agchain_admin_profiles_active_idx
  ON public.registry_agchain_admin_profiles (is_active, email_normalized);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_registry_agchain_admin_profiles_updated_at'
  ) THEN
    CREATE TRIGGER set_registry_agchain_admin_profiles_updated_at
    BEFORE UPDATE ON public.registry_agchain_admin_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.registry_agchain_admin_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.registry_agchain_admin_profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.registry_agchain_admin_profiles TO service_role;

INSERT INTO public.registry_blockdata_admin_profiles (email, is_active, display_name, notes, granted_by, created_at, updated_at)
SELECT
  email,
  true,
  display_name,
  COALESCE(notes, 'Backfilled from registry_superuser_profiles during admin surface split'),
  granted_by,
  created_at,
  updated_at
FROM public.registry_superuser_profiles
WHERE is_active = true
ON CONFLICT (email_normalized) DO NOTHING;

INSERT INTO public.registry_agchain_admin_profiles (email, is_active, display_name, notes, granted_by, created_at, updated_at)
SELECT
  email,
  true,
  display_name,
  COALESCE(notes, 'Backfilled from registry_superuser_profiles during admin surface split'),
  granted_by,
  created_at,
  updated_at
FROM public.registry_superuser_profiles
WHERE is_active = true
ON CONFLICT (email_normalized) DO NOTHING;
```

## `supabase/functions/_shared/superuser.ts`

```ts
import { createAdminClient, createUserClient } from "./supabase.ts";

export type SuperuserContext = {
  userId: string;
  email: string;
};

type UserClient = ReturnType<typeof createUserClient>;
type AdminClient = ReturnType<typeof createAdminClient>;

type SuperuserDeps = {
  createUserClient: (authHeader: string | null) => UserClient;
  createAdminClient: () => AdminClient;
};

const defaultDeps: SuperuserDeps = {
  createUserClient,
  createAdminClient,
};

type RegistryAccessOptions = {
  registryTable: string;
  notConfiguredMessage: string;
  forbiddenMessage: string;
};

async function requireRegistryAccess(
  req: Request,
  options: RegistryAccessOptions,
  deps: SuperuserDeps = defaultDeps,
): Promise<SuperuserContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization header");

  const supabase = deps.createUserClient(authHeader);
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`Invalid auth: ${error.message}`);

  const user = data.user;
  if (!user?.id) throw new Error("Invalid auth: no user");
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) throw new Error("Authenticated user has no email");

  const admin = deps.createAdminClient();

  const { data: anyActiveRows, error: anyActiveError } = await admin
    .from(options.registryTable)
    .select("email_normalized")
    .eq("is_active", true)
    .limit(1);
  if (anyActiveError) {
    throw new Error(`Failed to load registry access: ${anyActiveError.message}`);
  }
  if (!anyActiveRows || anyActiveRows.length === 0) {
    throw new Error(options.notConfiguredMessage);
  }

  const { data: matchingRows, error: matchError } = await admin
    .from(options.registryTable)
    .select("email_normalized")
    .eq("email_normalized", email)
    .eq("is_active", true)
    .limit(1);
  if (matchError) {
    throw new Error(`Failed to evaluate registry access: ${matchError.message}`);
  }
  if (!matchingRows || matchingRows.length === 0) {
    throw new Error(options.forbiddenMessage);
  }

  return {
    userId: user.id,
    email,
  };
}

export async function requireSuperuser(
  req: Request,
  deps: SuperuserDeps = defaultDeps,
): Promise<SuperuserContext> {
  return requireRegistryAccess(
    req,
    {
      registryTable: "registry_superuser_profiles",
      notConfiguredMessage: "Superuser access is not configured",
      forbiddenMessage: "Forbidden: superuser access required",
    },
    deps,
  );
}

export async function requireBlockdataAdmin(
  req: Request,
  deps: SuperuserDeps = defaultDeps,
): Promise<SuperuserContext> {
  return requireRegistryAccess(
    req,
    {
      registryTable: "registry_blockdata_admin_profiles",
      notConfiguredMessage: "Blockdata Admin access is not configured",
      forbiddenMessage: "Forbidden: blockdata admin access required",
    },
    deps,
  );
}

export async function requireAgchainAdmin(
  req: Request,
  deps: SuperuserDeps = defaultDeps,
): Promise<SuperuserContext> {
  return requireRegistryAccess(
    req,
    {
      registryTable: "registry_agchain_admin_profiles",
      notConfiguredMessage: "AGChain Admin access is not configured",
      forbiddenMessage: "Forbidden: agchain admin access required",
    },
    deps,
  );
}
```

## `supabase/functions/_shared/superuser.test.ts`

```ts
import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { requireAgchainAdmin, requireBlockdataAdmin, requireSuperuser } from "./superuser.ts";

type RegistryRow = {
  email_normalized: string;
  is_active: boolean;
};

function createAdminClientWithRows(rows: RegistryRow[], expectedTable = "registry_superuser_profiles") {
  return {
    from(table: string) {
      assertEquals(table, expectedTable);
      return {
        select(column: string) {
          assertEquals(column, "email_normalized");
          const filters = new Map<string, unknown>();
          return {
            eq(column: string, value: unknown) {
              filters.set(column, value);
              return this;
            },
            limit(limitValue: number) {
              const data = rows
                .filter((row) =>
                  Array.from(filters.entries()).every(([column, value]) =>
                    (row as Record<string, unknown>)[column] === value
                  )
                )
                .slice(0, limitValue);
              return Promise.resolve({ data, error: null });
            },
          };
        },
      };
    },
  };
}

function createUserClientForEmail(email: string) {
  return {
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: { id: "user-1", email } },
          error: null,
        }),
    },
  };
}

Deno.test("requireSuperuser rejects when registry_superuser_profiles has no active rows", async () => {
  const req = new Request("https://example.com/functions/v1/admin-config", {
    headers: { Authorization: "Bearer test-token" },
  });

  await assertRejects(
    () =>
      requireSuperuser(req, {
        createUserClient: () => createUserClientForEmail("admin@example.com") as never,
        createAdminClient: () => createAdminClientWithRows([]) as never,
      }),
    Error,
    "Superuser access is not configured",
  );
});

Deno.test("requireSuperuser accepts an active designated email from registry_superuser_profiles", async () => {
  const req = new Request("https://example.com/functions/v1/admin-config", {
    headers: { Authorization: "Bearer test-token" },
  });

  const result = await requireSuperuser(req, {
    createUserClient: () => createUserClientForEmail("Admin@Example.com") as never,
      createAdminClient: () =>
        createAdminClientWithRows([
          {
            email_normalized: "admin@example.com",
            is_active: true,
          },
        ]) as never,
  });

  assertEquals(result.userId, "user-1");
  assertEquals(result.email, "admin@example.com");
});

Deno.test("requireSuperuser rejects authenticated users not present in registry_superuser_profiles", async () => {
  const req = new Request("https://example.com/functions/v1/admin-config", {
    headers: { Authorization: "Bearer test-token" },
  });

  await assertRejects(
    () =>
      requireSuperuser(req, {
        createUserClient: () => createUserClientForEmail("viewer@example.com") as never,
        createAdminClient: () =>
          createAdminClientWithRows([
            {
              email_normalized: "admin@example.com",
              is_active: true,
            },
          ]) as never,
      }),
    Error,
    "Forbidden: superuser access required",
  );
});

Deno.test("requireBlockdataAdmin accepts an active designated email from registry_blockdata_admin_profiles", async () => {
  const req = new Request("https://example.com/functions/v1/admin-config", {
    headers: { Authorization: "Bearer test-token" },
  });

  const result = await requireBlockdataAdmin(req, {
    createUserClient: () => createUserClientForEmail("Admin@Example.com") as never,
      createAdminClient: () =>
        createAdminClientWithRows(
          [
            {
              email_normalized: "admin@example.com",
              is_active: true,
            },
          ],
          "registry_blockdata_admin_profiles",
      ) as never,
  });

  assertEquals(result.userId, "user-1");
  assertEquals(result.email, "admin@example.com");
});

Deno.test("requireAgchainAdmin accepts an active designated email from registry_agchain_admin_profiles", async () => {
  const req = new Request("https://example.com/functions/v1/admin-config", {
    headers: { Authorization: "Bearer test-token" },
  });

  const result = await requireAgchainAdmin(req, {
    createUserClient: () => createUserClientForEmail("Admin@Example.com") as never,
    createAdminClient: () =>
      createAdminClientWithRows(
        [
          {
            email_normalized: "admin@example.com",
            is_active: true,
          },
        ],
        "registry_agchain_admin_profiles",
      ) as never,
  });

  assertEquals(result.userId, "user-1");
  assertEquals(result.email, "admin@example.com");
});
```

## `supabase/functions/admin-config/index.ts`

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

function parseAuditLimit(req: Request): number {
  const url = new URL(req.url);
  const raw = Number(url.searchParams.get("audit_limit") ?? "100");
  if (!Number.isFinite(raw)) return 100;
  return Math.min(Math.max(Math.floor(raw), 1), 500);
}

function parseUpdates(body: unknown): PolicyUpdate[] | null {
  if (body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).updates)) {
    const updates = (body as { updates: unknown[] }).updates;
    const parsed: PolicyUpdate[] = [];
    for (const item of updates) {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const policyKey = typeof obj.policy_key === "string" ? obj.policy_key.trim() : "";
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
    const policyKey = typeof obj.policy_key === "string" ? obj.policy_key.trim() : "";
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
  if (valueType === "integer") return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value);
  if (valueType === "number") return typeof value === "number" && Number.isFinite(value);
  if (valueType === "string") return typeof value === "string";
  if (valueType === "object") return !!value && typeof value === "object" && !Array.isArray(value);
  if (valueType === "array") return Array.isArray(value);
  return false;
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    const superuser = await requireBlockdataAdmin(req);
    const supabaseAdmin = createAdminClient();

    if (req.method === "GET") {
      const auditLimit = parseAuditLimit(req);
      const policyRows = await listAdminPolicyRows(supabaseAdmin);
      const { data: auditRows, error: auditErr } = await supabaseAdmin
        .from("admin_runtime_policy_audit")
        .select("audit_id, policy_key, old_value_jsonb, new_value_jsonb, changed_by, changed_at, reason")
        .order("changed_at", { ascending: false })
        .limit(auditLimit);
      if (auditErr && !auditErr.message.toLowerCase().includes("admin_runtime_policy_audit")) {
        return json(500, { error: `Failed to load policy audit: ${auditErr.message}` });
      }

      const runtimePolicy = await loadRuntimePolicy(supabaseAdmin);
      return json(200, {
        superuser: {
          user_id: superuser.userId,
          email: superuser.email,
        },
        policy_snapshot_preview: buildRuntimePolicySnapshot(runtimePolicy, new Date().toISOString()),
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
        return json(400, { error: "Invalid update payload. Provide policy_key/value or updates[]" });
      }

      const policyRows = await listAdminPolicyRows(supabaseAdmin);
      const rowByKey = new Map(policyRows.map((row) => [row.policy_key, row]));

      // Validate keys and value types first.
      for (const update of updates) {
        const row = rowByKey.get(update.policy_key);
        if (!row) {
          return json(400, { error: `Unknown policy key: ${update.policy_key}` });
        }
        if (!valueTypeMatches(update.value, row.value_type)) {
          return json(400, {
            error:
              `Type mismatch for ${update.policy_key}: expected ${row.value_type}, got ${typeof update.value}`,
          });
        }
      }

      // Build candidate policy and validate cross-field constraints before writes.
      const candidatePolicy = await loadRuntimePolicy(supabaseAdmin);
      for (const update of updates) {
        const ok = applyPolicyValue(candidatePolicy, update.policy_key, update.value);
        if (!ok) {
          return json(400, { error: `Invalid value for ${update.policy_key}` });
        }
      }
      const validationErrors = validateRuntimePolicy(candidatePolicy);
      if (validationErrors.length > 0) {
        return json(400, { error: "Policy validation failed", details: validationErrors });
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
            updated_by: superuser.userId,
          })
          .eq("policy_key", update.policy_key);
        if (updateErr) {
          return json(500, { error: `Failed to update ${update.policy_key}: ${updateErr.message}` });
        }

        const { error: auditErr } = await supabaseAdmin
          .from("admin_runtime_policy_audit")
          .insert({
            policy_key: update.policy_key,
            old_value_jsonb: oldValue,
            new_value_jsonb: newValue,
            changed_by: superuser.userId,
            reason: update.reason ?? null,
          });
        if (auditErr) {
          return json(500, { error: `Failed to write audit for ${update.policy_key}: ${auditErr.message}` });
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
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Missing Authorization header") || msg.startsWith("Invalid auth")) {
      return json(401, { error: msg });
    }
    if (msg.includes("Forbidden: superuser access required")) {
      return json(403, { error: msg });
    }
    if (msg.includes("Superuser access is not configured")) {
      return json(503, { error: msg });
    }
    return json(500, { error: msg });
  }
});
```

## `services/platform-api/app/auth/dependencies.py`

```python
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

## `services/platform-api/app/api/routes/auth_access.py`

```python
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

## `services/platform-api/app/api/routes/admin_config_docling.py`

```python
from __future__ import annotations

import logging
from time import perf_counter
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.dependencies import require_blockdata_admin
from app.auth.principals import AuthPrincipal
from app.infra.supabase_client import get_supabase_admin
from app.observability.admin_config_docling_metrics import (
    admin_config_docling_tracer,
    record_admin_config_docling_read,
    record_admin_config_docling_update,
)

logger = logging.getLogger("platform-api.admin-config-docling")

POLICY_KEY = "platform.docling_blocks_mode"
DEFAULT_DOCLING_BLOCKS_MODE = "raw_docling"
VALID_MODES = {"raw_docling"}

router = APIRouter(prefix="/admin/config/docling", tags=["admin-config-docling"])


class UpdateDoclingConfigRequest(BaseModel):
    docling_blocks_mode: str = Field(pattern=r"^(raw_docling)$")
    reason: str = Field(min_length=1)


def _read_docling_blocks_mode(supabase_admin: Any) -> dict[str, Any]:
    result = (
        supabase_admin.table("admin_runtime_policy")
        .select("policy_key, value_jsonb, updated_at, updated_by")
        .eq("policy_key", POLICY_KEY)
        .maybe_single()
        .execute()
    )
    row = result.data
    if row:
        value = row.get("value_jsonb", DEFAULT_DOCLING_BLOCKS_MODE)
        if value not in VALID_MODES:
            value = DEFAULT_DOCLING_BLOCKS_MODE
        return {
            "docling_blocks_mode": value,
            "updated_at": row.get("updated_at"),
            "updated_by": row.get("updated_by"),
        }
    return {"docling_blocks_mode": DEFAULT_DOCLING_BLOCKS_MODE}


def _update_docling_blocks_mode(
    supabase_admin: Any,
    *,
    actor_id: str,
    mode: str,
    reason: str,
) -> dict[str, Any]:
    current = (
        supabase_admin.table("admin_runtime_policy")
        .select("policy_key, value_jsonb")
        .eq("policy_key", POLICY_KEY)
        .maybe_single()
        .execute()
        .data
    )
    old_value = current.get("value_jsonb") if current else DEFAULT_DOCLING_BLOCKS_MODE

    update_result = (
        supabase_admin.table("admin_runtime_policy")
        .upsert(
            {
                "policy_key": POLICY_KEY,
                "value_jsonb": mode,
                "value_type": "string",
                "description": "Docling block presentation mode",
                "updated_by": actor_id,
            }
        )
        .execute()
    )

    row = (update_result.data or [None])[0]

    supabase_admin.table("admin_runtime_policy_audit").insert(
        {
            "policy_key": POLICY_KEY,
            "old_value_jsonb": old_value,
            "new_value_jsonb": mode,
            "changed_by": actor_id,
            "reason": reason.strip(),
        }
    ).execute()

    return {
        "docling_blocks_mode": mode,
        "updated_at": row.get("updated_at") if row else None,
        "updated_by": row.get("updated_by") if row else actor_id,
    }


@router.get("", openapi_extra={"x-required-role": "blockdata_admin"})
async def get_docling_config(
    auth: AuthPrincipal = Depends(require_blockdata_admin),
    supabase_admin=Depends(get_supabase_admin),
):
    _ = auth
    started = perf_counter()
    with admin_config_docling_tracer.start_as_current_span("admin.config.docling.read"):
        try:
            result = _read_docling_blocks_mode(supabase_admin)
            record_admin_config_docling_read(
                result="ok",
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=200,
            )
            return result
        except Exception:
            record_admin_config_docling_read(
                result="error",
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=500,
            )
            raise


@router.patch("", openapi_extra={"x-required-role": "blockdata_admin"})
async def patch_docling_config(
    payload: UpdateDoclingConfigRequest,
    auth: AuthPrincipal = Depends(require_blockdata_admin),
    supabase_admin=Depends(get_supabase_admin),
):
    started = perf_counter()
    with admin_config_docling_tracer.start_as_current_span("admin.config.docling.update"):
        try:
            result = _update_docling_blocks_mode(
                supabase_admin,
                actor_id=auth.user_id,
                mode=payload.docling_blocks_mode,
                reason=payload.reason,
            )
            logger.info(
                "admin.config.docling.updated",
                extra={
                    "actor_role": "blockdata_admin",
                    "policy_key": POLICY_KEY,
                    "old_value": None,
                    "new_value": payload.docling_blocks_mode,
                    "reason": payload.reason,
                },
            )
            record_admin_config_docling_update(
                result="ok",
                docling_blocks_mode=payload.docling_blocks_mode,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=200,
            )
            return result
        except Exception as exc:
            record_admin_config_docling_update(
                result="error",
                docling_blocks_mode=payload.docling_blocks_mode,
                duration_ms=(perf_counter() - started) * 1000.0,
                http_status_code=500,
            )
            logger.exception("Failed to update docling config")
            raise HTTPException(status_code=500, detail="Failed to update docling config") from exc
```

## `services/platform-api/app/api/routes/agchain_models.py`

```python
from __future__ import annotations

import logging
import time
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from opentelemetry import metrics, trace
from pydantic import BaseModel, Field

from app.auth.dependencies import require_agchain_admin, require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain import (
    connect_model_key,
    create_model_target,
    disconnect_model_key,
    list_model_targets,
    list_supported_providers,
    load_model_detail,
    refresh_model_target_health,
    resolve_provider_definition,
    update_model_target,
)
from app.observability.contract import safe_attributes, set_span_attributes

router = APIRouter(prefix="/agchain/models", tags=["agchain-models"])
logger = logging.getLogger("agchain-models")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

providers_list_counter = meter.create_counter("platform.agchain.models.providers.list.count")
models_list_counter = meter.create_counter("platform.agchain.models.list.count")
models_create_counter = meter.create_counter("platform.agchain.models.create.count")
models_update_counter = meter.create_counter("platform.agchain.models.update.count")
models_refresh_counter = meter.create_counter("platform.agchain.models.refresh_health.count")
models_connect_key_counter = meter.create_counter("platform.agchain.models.connect_key.count")
models_disconnect_key_counter = meter.create_counter("platform.agchain.models.disconnect_key.count")
models_list_duration_ms = meter.create_histogram("platform.agchain.models.list.duration_ms")
models_refresh_duration_ms = meter.create_histogram("platform.agchain.models.refresh_health.duration_ms")


class ModelTargetCreateRequest(BaseModel):
    label: str = Field(min_length=1)
    provider_slug: str = Field(min_length=1)
    provider_qualifier: str | None = None
    model_name: str = Field(min_length=1)
    qualified_model: str = Field(min_length=1)
    api_base: str | None = None
    auth_kind: str = Field(min_length=1)
    credential_source_jsonb: dict[str, Any] = Field(default_factory=dict)
    model_args_jsonb: dict[str, Any] = Field(default_factory=dict)
    supports_evaluated: bool = True
    supports_judge: bool = False
    capabilities_jsonb: dict[str, Any] = Field(default_factory=dict)
    probe_strategy: str = "provider_default"
    notes: str | None = None
    enabled: bool = True


class ModelTargetUpdateRequest(BaseModel):
    label: str | None = None
    api_base: str | None = None
    auth_kind: str | None = None
    credential_source_jsonb: dict[str, Any] | None = None
    model_args_jsonb: dict[str, Any] | None = None
    supports_evaluated: bool | None = None
    supports_judge: bool | None = None
    capabilities_jsonb: dict[str, Any] | None = None
    probe_strategy: str | None = None
    notes: str | None = None
    enabled: bool | None = None


class ConnectKeyRequest(BaseModel):
    api_key: str = Field(min_length=1)


@router.get("/providers", summary="List supported AG chain model providers")
async def list_supported_providers_route(auth: AuthPrincipal = Depends(require_user_auth)):
    with tracer.start_as_current_span("agchain.models.providers.list") as span:
        providers = list_supported_providers()
        attrs = {"row_count": len(providers)}
        set_span_attributes(span, attrs)
        providers_list_counter.add(1, safe_attributes(attrs))
        return {"items": providers}


@router.get("", summary="List AG chain model targets")
async def list_models(
    provider_slug: str | None = Query(default=None),
    compatibility: str | None = Query(default=None),
    health_status: str | None = Query(default=None),
    enabled: bool | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1),
    offset: int = Query(default=0, ge=0),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.models.list") as span:
        payload = list_model_targets(
            user_id=auth.user_id,
            provider_slug=provider_slug,
            compatibility=compatibility,
            health_status=health_status,
            enabled=enabled,
            search=search,
            limit=limit,
            offset=offset,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "filter.provider_slug_present": provider_slug is not None,
            "filter.compatibility": compatibility,
            "filter.health_status": health_status,
            "row_count": len(payload["items"]),
            "latency_ms": duration_ms,
        }
        metric_attrs = {key: value for key, value in safe_attributes(attrs).items() if value is not None}
        set_span_attributes(span, attrs)
        models_list_counter.add(1, metric_attrs)
        models_list_duration_ms.record(duration_ms, metric_attrs)
        return payload


@router.get("/{model_target_id}", summary="Get one AG chain model target")
async def get_model(
    model_target_id: UUID,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.models.get") as span:
        model_target_id_str = str(model_target_id)
        model_target, recent_health_checks = load_model_detail(
            user_id=auth.user_id,
            model_target_id=model_target_id_str,
        )
        if model_target is None:
            raise HTTPException(status_code=404, detail="AG chain model target not found")
        provider_definition = resolve_provider_definition(model_target["provider_slug"])
        set_span_attributes(
            span,
            {
                "provider_slug": model_target["provider_slug"],
                "auth_kind": model_target["auth_kind"],
                "health_status": model_target["health_status"],
            },
        )
        return {
            "model_target": model_target,
            "recent_health_checks": recent_health_checks,
            "provider_definition": provider_definition,
        }


@router.post("", summary="Create an AG chain model target")
async def create_model(
    body: ModelTargetCreateRequest,
    auth: AuthPrincipal = Depends(require_agchain_admin),
):
    with tracer.start_as_current_span("agchain.models.create") as span:
        model_target_id = create_model_target(user_id=auth.user_id, payload=body.model_dump())
        attrs = {
            "provider_slug": body.provider_slug,
            "auth_kind": body.auth_kind,
            "supports_evaluated": body.supports_evaluated,
            "supports_judge": body.supports_judge,
            "enabled": body.enabled,
        }
        set_span_attributes(span, attrs)
        models_create_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.models.created",
            extra={"model_target_id": model_target_id, "subject_id": auth.user_id, **safe_attributes(attrs)},
        )
        return {"ok": True, "model_target_id": model_target_id}


@router.patch("/{model_target_id}", summary="Update an AG chain model target")
async def patch_model(
    model_target_id: UUID,
    body: ModelTargetUpdateRequest,
    auth: AuthPrincipal = Depends(require_agchain_admin),
):
    with tracer.start_as_current_span("agchain.models.update") as span:
        model_target_id_str = str(model_target_id)
        model_target_id = update_model_target(
            user_id=auth.user_id,
            model_target_id=model_target_id_str,
            payload=body.model_dump(exclude_none=True),
        )
        attrs = {
            "enabled": body.enabled,
            "auth_kind": body.auth_kind,
            "probe_strategy": body.probe_strategy,
        }
        set_span_attributes(span, attrs)
        models_update_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.models.updated",
            extra={"model_target_id": model_target_id, "subject_id": auth.user_id, **safe_attributes(attrs)},
        )
        return {"ok": True, "model_target_id": model_target_id}


@router.post("/{model_target_id}/connect-key", summary="Connect an API key for a model target")
async def connect_model_key_route(
    model_target_id: UUID,
    body: ConnectKeyRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.models.connect_key") as span:
        model_target_id_str = str(model_target_id)
        outcome = connect_model_key(user_id=auth.user_id, model_target_id=model_target_id_str, api_key=body.api_key)
        attrs = {"provider_slug": outcome["provider_slug"], "result": "ok"}
        set_span_attributes(span, attrs)
        models_connect_key_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.models.key_connected",
            extra={
                "model_target_id": model_target_id_str,
                "provider_slug": outcome["provider_slug"],
                "key_suffix": outcome["key_suffix"],
                "result": "ok",
            },
        )
        return {"ok": True, "key_suffix": outcome["key_suffix"], "credential_status": outcome["credential_status"]}


@router.delete("/{model_target_id}/disconnect-key", summary="Disconnect API key for a model target")
async def disconnect_model_key_route(
    model_target_id: UUID,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.models.disconnect_key") as span:
        model_target_id_str = str(model_target_id)
        outcome = disconnect_model_key(user_id=auth.user_id, model_target_id=model_target_id_str)
        attrs = {"provider_slug": outcome["provider_slug"], "result": "ok"}
        set_span_attributes(span, attrs)
        models_disconnect_key_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.models.key_disconnected",
            extra={
                "model_target_id": model_target_id_str,
                "provider_slug": outcome["provider_slug"],
                "result": "ok",
            },
        )
        return {"ok": True, "credential_status": outcome["credential_status"]}


@router.post("/{model_target_id}/refresh-health", summary="Refresh health for an AG chain model target")
async def refresh_model_health(
    model_target_id: UUID,
    auth: AuthPrincipal = Depends(require_agchain_admin),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.models.refresh_health") as span:
        model_target_id_str = str(model_target_id)
        outcome = await refresh_model_target_health(
            user_id=auth.user_id,
            model_target_id=model_target_id_str,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "health_status": outcome["health_status"],
            "probe_strategy": outcome["probe_strategy"],
            "result": outcome["health_status"],
            "latency_ms": duration_ms,
        }
        set_span_attributes(span, attrs)
        models_refresh_counter.add(1, safe_attributes(attrs))
        models_refresh_duration_ms.record(duration_ms, safe_attributes(attrs))
        logger.info(
            "agchain.models.health_refreshed",
            extra={"model_target_id": model_target_id_str, "subject_id": auth.user_id, **safe_attributes(attrs)},
        )
        return {"ok": True, **outcome}
```

## `services/platform-api/app/main.py`

```python
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.domain.plugins.registry import discover_plugins, FUNCTION_NAME_MAP
from app.core.reserved_routes import check_collisions
from app.observability import configure_telemetry, shutdown_telemetry
from app.workers.agchain_operations import (
    start_agchain_operations_worker,
    stop_agchain_operations_worker,
)
from app.workers.conversion_pool import init_pool, shutdown_pool
from app.workers.pipeline_jobs import start_pipeline_jobs_worker, stop_pipeline_jobs_worker
from app.workers.storage_cleanup import start_storage_cleanup_worker, stop_storage_cleanup_worker

_logging_configured = False


class _OtelDefaultsFilter(logging.Filter):
    """Inject default otelTraceID/otelSpanID when not set by OTel instrumentation."""

    def filter(self, record):
        if not hasattr(record, "otelTraceID"):
            record.otelTraceID = "0"
        if not hasattr(record, "otelSpanID"):
            record.otelSpanID = "0"
        return True


def configure_logging(settings) -> None:
    """Set up root logger with trace-correlated format. Safe to call multiple times."""
    global _logging_configured
    if _logging_configured:
        return
    root = logging.getLogger()
    root.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    # Remove any existing handlers (e.g. from earlier basicConfig calls)
    for h in root.handlers[:]:
        root.removeHandler(h)
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(
        "%(asctime)s %(name)s %(levelname)s [trace=%(otelTraceID)s span=%(otelSpanID)s] %(message)s"
    ))
    handler.addFilter(_OtelDefaultsFilter())
    root.addHandler(handler)
    _logging_configured = True


logger = logging.getLogger("platform-api")


def _can_start_supabase_workers(settings) -> bool:
    if settings.supabase_url and settings.supabase_service_role_key:
        return True

    logger.warning(
        "Skipping background workers because SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set"
    )
    return False


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        discover_plugins()
        check_collisions(set(FUNCTION_NAME_MAP.keys()))
        count = len(FUNCTION_NAME_MAP)
        logger.info(f"Discovered {count} plugin functions. Collision check passed.")

        # Initialize conversion process pool
        pool = init_pool()
        logger.info(f"Conversion pool: {pool.status()}")

        # Start storage cleanup worker
        if _can_start_supabase_workers(settings):
            start_storage_cleanup_worker()
            start_pipeline_jobs_worker()
            if settings.agchain_operations_worker_enabled:
                start_agchain_operations_worker()

        yield

        # Shutdown background workers gracefully
        stop_agchain_operations_worker()
        stop_pipeline_jobs_worker()
        stop_storage_cleanup_worker()
        shutdown_pool()
        # Flush any pending telemetry spans
        telem_state = getattr(app.state, "telemetry", None)
        if telem_state:
            shutdown_telemetry(telem_state)
        logger.info("Conversion pool shut down.")

    app = FastAPI(title="Platform API", lifespan=lifespan)

    # Bootstrap OpenTelemetry (idempotent, no-ops when OTEL_ENABLED=false)
    app.state.telemetry = configure_telemetry(app, settings)

    # Auth middleware for /convert and /citations â€” runs BEFORE body parsing
    from app.auth.middleware import AuthBeforeBodyMiddleware
    app.add_middleware(AuthBeforeBodyMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.auth_redirect_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Route mounting order matters! ---
    # 1. Health routes (no auth)
    from app.api.routes.health import router as health_router
    app.include_router(health_router)

    # 2. Conversion and citations (middleware handles pre-body auth,
    #    Depends(require_auth) still runs for JWT validation + role assignment)
    from app.api.routes.conversion import router as conversion_router
    app.include_router(conversion_router)

    # 3. Admin routes (surface-specific admin roles required)
    from app.api.routes.admin_services import router as admin_router
    app.include_router(admin_router)
    from app.api.routes.admin_storage import router as admin_storage_router
    app.include_router(admin_storage_router)
    from app.api.routes.admin_runtime_readiness import router as admin_runtime_readiness_router
    app.include_router(admin_runtime_readiness_router)
    from app.api.routes.admin_config_docling import router as admin_config_docling_router
    app.include_router(admin_config_docling_router)

    # 4. Future /api/v1/* routes (stubs)
    from app.api.routes.crews import router as crews_router
    from app.api.routes.embeddings import router as embeddings_router
    from app.api.routes.jobs import router as jobs_router
    app.include_router(crews_router)
    app.include_router(embeddings_router)
    app.include_router(jobs_router)

    # 5. Functions listing
    from app.api.routes.functions import router as functions_router
    app.include_router(functions_router)

    # 5b. Connection management (user-scoped, before plugin catch-all)
    from app.api.routes.connections import router as connections_router
    app.include_router(connections_router)

    # 5c. Load orchestration (user-scoped, before plugin catch-all)
    from app.api.routes.load_runs import router as load_runs_router
    app.include_router(load_runs_router)

    # 5d. Parse orchestration (user-scoped, before plugin catch-all)
    try:
        from app.api.routes.parse import router as parse_router
        app.include_router(parse_router)
    except ImportError as e:
        logger.warning(f"Parse route disabled â€” missing dependency: {e}")

    # 5e. Storage quota and uploads (user-scoped, before plugin catch-all)
    from app.api.routes.storage import router as storage_router
    app.include_router(storage_router)

    # 5f. Pipeline services routes (user-scoped, before plugin catch-all)
    from app.api.routes.pipelines import router as pipelines_router
    app.include_router(pipelines_router)

    # 5g. Observability endpoints (superuser, before plugin catch-all)
    from app.api.routes.telemetry import router as telemetry_router
    app.include_router(telemetry_router)

    # 5h. User variables (user-scoped, before plugin catch-all)
    from app.api.routes.variables import router as variables_router
    app.include_router(variables_router)

    # 5h2. Canonical secrets surface (user-scoped, before plugin catch-all)
    from app.api.routes.secrets import router as secrets_router
    app.include_router(secrets_router)

    # 5i. OAuth observability endpoints (anonymous + superuser, before plugin catch-all)
    from app.api.routes.auth_oauth import router as auth_oauth_router
    app.include_router(auth_oauth_router)

    # 5i2. Auth access probe (authenticated, before plugin catch-all)
    from app.api.routes.auth_access import router as auth_access_router
    app.include_router(auth_access_router)

    # 5j. AG chain model registry (user + agchain admin, before plugin catch-all)
    from app.api.routes.agchain_models import router as agchain_models_router
    app.include_router(agchain_models_router)

    # 5k. AG chain workspace registry (user-scoped, before plugin catch-all)
    from app.api.routes.agchain_workspaces import router as agchain_workspaces_router
    app.include_router(agchain_workspaces_router)

    # 5k2. AG chain settings surface (user-scoped, before plugin catch-all)
    from app.api.routes.agchain_settings import router as agchain_settings_router
    app.include_router(agchain_settings_router)

    # 5l. AG chain dataset registry (user-scoped, before plugin catch-all)
    from app.api.routes.agchain_datasets import router as agchain_datasets_router
    app.include_router(agchain_datasets_router)

    # 5m. AG chain benchmark catalog (user-scoped, before plugin catch-all)
    from app.api.routes.agchain_benchmarks import router as agchain_benchmarks_router
    app.include_router(agchain_benchmarks_router)

    # 5n. AG chain tools surface (user-scoped, before plugin catch-all)
    from app.api.routes.agchain_tools import router as agchain_tools_router
    app.include_router(agchain_tools_router)

    # 5o. AG chain operations surface (user-scoped, before plugin catch-all)
    from app.api.routes.agchain_operations import router as agchain_operations_router
    app.include_router(agchain_operations_router)

    # 6. Plugin catch-all MUST be last
    from app.api.routes.plugin_execution import router as plugin_router
    app.include_router(plugin_router)

    return app


app = create_app()
```

## `services/platform-api/tests/test_auth.py`

```python
# services/platform-api/tests/test_auth.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient

from app.auth.principals import AuthPrincipal
from app.auth.dependencies import _check_blockdata_admin, require_auth, require_role


def test_auth_principal_has_role():
    p = AuthPrincipal(
        subject_type="machine",
        subject_id="conversion-service",
        roles=frozenset({"platform_admin"}),
        auth_source="m2m_bearer",
    )
    assert p.has_role("platform_admin") is True
    assert p.has_role("user") is False


def test_auth_principal_is_superuser():
    admin = AuthPrincipal(
        subject_type="machine",
        subject_id="m2m-caller",
        roles=frozenset({"platform_admin"}),
        auth_source="m2m_bearer",
    )
    assert admin.is_superuser is True

    user = AuthPrincipal(
        subject_type="user",
        subject_id="user-123",
        roles=frozenset({"authenticated"}),
        auth_source="supabase_jwt",
    )
    assert user.is_superuser is False


def test_m2m_bearer_auth(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "secret-token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {"subject_type": auth.subject_type, "subject_id": auth.subject_id}

    client = TestClient(app)

    # Valid bearer
    resp = client.get("/test", headers={"Authorization": "Bearer secret-token"})
    assert resp.status_code == 200
    assert resp.json()["subject_type"] == "machine"

    # Missing auth
    resp = client.get("/test")
    assert resp.status_code == 401

    # Wrong token
    resp = client.get("/test", headers={"Authorization": "Bearer wrong"})
    assert resp.status_code == 401

    get_settings.cache_clear()


def test_m2m_bearer_auth_does_not_require_supabase_config(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "secret-token")
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {"subject_type": auth.subject_type, "source": auth.auth_source}

    client = TestClient(app)

    resp = client.get("/test", headers={"Authorization": "Bearer secret-token"})
    assert resp.status_code == 200
    assert resp.json()["subject_type"] == "machine"
    assert resp.json()["source"] == "m2m_bearer"

    get_settings.cache_clear()


def test_legacy_header_auth(monkeypatch):
    monkeypatch.setenv("CONVERSION_SERVICE_KEY", "legacy-key")
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {"source": auth.auth_source}

    client = TestClient(app)
    resp = client.get("/test", headers={"X-Conversion-Service-Key": "legacy-key"})
    assert resp.status_code == 200
    assert resp.json()["source"] == "legacy_header"

    get_settings.cache_clear()


def test_supabase_jwt_auth_returns_500_when_supabase_config_missing(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "m2m-token")
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {"subject_type": auth.subject_type}

    client = TestClient(app)

    resp = client.get("/test", headers={"Authorization": "Bearer user-jwt-token"})
    assert resp.status_code == 500
    assert resp.json()["detail"] == "Server auth configuration error"

    get_settings.cache_clear()


def test_supabase_jwt_auth(monkeypatch):
    """Supabase JWT auth validates token via Supabase Auth API and checks superuser table."""
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "m2m-token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {
            "subject_type": auth.subject_type,
            "subject_id": auth.subject_id,
            "source": auth.auth_source,
            "roles": sorted(auth.roles),
        }

    client = TestClient(app)

    # Mock Supabase auth.get_user to return a valid user
    mock_user = MagicMock()
    mock_user.id = "user-abc-123"
    mock_user.email = "admin@example.com"
    mock_user.role = "authenticated"

    mock_response = MagicMock()
    mock_response.user = mock_user

    with patch("app.auth.dependencies._verify_supabase_jwt") as mock_verify:
        mock_verify.return_value = mock_user

        with patch("app.auth.dependencies._check_superuser") as mock_super:
            mock_super.return_value = True

            resp = client.get("/test", headers={"Authorization": "Bearer user-jwt-token"})
            assert resp.status_code == 200
            body = resp.json()
            assert body["subject_type"] == "user"
            assert body["subject_id"] == "user-abc-123"
            assert body["source"] == "supabase_jwt"
            assert "platform_admin" in body["roles"]

    get_settings.cache_clear()


def test_supabase_jwt_non_superuser(monkeypatch):
    """Non-superuser JWT gets authenticated role only."""
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "m2m-token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {"roles": sorted(auth.roles)}

    client = TestClient(app)

    mock_user = MagicMock()
    mock_user.id = "user-xyz"
    mock_user.email = "regular@example.com"
    mock_user.role = "authenticated"

    with patch("app.auth.dependencies._verify_supabase_jwt") as mock_verify:
        mock_verify.return_value = mock_user

        with patch("app.auth.dependencies._check_superuser") as mock_super:
            mock_super.return_value = False

            resp = client.get("/test", headers={"Authorization": "Bearer user-jwt"})
            assert resp.status_code == 200
            assert "platform_admin" not in resp.json()["roles"]
            assert "authenticated" in resp.json()["roles"]

    get_settings.cache_clear()


def test_supabase_jwt_auth_adds_blockdata_and_agchain_admin_roles(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "m2m-token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    @app.get("/test")
    async def test_route(auth: AuthPrincipal = Depends(require_auth)):
        return {"roles": sorted(auth.roles)}

    client = TestClient(app)

    mock_user = MagicMock()
    mock_user.id = "user-blockdata-admin"
    mock_user.email = "ops@example.com"
    mock_user.role = "authenticated"

    with patch("app.auth.dependencies._verify_supabase_jwt") as mock_verify:
        mock_verify.return_value = mock_user
        with (
            patch("app.auth.dependencies._check_superuser") as mock_super,
            patch("app.auth.dependencies._check_blockdata_admin") as mock_blockdata,
            patch("app.auth.dependencies._check_agchain_admin") as mock_agchain,
        ):
            mock_super.return_value = False
            mock_blockdata.return_value = True
            mock_agchain.return_value = True

            resp = client.get("/test", headers={"Authorization": "Bearer user-jwt"})
            assert resp.status_code == 200
            assert "authenticated" in resp.json()["roles"]
            assert "blockdata_admin" in resp.json()["roles"]
            assert "agchain_admin" in resp.json()["roles"]
            assert "platform_admin" not in resp.json()["roles"]

    get_settings.cache_clear()


def test_check_blockdata_admin_queries_generic_registry_columns(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key")

    from app.core.config import get_settings

    get_settings.cache_clear()

    select_calls = []

    class QueryBuilder:
        def select(self, column):
            select_calls.append(column)
            return self

        def eq(self, _column, _value):
            return self

        def limit(self, _limit):
            return self

        def execute(self):
            return MagicMock(data=[{"email_normalized": "jondev717@gmail.com"}])

    class AdminClient:
        def table(self, table_name):
            assert table_name == "registry_blockdata_admin_profiles"
            return QueryBuilder()

    with patch("supabase.create_client", return_value=AdminClient()):
        assert _check_blockdata_admin("jondev717@gmail.com") is True

    assert select_calls == ["email_normalized", "email_normalized"]

    get_settings.cache_clear()


def test_require_role_rejects_missing_role(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()
    admin_only = require_role("platform_admin")

    @app.get("/admin-test")
    async def admin_route(auth: AuthPrincipal = Depends(admin_only)):
        return {"ok": True}

    client = TestClient(app)
    # M2M tokens get platform_admin
    resp = client.get("/admin-test", headers={"Authorization": "Bearer token"})
    assert resp.status_code == 200

    get_settings.cache_clear()


def test_require_role_rejects_non_admin_user(monkeypatch):
    """A user JWT without superuser status gets 403 on admin routes."""
    monkeypatch.setenv("PLATFORM_API_M2M_TOKEN", "m2m-token")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake")

    from app.core.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()
    admin_only = require_role("platform_admin")

    @app.get("/admin-test")
    async def admin_route(auth: AuthPrincipal = Depends(admin_only)):
        return {"ok": True}

    client = TestClient(app)

    mock_user = MagicMock()
    mock_user.id = "user-xyz"
    mock_user.email = "regular@example.com"
    mock_user.role = "authenticated"

    with patch("app.auth.dependencies._verify_supabase_jwt") as mock_verify:
        mock_verify.return_value = mock_user
        with patch("app.auth.dependencies._check_superuser") as mock_super:
            mock_super.return_value = False
            resp = client.get("/admin-test", headers={"Authorization": "Bearer user-jwt"})
            assert resp.status_code == 403

    get_settings.cache_clear()
```

## `services/platform-api/tests/test_auth_access.py`

```python
from fastapi.testclient import TestClient

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.main import create_app


def _mock_access_principal():
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated", "blockdata_admin", "platform_admin"}),
        auth_source="test",
        email="admin@example.com",
    )


def test_auth_access_returns_surface_booleans():
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_access_principal
    client = TestClient(app)

    try:
        response = client.get("/auth/access")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "blockdata_admin": True,
        "agchain_admin": False,
        "superuser": True,
    }
```

## `services/platform-api/tests/test_agchain_models.py`

```python
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
import httpx

from app.auth.dependencies import require_agchain_admin, require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.model_registry import list_model_targets
from app.main import create_app

MODEL_ID = "11111111-1111-1111-1111-111111111111"
MISSING_MODEL_ID = "22222222-2222-2222-2222-222222222222"


def _mock_user_principal():
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated"}),
        auth_source="test",
        email="user@example.com",
    )


def _mock_agchain_admin_principal():
    return AuthPrincipal(
        subject_type="user",
        subject_id="user-1",
        roles=frozenset({"authenticated", "agchain_admin"}),
        auth_source="test",
        email="admin@example.com",
    )


def _reject_agchain_admin():
    raise HTTPException(status_code=403, detail="Role required: agchain_admin")


@pytest.fixture
def client():
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_user_principal
    app.dependency_overrides[require_agchain_admin] = _reject_agchain_admin
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def agchain_admin_client():
    app = create_app()
    app.dependency_overrides[require_user_auth] = _mock_user_principal
    app.dependency_overrides[require_agchain_admin] = _mock_agchain_admin_principal
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def unauthenticated_client():
    app = create_app()
    yield TestClient(app)


def test_list_supported_providers_returns_catalog(client):
    response = client.get("/agchain/models/providers")

    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert any(item["provider_slug"] == "openai" for item in body["items"])


def test_list_models_returns_rows_with_provider_metadata(client):
    rows = [
        {
            "model_target_id": "model-1",
            "label": "OpenAI GPT 5",
            "provider_slug": "openai",
            "provider_qualifier": None,
            "model_name": "gpt-5",
            "qualified_model": "openai/gpt-5",
            "api_base": "https://api.openai.com/v1",
            "auth_kind": "api_key",
            "supports_evaluated": True,
            "supports_judge": False,
            "capabilities_jsonb": {"tools": True},
            "enabled": True,
            "probe_strategy": "provider_default",
            "health_status": "healthy",
            "health_checked_at": "2026-03-26T12:00:00Z",
            "last_latency_ms": 250,
            "last_error_code": None,
            "last_error_message": None,
            "notes": None,
            "created_at": "2026-03-26T12:00:00Z",
            "updated_at": "2026-03-26T12:00:00Z",
        }
    ]

    with patch("app.api.routes.agchain_models.list_model_targets") as mock_list:
        mock_list.return_value = {
            "items": [
                {
                    "model_target_id": "model-1",
                    "label": "OpenAI GPT 5",
                    "provider_slug": "openai",
                    "provider_display_name": "OpenAI",
                    "provider_qualifier": None,
                    "model_name": "gpt-5",
                    "qualified_model": "openai/gpt-5",
                    "api_base_display": "https://api.openai.com/v1",
                    "auth_kind": "api_key",
                    "credential_status": "ready",
                    "enabled": True,
                    "supports_evaluated": True,
                    "supports_judge": False,
                    "capabilities": {"tools": True},
                    "health_status": "healthy",
                    "health_checked_at": "2026-03-26T12:00:00Z",
                    "last_latency_ms": 250,
                    "probe_strategy": "provider_default",
                    "notes": None,
                    "created_at": "2026-03-26T12:00:00Z",
                    "updated_at": "2026-03-26T12:00:00Z",
                }
            ],
            "total": 1,
            "limit": 50,
            "offset": 0,
        }
        response = client.get("/agchain/models")

    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["provider_slug"] == "openai"
    assert body["items"][0]["provider_display_name"] == "OpenAI"
    assert body["total"] == 1


def test_list_models_returns_paginated_envelope(client):
    with patch("app.api.routes.agchain_models.list_model_targets") as mock_list:
        mock_list.return_value = {
            "items": [
                {
                    "model_target_id": "model-1",
                    "label": "OpenAI GPT 5",
                    "provider_slug": "openai",
                    "provider_display_name": "OpenAI",
                    "provider_qualifier": None,
                    "model_name": "gpt-5",
                    "qualified_model": "openai/gpt-5",
                    "api_base_display": "https://api.openai.com/v1",
                    "auth_kind": "api_key",
                    "credential_status": "ready",
                    "enabled": True,
                    "supports_evaluated": True,
                    "supports_judge": False,
                    "capabilities": {"tools": True},
                    "health_status": "healthy",
                    "health_checked_at": "2026-03-26T12:00:00Z",
                    "last_latency_ms": 250,
                    "probe_strategy": "provider_default",
                    "notes": None,
                    "created_at": "2026-03-26T12:00:00Z",
                    "updated_at": "2026-03-26T12:00:00Z",
                }
            ],
            "total": 101,
            "limit": 50,
            "offset": 50,
        }

        response = client.get("/agchain/models?limit=50&offset=50")

    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["provider_slug"] == "openai"
    assert body["total"] == 101
    assert body["limit"] == 50
    assert body["offset"] == 50
    mock_list.assert_called_once_with(
        user_id="user-1",
        provider_slug=None,
        compatibility=None,
        health_status=None,
        enabled=None,
        search=None,
        limit=50,
        offset=50,
    )


def test_list_models_omits_null_filter_attrs_from_metrics(client):
    with (
        patch("app.api.routes.agchain_models.list_model_targets") as mock_list,
        patch("app.api.routes.agchain_models.models_list_counter.add") as mock_counter_add,
        patch("app.api.routes.agchain_models.models_list_duration_ms.record") as mock_duration_record,
    ):
        mock_list.return_value = {
            "items": [],
            "total": 0,
            "limit": 50,
            "offset": 0,
        }

        response = client.get("/agchain/models")

    assert response.status_code == 200
    mock_counter_add.assert_called_once()
    mock_duration_record.assert_called_once()
    counter_attrs = mock_counter_add.call_args.args[1]
    duration_attrs = mock_duration_record.call_args.args[1]
    assert counter_attrs["filter.provider_slug_present"] is False
    assert "filter.compatibility" not in counter_attrs
    assert "filter.health_status" not in counter_attrs
    assert duration_attrs["filter.provider_slug_present"] is False
    assert "filter.compatibility" not in duration_attrs
    assert "filter.health_status" not in duration_attrs


def test_get_model_returns_detail_and_recent_health_checks(client):
    row = {
        "model_target_id": MODEL_ID,
        "label": "OpenAI GPT 5",
        "provider_slug": "openai",
        "provider_qualifier": None,
        "model_name": "gpt-5",
        "qualified_model": "openai/gpt-5",
        "api_base": "https://api.openai.com/v1",
        "auth_kind": "api_key",
        "credential_source_jsonb": {"provider": "user_api_keys"},
        "model_args_jsonb": {},
        "supports_evaluated": True,
        "supports_judge": False,
        "capabilities_jsonb": {"tools": True},
        "enabled": True,
        "probe_strategy": "provider_default",
        "health_status": "healthy",
        "health_checked_at": "2026-03-26T12:00:00Z",
        "last_latency_ms": 250,
        "last_error_code": None,
        "last_error_message": None,
        "notes": None,
        "created_at": "2026-03-26T12:00:00Z",
        "updated_at": "2026-03-26T12:00:00Z",
    }
    checks = [
        {
            "health_check_id": "check-1",
            "model_target_id": MODEL_ID,
            "provider_slug": "openai",
            "probe_strategy": "provider_default",
            "status": "healthy",
            "latency_ms": 250,
            "error_code": None,
            "error_message": None,
            "checked_at": "2026-03-26T12:00:00Z",
            "metadata_jsonb": {},
        }
    ]

    with patch("app.api.routes.agchain_models.load_model_detail") as mock_load:
        mock_load.return_value = (row, checks)
        response = client.get(f"/agchain/models/{MODEL_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["model_target"]["model_target_id"] == MODEL_ID
    assert body["recent_health_checks"][0]["health_check_id"] == "check-1"


def test_get_model_returns_404_when_missing(client):
    with patch("app.api.routes.agchain_models.load_model_detail") as mock_load:
        mock_load.return_value = (None, [])
        response = client.get(f"/agchain/models/{MISSING_MODEL_ID}")

    assert response.status_code == 404


def test_create_model_requires_superuser(client):
    response = client.post(
        "/agchain/models",
        json={
            "label": "OpenAI GPT 5",
            "provider_slug": "openai",
            "provider_qualifier": None,
            "model_name": "gpt-5",
            "qualified_model": "openai/gpt-5",
            "auth_kind": "api_key",
            "credential_source_jsonb": {},
            "model_args_jsonb": {},
            "supports_evaluated": True,
            "supports_judge": False,
            "capabilities_jsonb": {},
            "probe_strategy": "provider_default",
            "notes": None,
            "enabled": True,
        },
    )

    assert response.status_code == 403


def test_create_model_creates_row_for_agchain_admin(agchain_admin_client):
    with patch("app.api.routes.agchain_models.create_model_target") as mock_create:
        mock_create.return_value = "model-1"
        response = agchain_admin_client.post(
            "/agchain/models",
            json={
                "label": "OpenAI GPT 5",
                "provider_slug": "openai",
                "provider_qualifier": None,
                "model_name": "gpt-5",
                "qualified_model": "openai/gpt-5",
                "auth_kind": "api_key",
                "credential_source_jsonb": {},
                "model_args_jsonb": {},
                "supports_evaluated": True,
                "supports_judge": False,
                "capabilities_jsonb": {},
                "probe_strategy": "provider_default",
                "notes": None,
                "enabled": True,
            },
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "model_target_id": "model-1"}


def test_patch_model_validates_provider_changes(agchain_admin_client):
    with patch("app.api.routes.agchain_models.update_model_target") as mock_update:
        mock_update.return_value = "model-1"
        response = agchain_admin_client.patch(
            f"/agchain/models/{MODEL_ID}",
            json={"label": "Updated label", "enabled": False},
        )

    assert response.status_code == 200
    assert response.json()["model_target_id"] == "model-1"


def test_refresh_health_writes_history_and_updates_status(agchain_admin_client):
    with patch("app.api.routes.agchain_models.refresh_model_target_health", new_callable=AsyncMock) as mock_refresh:
        mock_refresh.return_value = {
            "health_status": "healthy",
            "latency_ms": 123,
            "checked_at": "2026-03-26T12:00:00Z",
            "message": "probe ok",
            "probe_strategy": "http_openai_models",
        }
        response = agchain_admin_client.post(f"/agchain/models/{MODEL_ID}/refresh-health")

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "health_status": "healthy",
        "latency_ms": 123,
        "checked_at": "2026-03-26T12:00:00Z",
        "message": "probe ok",
        "probe_strategy": "http_openai_models",
    }


def test_connect_key_returns_masked_suffix_for_authenticated_user(client):
    with (
        patch("app.api.routes.agchain_models.connect_model_key", create=True) as mock_connect,
        patch("app.api.routes.agchain_models.logger.info") as mock_log,
    ):
        mock_connect.return_value = {
            "provider_slug": "openai",
            "key_suffix": "c123",
            "credential_status": "ready",
        }

        response = client.post(
            f"/agchain/models/{MODEL_ID}/connect-key",
            json={"api_key": "sk-test-abc123"},
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "key_suffix": "c123", "credential_status": "ready"}
    mock_connect.assert_called_once_with(user_id="user-1", model_target_id=MODEL_ID, api_key="sk-test-abc123")
    mock_log.assert_called_once_with(
        "agchain.models.key_connected",
        extra={
            "model_target_id": MODEL_ID,
            "provider_slug": "openai",
            "key_suffix": "c123",
            "result": "ok",
        },
    )


def test_connect_key_rejects_unauthenticated(unauthenticated_client):
    response = unauthenticated_client.post(
        f"/agchain/models/{MODEL_ID}/connect-key",
        json={"api_key": "sk-test-abc123"},
    )

    assert response.status_code == 401


def test_connect_key_rejects_non_api_key_auth_kind(client):
    with patch(
        "app.api.routes.agchain_models.connect_model_key",
        create=True,
        side_effect=HTTPException(status_code=422, detail="Model target auth_kind is 'service_account', not 'api_key'"),
    ):
        response = client.post(
            f"/agchain/models/{MODEL_ID}/connect-key",
            json={"api_key": "sk-test-abc123"},
        )

    assert response.status_code == 422


def test_disconnect_key_returns_missing_for_authenticated_user(client):
    with (
        patch("app.api.routes.agchain_models.disconnect_model_key", create=True) as mock_disconnect,
        patch("app.api.routes.agchain_models.logger.info") as mock_log,
    ):
        mock_disconnect.return_value = {
            "provider_slug": "openai",
            "credential_status": "missing",
        }

        response = client.delete(f"/agchain/models/{MODEL_ID}/disconnect-key")

    assert response.status_code == 200
    assert response.json() == {"ok": True, "credential_status": "missing"}
    mock_disconnect.assert_called_once_with(user_id="user-1", model_target_id=MODEL_ID)
    mock_log.assert_called_once_with(
        "agchain.models.key_disconnected",
        extra={
            "model_target_id": MODEL_ID,
            "provider_slug": "openai",
            "result": "ok",
        },
    )


class _RegistryQuery:
    def __init__(self, admin, table_name: str):
        self._admin = admin
        self._table_name = table_name
        self._filters: dict[str, object] = {}
        self._maybe_single = False

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, key, value):
        self._filters[key] = value
        return self

    def maybe_single(self):
        self._maybe_single = True
        return self

    def order(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def execute(self):
        self._admin.calls.append((self._table_name, dict(self._filters)))
        if self._table_name == "agchain_model_targets":
            rows = [
                row for row in self._admin.model_rows
                if all(row.get(key) == value for key, value in self._filters.items())
            ]
            data = rows[0] if self._maybe_single else rows
            return type("R", (), {"data": data})()
        if self._table_name == "user_api_keys":
            rows = [
                row for row in self._admin.api_keys
                if all(row.get(key) == value for key, value in self._filters.items())
            ]
            return type("R", (), {"data": rows})()
        if self._table_name == "user_provider_connections":
            rows = [
                row for row in self._admin.connections
                if all(row.get(key) == value for key, value in self._filters.items())
            ]
            return type("R", (), {"data": rows})()
        if self._table_name == "agchain_model_health_checks":
            return type("R", (), {"data": []})()
        raise AssertionError(f"unexpected table {self._table_name}")


class _RegistryAdmin:
    def __init__(self, model_rows, api_keys, connections):
        self.model_rows = model_rows
        self.api_keys = api_keys
        self.connections = connections
        self.calls: list[tuple[str, dict[str, object]]] = []

    def table(self, name):
        return _RegistryQuery(self, name)


class _MutableRegistryQuery:
    def __init__(self, admin, table_name: str):
        self._admin = admin
        self._table_name = table_name
        self._filters: dict[str, object] = {}
        self._maybe_single = False
        self._upsert_payload: dict[str, object] | None = None
        self._delete_mode = False

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, key, value):
        self._filters[key] = value
        return self

    def maybe_single(self):
        self._maybe_single = True
        return self

    def order(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def upsert(self, payload, **_kwargs):
        self._upsert_payload = payload
        return self

    def delete(self):
        self._delete_mode = True
        return self

    def execute(self):
        if self._table_name == "agchain_model_targets":
            rows = [
                row for row in self._admin.model_rows
                if all(row.get(key) == value for key, value in self._filters.items())
            ]
            data = rows[0] if self._maybe_single else rows
            return type("R", (), {"data": data})()

        if self._table_name == "user_api_keys":
            if self._upsert_payload is not None:
                payload = dict(self._upsert_payload)
                self._admin.api_keys = [
                    row
                    for row in self._admin.api_keys
                    if not (
                        row.get("user_id") == payload.get("user_id")
                        and row.get("provider") == payload.get("provider")
                    )
                ]
                self._admin.api_keys.append(payload)
                return type("R", (), {"data": [payload]})()

            if self._delete_mode:
                self._admin.api_keys = [
                    row
                    for row in self._admin.api_keys
                    if not all(row.get(key) == value for key, value in self._filters.items())
                ]
                return type("R", (), {"data": []})()

            rows = [
                row for row in self._admin.api_keys
                if all(row.get(key) == value for key, value in self._filters.items())
            ]
            return type("R", (), {"data": rows})()

        if self._table_name == "user_provider_connections":
            rows = [
                row for row in self._admin.connections
                if all(row.get(key) == value for key, value in self._filters.items())
            ]
            return type("R", (), {"data": rows})()

        if self._table_name == "agchain_model_health_checks":
            return type("R", (), {"data": []})()

        raise AssertionError(f"unexpected table {self._table_name}")


class _MutableRegistryAdmin:
    def __init__(self, model_rows, api_keys, connections):
        self.model_rows = model_rows
        self.api_keys = api_keys
        self.connections = connections

    def table(self, name):
        return _MutableRegistryQuery(self, name)


def test_list_model_targets_batches_credential_resolution_queries():
    model_rows = [
        {
            "model_target_id": "model-1",
            "label": "OpenAI GPT 5",
            "provider_slug": "openai",
            "provider_qualifier": None,
            "model_name": "gpt-5",
            "qualified_model": "openai/gpt-5",
            "api_base": "https://api.openai.com/v1",
            "auth_kind": "api_key",
            "credential_source_jsonb": {},
            "supports_evaluated": True,
            "supports_judge": False,
            "capabilities_jsonb": {},
            "enabled": True,
            "probe_strategy": "provider_default",
            "health_status": "healthy",
            "health_checked_at": None,
            "last_latency_ms": None,
            "notes": None,
            "created_at": "2026-03-26T12:00:00Z",
            "updated_at": "2026-03-26T12:00:00Z",
        },
        {
            "model_target_id": "model-2",
            "label": "Anthropic Claude",
            "provider_slug": "anthropic",
            "provider_qualifier": None,
            "model_name": "claude-3-7",
            "qualified_model": "anthropic/claude-3-7",
            "api_base": None,
            "auth_kind": "api_key",
            "credential_source_jsonb": {},
            "supports_evaluated": True,
            "supports_judge": False,
            "capabilities_jsonb": {},
            "enabled": True,
            "probe_strategy": "provider_default",
            "health_status": "healthy",
            "health_checked_at": None,
            "last_latency_ms": None,
            "notes": None,
            "created_at": "2026-03-26T12:00:00Z",
            "updated_at": "2026-03-26T12:00:00Z",
        },
        {
            "model_target_id": "model-3",
            "label": "LocalAI Eval",
            "provider_slug": "localai",
            "provider_qualifier": None,
            "model_name": "llama",
            "qualified_model": "localai/llama",
            "api_base": "http://localhost:8080",
            "auth_kind": "connection",
            "credential_source_jsonb": {"source": "user_provider_connections", "connection_type": "openai_compatible"},
            "supports_evaluated": True,
            "supports_judge": False,
            "capabilities_jsonb": {},
            "enabled": True,
            "probe_strategy": "provider_default",
            "health_status": "degraded",
            "health_checked_at": None,
            "last_latency_ms": None,
            "notes": None,
            "created_at": "2026-03-26T12:00:00Z",
            "updated_at": "2026-03-26T12:00:00Z",
        },
        {
            "model_target_id": "model-4",
            "label": "Bedrock Judge",
            "provider_slug": "bedrock",
            "provider_qualifier": None,
            "model_name": "claude",
            "qualified_model": "bedrock/claude",
            "api_base": None,
            "auth_kind": "connection",
            "credential_source_jsonb": {"source": "user_provider_connections", "connection_type": "aws"},
            "supports_evaluated": False,
            "supports_judge": True,
            "capabilities_jsonb": {},
            "enabled": True,
            "probe_strategy": "provider_default",
            "health_status": "error",
            "health_checked_at": None,
            "last_latency_ms": None,
            "notes": None,
            "created_at": "2026-03-26T12:00:00Z",
            "updated_at": "2026-03-26T12:00:00Z",
        },
    ]
    admin = _RegistryAdmin(
        model_rows=model_rows,
        api_keys=[
            {"user_id": "user-1", "provider": "openai", "is_valid": True, "key_suffix": "c123"},
            {"user_id": "user-1", "provider": "anthropic", "is_valid": False},
        ],
        connections=[
            {"user_id": "user-1", "provider": "localai", "status": "connected", "connection_type": "openai_compatible"},
            {"user_id": "user-1", "provider": "bedrock", "status": "disconnected", "connection_type": "aws"},
        ],
    )

    with (
        patch("app.domain.agchain.model_registry.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.model_registry.resolve_provider_definition",
            side_effect=lambda slug: {"display_name": slug.title(), "default_probe_strategy": "provider_default"},
        ),
    ):
        result = list_model_targets(user_id="user-1", limit=50, offset=0)

    assert result["total"] == 4
    assert result["limit"] == 50
    assert result["offset"] == 0
    assert [row["credential_status"] for row in result["items"]] == ["ready", "invalid", "ready", "disconnected"]
    assert result["items"][0]["key_suffix"] == "c123"
    assert "api_key" not in result["items"][0]
    assert "api_key_encrypted" not in result["items"][0]
    assert [call[0] for call in admin.calls].count("user_api_keys") == 1
    assert [call[0] for call in admin.calls].count("user_provider_connections") == 1


def test_load_model_detail_returns_requester_scoped_key_suffix_only():
    from app.domain.agchain.model_registry import load_model_detail

    admin = _RegistryAdmin(
        model_rows=[
            {
                "model_target_id": MODEL_ID,
                "label": "OpenAI GPT 5",
                "provider_slug": "openai",
                "provider_qualifier": None,
                "model_name": "gpt-5",
                "qualified_model": "openai/gpt-5",
                "api_base": "https://api.openai.com/v1",
                "auth_kind": "api_key",
                "credential_source_jsonb": {},
                "supports_evaluated": True,
                "supports_judge": False,
                "capabilities_jsonb": {},
                "enabled": True,
                "probe_strategy": "provider_default",
                "health_status": "healthy",
                "health_checked_at": None,
                "last_latency_ms": None,
                "notes": None,
                "created_at": "2026-03-26T12:00:00Z",
                "updated_at": "2026-03-26T12:00:00Z",
            }
        ],
        api_keys=[
            {"user_id": "user-1", "provider": "openai", "is_valid": True, "key_suffix": "c123"},
        ],
        connections=[],
    )

    with (
        patch("app.domain.agchain.model_registry.get_supabase_admin", return_value=admin),
        patch(
            "app.domain.agchain.model_registry.resolve_provider_definition",
            side_effect=lambda slug: {"display_name": slug.title(), "default_probe_strategy": "provider_default"},
        ),
    ):
        model_target, recent_health_checks = load_model_detail(user_id="user-1", model_target_id=MODEL_ID)

    assert recent_health_checks == []
    assert model_target is not None
    assert model_target["credential_status"] == "ready"
    assert model_target["key_suffix"] == "c123"
    assert "api_key" not in model_target
    assert "api_key_encrypted" not in model_target


def test_connect_model_key_upserts_encrypted_api_key_with_updated_at():
    from app.domain.agchain.model_registry import connect_model_key

    with (
        patch("app.domain.agchain.model_registry.get_supabase_admin") as mock_get_sb,
        patch("app.domain.agchain.model_registry.encrypt_with_context", return_value="enc:v1:test"),
        patch("app.domain.agchain.model_registry.get_envelope_key", return_value="envelope-key"),
    ):
        mock_sb = mock_get_sb.return_value
        mock_sb.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "provider_slug": "openai",
            "auth_kind": "api_key",
        }
        mock_sb.table.return_value.upsert.return_value.execute.return_value.data = [{"ok": True}]

        result = connect_model_key(user_id="user-1", model_target_id=MODEL_ID, api_key="sk-test-abc123")

    assert result == {"provider_slug": "openai", "key_suffix": "c123", "credential_status": "ready"}
    upsert_payload = mock_sb.table.return_value.upsert.call_args.args[0]
    assert upsert_payload["user_id"] == "user-1"
    assert upsert_payload["provider"] == "openai"
    assert upsert_payload["api_key_encrypted"] == "enc:v1:test"
    assert upsert_payload["key_suffix"] == "c123"
    assert upsert_payload["is_valid"] is None
    assert upsert_payload["updated_at"]
    assert mock_sb.table.return_value.upsert.call_args.kwargs["on_conflict"] == "user_id,provider"


def test_disconnect_model_key_scopes_delete_to_current_user_and_provider():
    from app.domain.agchain.model_registry import disconnect_model_key

    with patch("app.domain.agchain.model_registry.get_supabase_admin") as mock_get_sb:
        mock_sb = mock_get_sb.return_value
        mock_sb.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "provider_slug": "openai",
        }
        delete_chain = mock_sb.table.return_value.delete.return_value
        delete_chain.eq.return_value.eq.return_value.execute.return_value.data = []

        result = disconnect_model_key(user_id="user-1", model_target_id=MODEL_ID)

    assert result == {"provider_slug": "openai", "credential_status": "missing"}
    delete_chain.eq.assert_called_once_with("user_id", "user-1")
    delete_chain.eq.return_value.eq.assert_called_once_with("provider", "openai")


def test_provider_scoped_credentials_affect_all_targets_under_that_provider():
    from app.domain.agchain.model_registry import connect_model_key, disconnect_model_key

    admin = _MutableRegistryAdmin(
        model_rows=[
            {
                "model_target_id": "model-1",
                "label": "GPT-4.1 Mini",
                "provider_slug": "openai",
                "provider_qualifier": None,
                "model_name": "gpt-4.1-mini",
                "qualified_model": "openai/gpt-4.1-mini",
                "api_base": None,
                "auth_kind": "api_key",
                "credential_source_jsonb": {},
                "supports_evaluated": True,
                "supports_judge": False,
                "capabilities_jsonb": {},
                "enabled": True,
                "probe_strategy": "provider_default",
                "health_status": "healthy",
                "health_checked_at": None,
                "last_latency_ms": None,
                "notes": None,
                "created_at": "2026-03-26T12:00:00Z",
                "updated_at": "2026-03-26T12:00:00Z",
            },
            {
                "model_target_id": "model-2",
                "label": "GPT-5.4 Default",
                "provider_slug": "openai",
                "provider_qualifier": None,
                "model_name": "gpt-5.4",
                "qualified_model": "openai/gpt-5.4",
                "api_base": None,
                "auth_kind": "api_key",
                "credential_source_jsonb": {},
                "supports_evaluated": True,
                "supports_judge": True,
                "capabilities_jsonb": {},
                "enabled": True,
                "probe_strategy": "provider_default",
                "health_status": "healthy",
                "health_checked_at": None,
                "last_latency_ms": None,
                "notes": None,
                "created_at": "2026-03-26T12:00:00Z",
                "updated_at": "2026-03-26T12:00:00Z",
            },
        ],
        api_keys=[],
        connections=[],
    )

    with (
        patch("app.domain.agchain.model_registry.get_supabase_admin", return_value=admin),
        patch("app.domain.agchain.model_registry.encrypt_with_context", return_value="enc:v1:test"),
        patch("app.domain.agchain.model_registry.get_envelope_key", return_value="envelope-key"),
        patch(
            "app.domain.agchain.model_registry.resolve_provider_definition",
            side_effect=lambda slug: {"display_name": slug.title(), "default_probe_strategy": "provider_default"},
        ),
    ):
        connect_model_key(user_id="user-1", model_target_id="model-1", api_key="sk-test-abc123")
        connected = list_model_targets(user_id="user-1", limit=50, offset=0)
        disconnect_model_key(user_id="user-1", model_target_id="model-2")
        disconnected = list_model_targets(user_id="user-1", limit=50, offset=0)

    assert [row["credential_status"] for row in connected["items"]] == ["ready", "ready"]
    assert [row["key_suffix"] for row in connected["items"]] == ["c123", "c123"]
    assert [row["credential_status"] for row in disconnected["items"]] == ["missing", "missing"]


def test_get_model_rejects_invalid_model_target_id(client):
    with patch("app.api.routes.agchain_models.load_model_detail", side_effect=AssertionError("load should not be reached")):
        response = client.get("/agchain/models/not-a-uuid")

    assert response.status_code == 422


def test_patch_model_rejects_invalid_model_target_id(agchain_admin_client):
    with patch("app.api.routes.agchain_models.update_model_target", side_effect=AssertionError("update should not be reached")):
        response = agchain_admin_client.patch(
            "/agchain/models/not-a-uuid",
            json={"label": "Updated label"},
        )

    assert response.status_code == 422


def test_refresh_health_rejects_invalid_model_target_id(agchain_admin_client):
    with patch(
        "app.api.routes.agchain_models.refresh_model_target_health",
        new_callable=AsyncMock,
        side_effect=AssertionError("refresh should not be reached"),
    ):
        response = agchain_admin_client.post("/agchain/models/not-a-uuid/refresh-health")

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_run_provider_probe_hides_internal_exception_detail(monkeypatch):
    from app.domain.agchain.model_registry import _run_provider_probe

    class _BoomAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, *_args, **_kwargs):
            raise httpx.ConnectError("http://10.0.0.4:11434 exploded")

    monkeypatch.setattr("app.domain.agchain.model_registry.httpx.AsyncClient", lambda **_kwargs: _BoomAsyncClient())

    result = await _run_provider_probe(
        sb=None,
        row={
            "provider_slug": "openai",
            "auth_kind": "none",
            "api_base": "http://127.0.0.1:11434",
            "probe_strategy": "http_openai_models",
        },
        provider_definition={"default_probe_strategy": "http_openai_models"},
        user_id="user-1",
        credential_status="ready",
    )

    assert result["health_status"] == "error"
    assert result["message"] == "ConnectError: probe failed"


def test_load_api_key_uses_decrypt_with_fallback():
    from app.domain.agchain.model_registry import _load_api_key

    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"api_key_encrypted": "enc:v1:test"}
    ]

    with patch(
        "app.domain.agchain.model_registry.decrypt_with_fallback",
        return_value="sk-live-test",
    ) as mock_fallback:
        result = _load_api_key(mock_sb, user_id="user-1", provider_slug="openai")

    assert result == "sk-live-test"
    mock_fallback.assert_called_once_with("enc:v1:test", "user-api-keys-v1")
```

## `web/src/hooks/useAdminSurfaceAccess.ts`

```ts
import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { platformApiFetch } from '@/lib/platformApi';

export type AdminSurfaceAccess = {
  blockdataAdmin: boolean;
  agchainAdmin: boolean;
  superuser: boolean;
};

const AUTH_BYPASS_ENABLED = import.meta.env.VITE_AUTH_BYPASS === 'true';

const FULL_ACCESS: AdminSurfaceAccess = {
  blockdataAdmin: true,
  agchainAdmin: true,
  superuser: true,
};

const NO_ACCESS: AdminSurfaceAccess = {
  blockdataAdmin: false,
  agchainAdmin: false,
  superuser: false,
};

type AccessResponse = {
  blockdata_admin?: boolean;
  agchain_admin?: boolean;
  superuser?: boolean;
};

export function useAdminSurfaceAccess(): AdminSurfaceAccess | null {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [resolved, setResolved] = useState<{ userId: string | null; access: AdminSurfaceAccess | null }>({
    userId: AUTH_BYPASS_ENABLED ? '__auth_bypass__' : null,
    access: AUTH_BYPASS_ENABLED ? FULL_ACCESS : null,
  });

  useEffect(() => {
    if (AUTH_BYPASS_ENABLED) return;
    if (!userId) return;

    let cancelled = false;

    platformApiFetch('/auth/access', { method: 'GET' })
      .then(async (resp) => {
        if (!resp.ok) {
          if (!cancelled) setResolved({ userId, access: NO_ACCESS });
          return;
        }

        const body = await resp.json() as AccessResponse;
        if (!cancelled) {
          setResolved({
            userId,
            access: {
              blockdataAdmin: Boolean(body.blockdata_admin),
              agchainAdmin: Boolean(body.agchain_admin),
              superuser: Boolean(body.superuser),
            },
          });
        }
      })
      .catch(() => {
        if (!cancelled) setResolved({ userId, access: NO_ACCESS });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (AUTH_BYPASS_ENABLED) return FULL_ACCESS;
  if (!userId) return null;
  if (resolved.userId !== userId) return null;
  return resolved.access;
}
```

## `web/src/hooks/useAdminSurfaceAccess.test.tsx`

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAdminSurfaceAccess } from './useAdminSurfaceAccess';

const platformApiFetchMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

afterEach(() => {
  platformApiFetchMock.mockReset();
  useAuthMock.mockReset();
});

describe('useAdminSurfaceAccess', () => {
  it('loads the three admin-surface booleans for an authenticated user', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    platformApiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blockdata_admin: true,
        agchain_admin: false,
        superuser: true,
      }),
    });

    const { result } = renderHook(() => useAdminSurfaceAccess());

    expect(result.current).toBeNull();

    await waitFor(() => {
      expect(result.current).toEqual({
        blockdataAdmin: true,
        agchainAdmin: false,
        superuser: true,
      });
    });
  });

  it('falls back to no access when the probe returns a non-ok response', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    platformApiFetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useAdminSurfaceAccess());

    expect(result.current).toBeNull();

    await waitFor(() => {
      expect(result.current).toEqual({
        blockdataAdmin: false,
        agchainAdmin: false,
        superuser: false,
      });
    });
  });
});
```

## `web/src/hooks/useSuperuserProbe.ts`

```ts
import { useAdminSurfaceAccess } from '@/hooks/useAdminSurfaceAccess';

/**
 * Probes the admin-config endpoint to determine if the current user
 * is a superuser. Returns `null` while loading, then `true`/`false`.
 * Re-probes when the authenticated user changes.
 */
export function useSuperuserProbe(): boolean | null {
  const access = useAdminSurfaceAccess();
  return access?.superuser ?? null;
}
```

## `web/src/components/shell/ShellWorkspaceSelector.tsx`

```tsx
import { Combobox, createListCollection } from '@ark-ui/react/combobox';
import { IconChevronDown } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminSurfaceAccess } from '@/hooks/useAdminSurfaceAccess';

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

export function ShellWorkspaceSelector() {
  const location = useLocation();
  const navigate = useNavigate();
  const access = useAdminSurfaceAccess();

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
        option.value === currentValue || (option.adminKey ? Boolean(access?.[option.adminKey]) : false)
      )),
    ]
  ), [access, currentValue]);

  const workspaceCollection = useMemo(
    () => createListCollection({ items: workspaceOptions }),
    [workspaceOptions],
  );

  const currentOption = workspaceOptions.find((option) => option.value === currentValue);

  return (
    <Combobox.Root
      collection={workspaceCollection}
      value={[currentValue]}
      inputValue={currentOption?.label ?? ''}
      onValueChange={(details) => {
        const nextValue = details.value[0] as WorkspaceValue | undefined;
        const next = workspaceOptions.find((option) => option.value === nextValue);
        if (next && next.path !== location.pathname && next.value !== currentValue) {
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

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ShellWorkspaceSelector } from './ShellWorkspaceSelector';

const navigateMock = vi.fn();
const useAdminSurfaceAccessMock = vi.fn<() => { blockdataAdmin: boolean; agchainAdmin: boolean; superuser: boolean } | null>(() => ({
  blockdataAdmin: false,
  agchainAdmin: false,
  superuser: false,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/hooks/useAdminSurfaceAccess', () => ({
  useAdminSurfaceAccess: () => useAdminSurfaceAccessMock(),
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
  useAdminSurfaceAccessMock.mockReset();
  useAdminSurfaceAccessMock.mockReturnValue({
    blockdataAdmin: false,
    agchainAdmin: false,
    superuser: false,
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
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: true,
      agchainAdmin: true,
      superuser: true,
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
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: true,
      agchainAdmin: false,
      superuser: false,
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
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: false,
      agchainAdmin: true,
      superuser: false,
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
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: false,
      agchainAdmin: false,
      superuser: true,
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

  it('navigates to the blockdata admin shell when Blockdata Admin is selected', async () => {
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: true,
      agchainAdmin: true,
      superuser: true,
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
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: true,
      agchainAdmin: true,
      superuser: true,
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
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: true,
      agchainAdmin: true,
      superuser: true,
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

## `web/src/components/admin/AdminLeftNav.tsx`

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

## `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, it, expect } from 'vitest';
import {
  AdminLeftNav,
  AGCHAIN_ADMIN_NAV_SECTIONS,
  BLOCKDATA_ADMIN_NAV_SECTIONS,
  SUPERUSER_NAV_SECTIONS,
  getSecondaryNav,
} from '../AdminLeftNav';

afterEach(cleanup);

function renderNav(pathname = '/app/superuser') {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <AdminLeftNav />
    </MemoryRouter>
  );
}

describe('AdminLeftNav', () => {
  it('renders a nav with the secondary rail label', () => {
    renderNav();
    expect(screen.getByRole('navigation', { name: /admin secondary navigation/i })).toBeInTheDocument();
  });

  it('renders no secondary links on the blockdata admin index page', () => {
    renderNav('/app/blockdata-admin');
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('renders instance section anchors and defaults to the first hash target', () => {
    renderNav('/app/blockdata-admin/instance-config');

    expect(screen.getByRole('link', { name: /jobs/i })).toHaveAttribute('href', '/app/blockdata-admin/instance-config#jobs');
    expect(screen.getByRole('link', { name: /workers/i })).toHaveAttribute('href', '/app/blockdata-admin/instance-config#workers');
    expect(screen.getByRole('link', { name: /jobs/i })).toHaveAttribute('aria-current', 'page');
  });

  it('uses the hash to mark the active instance subsection', () => {
    renderNav('/app/blockdata-admin/instance-config#workers');
    expect(screen.getByRole('link', { name: /workers/i })).toHaveAttribute('aria-current', 'page');
  });

  it('getSecondaryNav returns sections for routes with secondary nav', () => {
    expect(getSecondaryNav('/app/blockdata-admin/instance-config').length).toBeGreaterThan(0);
    expect(getSecondaryNav('/app/blockdata-admin/worker-config').length).toBeGreaterThan(0);
  });

  it('getSecondaryNav returns empty array for routes without secondary nav', () => {
    expect(getSecondaryNav('/app/blockdata-admin')).toHaveLength(0);
    expect(getSecondaryNav('/app/blockdata-admin/audit')).toHaveLength(0);
    expect(getSecondaryNav('/app/superuser/operational-readiness')).toHaveLength(0);
    expect(getSecondaryNav('/app/blockdata-admin/ai-providers')).toHaveLength(0);
    expect(getSecondaryNav('/app/blockdata-admin/parsers-docling')).toHaveLength(0);
  });

  it('moves CONFIG OPERATIONS and SYSTEM into Blockdata Admin', () => {
    expect(BLOCKDATA_ADMIN_NAV_SECTIONS.map((section) => section.label)).toEqual(['CONFIG', 'OPERATIONS', 'SYSTEM']);
    expect(BLOCKDATA_ADMIN_NAV_SECTIONS.flatMap((section) => section.items).map((item) => item.path)).toContain('/app/blockdata-admin/instance-config');
    expect(BLOCKDATA_ADMIN_NAV_SECTIONS.flatMap((section) => section.items).map((item) => item.path)).toContain('/app/blockdata-admin/test-integrations');
  });

  it('keeps DEV ONLY inside Superuser', () => {
    const devOnlySection = SUPERUSER_NAV_SECTIONS.find((section) => section.label === 'DEV ONLY');
    const operationalReadiness = SUPERUSER_NAV_SECTIONS
      .flatMap((section) => section.items)
      .find((item) => item.path === '/app/superuser/operational-readiness');
    const layoutCaptures = devOnlySection?.items.find(
      (item) => item.path === '/app/superuser/design-layout-captures',
    );

    expect(devOnlySection).toBeDefined();
    expect(layoutCaptures).toMatchObject({
      label: 'Layout Captures',
      path: '/app/superuser/design-layout-captures',
    });
    expect(operationalReadiness).toMatchObject({
      label: 'Operational Readiness',
      path: '/app/superuser/operational-readiness',
    });
    expect(devOnlySection?.items.map((item) => item.path)).toContain('/app/superuser/operational-readiness');
  });

  it('boots AGChain Admin with a single Models menu item', () => {
    expect(AGCHAIN_ADMIN_NAV_SECTIONS).toHaveLength(1);
    expect(AGCHAIN_ADMIN_NAV_SECTIONS[0]?.items).toEqual([
      expect.objectContaining({
        label: 'Models',
        path: '/app/agchain-admin/models',
      }),
    ]);
  });
});
```

## `web/src/components/layout/AdminShellLayout.tsx`

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

vi.mock('@/hooks/useSuperuserProbe', () => ({
  useSuperuserProbe: () => true,
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

## `web/src/pages/superuser/SuperuserGuard.tsx`

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminSurfaceAccess } from '@/hooks/useAdminSurfaceAccess';

// Mirror the auth bypass flag from AuthGuard â€” when auth is bypassed,
// superuser gating is also bypassed so the page is accessible in dev.
// Off by default. Set VITE_AUTH_BYPASS=true in .env.local to enable.
const AUTH_BYPASS_ENABLED = import.meta.env.VITE_AUTH_BYPASS === 'true';

type SurfaceKey = 'blockdataAdmin' | 'agchainAdmin' | 'superuser';

function AdminSurfaceGuard({ surface }: { surface: SurfaceKey }) {
  const access = useAdminSurfaceAccess();

  if (AUTH_BYPASS_ENABLED) {
    return <Outlet />;
  }

  if (access === null) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Verifying accessâ€¦
      </div>
    );
  }

  if (!access[surface]) {
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

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  AgchainAdminGuard,
  BlockdataAdminGuard,
  SuperuserGuard,
} from './SuperuserGuard';

const useAdminSurfaceAccessMock = vi.fn<
  () => { blockdataAdmin: boolean; agchainAdmin: boolean; superuser: boolean } | null
>(() => ({
  blockdataAdmin: false,
  agchainAdmin: false,
  superuser: false,
}));

vi.mock('@/hooks/useAdminSurfaceAccess', () => ({
  useAdminSurfaceAccess: () => useAdminSurfaceAccessMock(),
}));

afterEach(() => {
  cleanup();
  useAdminSurfaceAccessMock.mockReset();
  useAdminSurfaceAccessMock.mockReturnValue({
    blockdataAdmin: false,
    agchainAdmin: false,
    superuser: false,
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
    useAdminSurfaceAccessMock.mockReturnValue(null);

    renderGuard('/app/blockdata-admin');

    expect(screen.getByText(/verifying access/i)).toBeInTheDocument();
  });

  it('allows a blockdata-only admin into the blockdata admin surface', () => {
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: true,
      agchainAdmin: false,
      superuser: false,
    });

    renderGuard('/app/blockdata-admin');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('blockdata admin');
  });

  it('does not let a superuser-only persona into the blockdata admin surface', () => {
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: false,
      agchainAdmin: false,
      superuser: true,
    });

    renderGuard('/app/blockdata-admin');

    expect(screen.getByTestId('app-home')).toBeInTheDocument();
  });

  it('allows an agchain-only admin into the AGChain admin surface', () => {
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: false,
      agchainAdmin: true,
      superuser: false,
    });

    renderGuard('/app/agchain-admin/models');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('agchain admin');
  });

  it('does not let a blockdata-only persona into the AGChain admin surface', () => {
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: true,
      agchainAdmin: false,
      superuser: false,
    });

    renderGuard('/app/agchain-admin/models');

    expect(screen.getByTestId('app-home')).toBeInTheDocument();
  });

  it('allows a superuser-only persona into the superuser surface', () => {
    useAdminSurfaceAccessMock.mockReturnValue({
      blockdataAdmin: false,
      agchainAdmin: false,
      superuser: true,
    });

    renderGuard('/app/superuser/operational-readiness');

    expect(screen.getByTestId('protected-surface')).toHaveTextContent('superuser');
  });
});
```

## `web/src/pages/superuser/SuperuserWorkspace.tsx`

```tsx
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Workbench } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { IconDatabase, IconSettings } from '@tabler/icons-react';

import { Component as SuperuserProvisioningMonitor } from './SuperuserProvisioningMonitor';
import { Component as SuperuserStoragePolicy } from './SuperuserStoragePolicy';

const TABS = [
  { id: 'storage-policy', label: 'Storage Policy', icon: IconSettings },
  { id: 'provisioning-monitor', label: 'Provisioning Monitor', icon: IconDatabase },
];

const DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-1', tabs: ['storage-policy'], activeTab: 'storage-policy', width: 45 },
  { id: 'pane-2', tabs: ['provisioning-monitor'], activeTab: 'provisioning-monitor', width: 55 },
]);

function renderContent(tabId: string) {
  if (tabId === 'storage-policy') return <SuperuserStoragePolicy />;
  if (tabId === 'provisioning-monitor') return <SuperuserProvisioningMonitor />;
  return null;
}

export function Component() {
  useShellHeaderTitle({ title: 'Blockdata Admin', breadcrumbs: ['Blockdata Admin'] });

  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={TABS}
          defaultPanes={DEFAULT_PANES}
          saveKey="superuser-workbench-layout"
          renderContent={renderContent}
          hideToolbar
        />
      </div>
    </div>
  );
}
```

## `web/src/pages/admin/AgchainAdminModelsPage.tsx`

```tsx
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';

export default function AgchainAdminModelsPage() {
  useShellHeaderTitle({
    title: 'AGChain Admin Models',
    breadcrumbs: ['AGChain Admin', 'Models'],
  });

  return (
    <main className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 px-6 py-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          AGChain Admin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Models</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          This surface is intentionally sparse in the first split. The backend gate and shell are now
          separated so AGChain administration can grow here without remaining tied to Superuser.
        </p>
      </header>

      <section className="rounded-2xl border border-border/70 bg-card px-5 py-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          No AGChain admin-owned model controls are mounted yet. This placeholder confirms the new
          route, guard, and rail inventory are wired correctly.
        </p>
      </section>
    </main>
  );
}
```

## `web/src/pages/settings/DoclingConfigPanel.tsx`

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Select as ArkSelect, createListCollection } from '@ark-ui/react/select';
import { Portal } from '@ark-ui/react/portal';
import { supabase } from '@/lib/supabase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  IconPlus,
  IconTrash,
  IconCopy,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { SwitchRoot, SwitchControl, SwitchThumb, SwitchHiddenInput } from '@/components/ui/switch';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleIndicator, CollapsibleContent } from '@/components/ui/collapsible';
import { NumberInputRoot, NumberInputInput } from '@/components/ui/number-input';
import { FieldRoot, FieldLabel, FieldHelperText } from '@/components/ui/field';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { platformApiFetch } from '@/lib/platformApi';
import { normalizeDocumentViewMode, DEFAULT_DOCUMENT_VIEW_MODE, type DocumentViewMode } from '@/pages/superuser/documentViews';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ParsingProfile = {
  id: string;
  parser: string;
  config: Record<string, unknown>;
};

type ProfileOption = {
  label: string;
  value: string;
  isDefault: boolean;
};

type DoclingConfig = {
  name?: string;
  description?: string;
  is_default?: boolean;
  pipeline?: string;
  document_timeout?: number | null;
  enable_remote_services?: boolean;
  accelerator_options?: {
    device?: string;
    num_threads?: number;
  };
  pdf_pipeline?: {
    do_ocr?: boolean;
    ocr_options?: Record<string, unknown>;
    layout_options?: Record<string, unknown>;
    do_table_structure?: boolean;
    table_structure_options?: Record<string, unknown>;
    do_code_enrichment?: boolean;
    do_formula_enrichment?: boolean;
    force_backend_text?: boolean;
    images_scale?: number;
    generate_page_images?: boolean;
    generate_picture_images?: boolean;
    [key: string]: unknown;
  };
  vlm_pipeline?: {
    vlm_options?: Record<string, unknown>;
    force_backend_text?: boolean;
    images_scale?: number;
    generate_page_images?: boolean;
  };
  asr_pipeline?: {
    asr_options?: Record<string, unknown>;
  };
  enrichments?: Record<string, unknown>;
  [key: string]: unknown;
};

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PIPELINE_OPTIONS = [
  { value: 'standard', label: 'Standard (OCR + Layout + Tables)' },
  { value: 'vlm', label: 'VLM (Vision Language Model)' },
  { value: 'asr', label: 'ASR (Audio Speech Recognition)' },
];

const OCR_ENGINE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'easyocr', label: 'EasyOCR' },
  { value: 'tesseract', label: 'Tesseract (CLI)' },
  { value: 'tesserocr', label: 'Tesseract (Python)' },
  { value: 'rapidocr', label: 'RapidOCR' },
  { value: 'ocrmac', label: 'macOS Vision' },
];

const LAYOUT_MODEL_OPTIONS = [
  { value: 'heron', label: 'Heron (default, fast)' },
  { value: 'egret', label: 'Egret' },
  { value: 'egret_v2', label: 'Egret V2' },
  { value: 'egret_medium', label: 'Egret Medium' },
  { value: 'egret_xlarge', label: 'Egret XLarge' },
];

const TABLE_MODE_OPTIONS = [
  { value: 'fast', label: 'Fast' },
  { value: 'accurate', label: 'Accurate' },
];

const VLM_PRESET_OPTIONS = [
  { value: 'granite_docling', label: 'GraniteDocling (recommended)' },
  { value: 'smoldocling', label: 'SmolDocling (lightweight)' },
  { value: 'phi4', label: 'Phi-4 Multimodal' },
  { value: 'granite_vision', label: 'Granite Vision 3.3-2B' },
  { value: 'pixtral', label: 'Pixtral' },
  { value: 'deepseek_ocr', label: 'DeepSeek OCR' },
  { value: 'got_ocr', label: 'GOT-OCR' },
  { value: 'qwen', label: 'Qwen VLM' },
  { value: 'gemma_12b', label: 'Gemma 12B' },
  { value: 'gemma_27b', label: 'Gemma 27B' },
  { value: 'dolphin', label: 'Dolphin' },
];

const VLM_RESPONSE_FORMAT_OPTIONS = [
  { value: 'doctags', label: 'DocTags (structured)' },
  { value: 'markdown', label: 'Markdown' },
];

const DEVICE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'cpu', label: 'CPU' },
  { value: 'cuda', label: 'CUDA (NVIDIA GPU)' },
  { value: 'mps', label: 'MPS (Apple GPU)' },
];

const PICTURE_DESC_KIND_OPTIONS = [
  { value: 'picture_description_vlm_engine', label: 'VLM Engine (recommended)' },
  { value: 'api', label: 'API' },
];

const PICTURE_DESC_PRESET_OPTIONS = [
  { value: 'smolvlm', label: 'SmolVLM' },
  { value: 'granite_vision', label: 'Granite Vision' },
  { value: 'pixtral', label: 'Pixtral' },
];

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getIn(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let cur: unknown = obj;
  for (const key of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function setIn(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const clone = structuredClone(obj);
  const keys = path.split('.');
  let cur: Record<string, unknown> = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (cur[key] == null || typeof cur[key] !== 'object') {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  const lastKey = keys[keys.length - 1]!;
  cur[lastKey] = value;
  return clone;
}

// â”€â”€â”€ Field components (thin adapters over Ark UI primitives) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FieldRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <FieldRoot>
      <div className="min-w-0 flex-1">
        <FieldLabel>{label}</FieldLabel>
        {description && <FieldHelperText>{description}</FieldHelperText>}
      </div>
      <div className="shrink-0">{children}</div>
    </FieldRoot>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <SwitchRoot checked={checked} onCheckedChange={(d) => onChange(d.checked)}>
      <SwitchControl><SwitchThumb /></SwitchControl>
      <SwitchHiddenInput />
    </SwitchRoot>
  );
}

function ConfigSelect({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      placeholder={placeholder}
      className="h-8 w-48 rounded-md border border-input bg-background px-2 text-xs text-foreground"
    />
  );
}

function NumberInput({ value, onChange, min, max, step }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <NumberInputRoot
      value={String(value)}
      onValueChange={(d) => { const n = parseFloat(d.value); if (!Number.isNaN(n)) onChange(n); }}
      min={min}
      max={max}
      step={step}
    >
      <NumberInputInput />
    </NumberInputRoot>
  );
}

// â”€â”€â”€ Section component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <CollapsibleRoot defaultOpen={defaultOpen}>
      <CollapsibleTrigger>
        {title}
        <CollapsibleIndicator>&#9654;</CollapsibleIndicator>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </CollapsibleRoot>
  );
}

// â”€â”€â”€ Config editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ConfigEditor({ config, onChange }: { config: DoclingConfig; onChange: (config: DoclingConfig) => void }) {
  const set = useCallback((path: string, value: unknown) => {
    onChange(setIn(config as Record<string, unknown>, path, value) as DoclingConfig);
  }, [config, onChange]);

  const get = useCallback((path: string, fallback: unknown = undefined) => {
    return getIn(config as Record<string, unknown>, path) ?? fallback;
  }, [config]);

  const pipelineMode = (get('pipeline', 'standard') as string);

  return (
    <div className="space-y-3">
      {/* General */}
      <Section title="General">
        <FieldRow label="Profile Name">
          <TextInput value={(get('name', '') as string)} onChange={(v) => set('name', v)} placeholder="Profile name" />
        </FieldRow>
        <FieldRow label="Description">
          <TextInput value={(get('description', '') as string)} onChange={(v) => set('description', v)} placeholder="Description" />
        </FieldRow>
        <FieldRow label="Default Profile" description="Use this profile when none is specified">
          <Toggle checked={!!get('is_default', false)} onChange={(v) => set('is_default', v)} />
        </FieldRow>
        <FieldRow label="Pipeline" description="Which processing pipeline to use for PDF/image documents">
          <ConfigSelect value={pipelineMode} options={PIPELINE_OPTIONS} onChange={(v) => set('pipeline', v)} />
        </FieldRow>
        <FieldRow label="Document Timeout" description="Max seconds per document (0 = no limit)">
          <NumberInput value={(get('document_timeout', 0) as number)} onChange={(v) => set('document_timeout', v || null)} min={0} step={10} />
        </FieldRow>
        <FieldRow label="Enable Remote Services" description="Allow external API calls (VLM API, picture description API)">
          <Toggle checked={!!get('enable_remote_services', false)} onChange={(v) => set('enable_remote_services', v)} />
        </FieldRow>
      </Section>

      {/* Accelerator */}
      <Section title="Accelerator" defaultOpen={false}>
        <FieldRow label="Device">
          <ConfigSelect value={(get('accelerator_options.device', 'auto') as string)} options={DEVICE_OPTIONS} onChange={(v) => set('accelerator_options.device', v)} />
        </FieldRow>
        <FieldRow label="Threads">
          <NumberInput value={(get('accelerator_options.num_threads', 4) as number)} onChange={(v) => set('accelerator_options.num_threads', v)} min={1} max={32} />
        </FieldRow>
      </Section>

      {/* PDF Pipeline */}
      {pipelineMode === 'standard' && (
        <>
          <Section title="OCR">
            <FieldRow label="Enable OCR">
              <Toggle checked={!!get('pdf_pipeline.do_ocr', true)} onChange={(v) => set('pdf_pipeline.do_ocr', v)} />
            </FieldRow>
            <FieldRow label="Engine">
              <ConfigSelect value={(get('pdf_pipeline.ocr_options.kind', 'auto') as string)} options={OCR_ENGINE_OPTIONS} onChange={(v) => set('pdf_pipeline.ocr_options.kind', v)} />
            </FieldRow>
            <FieldRow label="Languages" description="Comma-separated language codes">
              <TextInput
                value={((get('pdf_pipeline.ocr_options.lang') as string[] | undefined) ?? []).join(', ')}
                onChange={(v) => set('pdf_pipeline.ocr_options.lang', v.split(',').map((s) => s.trim()).filter(Boolean))}
                placeholder="en, fr, de"
              />
            </FieldRow>
            <FieldRow label="Force Full Page OCR" description="OCR entire page even if native text exists">
              <Toggle checked={!!get('pdf_pipeline.ocr_options.force_full_page_ocr', false)} onChange={(v) => set('pdf_pipeline.ocr_options.force_full_page_ocr', v)} />
            </FieldRow>
            <FieldRow label="Bitmap Area Threshold" description="Fraction of page that must be bitmap to trigger OCR (0.0â€“1.0)">
              <NumberInput value={(get('pdf_pipeline.ocr_options.bitmap_area_threshold', 0.05) as number)} onChange={(v) => set('pdf_pipeline.ocr_options.bitmap_area_threshold', v)} min={0} max={1} step={0.01} />
            </FieldRow>

            {/* EasyOCR-specific */}
            {(get('pdf_pipeline.ocr_options.kind', 'auto') as string) === 'easyocr' && (
              <>
                <FieldRow label="Confidence Threshold">
                  <NumberInput value={(get('pdf_pipeline.ocr_options.confidence_threshold', 0.5) as number)} onChange={(v) => set('pdf_pipeline.ocr_options.confidence_threshold', v)} min={0} max={1} step={0.05} />
                </FieldRow>
              </>
            )}

            {/* Tesseract-specific */}
            {((get('pdf_pipeline.ocr_options.kind', 'auto') as string) === 'tesseract' || (get('pdf_pipeline.ocr_options.kind', 'auto') as string) === 'tesserocr') && (
              <>
                <FieldRow label="Page Segmentation Mode" description="Tesseract PSM (leave 0 for default)">
                  <NumberInput value={(get('pdf_pipeline.ocr_options.psm', 0) as number)} onChange={(v) => set('pdf_pipeline.ocr_options.psm', v || null)} min={0} max={13} />
                </FieldRow>
              </>
            )}

            {/* RapidOCR-specific */}
            {(get('pdf_pipeline.ocr_options.kind', 'auto') as string) === 'rapidocr' && (
              <>
                <FieldRow label="Backend">
                  <ConfigSelect
                    value={(get('pdf_pipeline.ocr_options.backend', 'onnxruntime') as string)}
                    options={[
                      { value: 'onnxruntime', label: 'ONNX Runtime' },
                      { value: 'openvino', label: 'OpenVINO' },
                      { value: 'paddle', label: 'PaddlePaddle' },
                      { value: 'torch', label: 'PyTorch' },
                    ]}
                    onChange={(v) => set('pdf_pipeline.ocr_options.backend', v)}
                  />
                </FieldRow>
                <FieldRow label="Text Score">
                  <NumberInput value={(get('pdf_pipeline.ocr_options.text_score', 0.5) as number)} onChange={(v) => set('pdf_pipeline.ocr_options.text_score', v)} min={0} max={1} step={0.05} />
                </FieldRow>
              </>
            )}
          </Section>

          <Section title="Layout">
            <FieldRow label="Model">
              <ConfigSelect value={(get('pdf_pipeline.layout_options.model', 'heron') as string)} options={LAYOUT_MODEL_OPTIONS} onChange={(v) => set('pdf_pipeline.layout_options.model', v)} />
            </FieldRow>
            <FieldRow label="Create Orphan Clusters">
              <Toggle checked={!!get('pdf_pipeline.layout_options.create_orphan_clusters', true)} onChange={(v) => set('pdf_pipeline.layout_options.create_orphan_clusters', v)} />
            </FieldRow>
          </Section>

          <Section title="Table Structure">
            <FieldRow label="Enable Table Detection">
              <Toggle checked={!!get('pdf_pipeline.do_table_structure', true)} onChange={(v) => set('pdf_pipeline.do_table_structure', v)} />
            </FieldRow>
            <FieldRow label="Mode">
              <ConfigSelect value={(get('pdf_pipeline.table_structure_options.mode', 'accurate') as string)} options={TABLE_MODE_OPTIONS} onChange={(v) => set('pdf_pipeline.table_structure_options.mode', v)} />
            </FieldRow>
            <FieldRow label="Cell Matching" description="Align detected cells with OCR text">
              <Toggle checked={!!get('pdf_pipeline.table_structure_options.do_cell_matching', true)} onChange={(v) => set('pdf_pipeline.table_structure_options.do_cell_matching', v)} />
            </FieldRow>
          </Section>

          <Section title="Code & Formulas" defaultOpen={false}>
            <FieldRow label="Code Enrichment" description="Extract code blocks using VLM">
              <Toggle checked={!!get('pdf_pipeline.do_code_enrichment', false)} onChange={(v) => set('pdf_pipeline.do_code_enrichment', v)} />
            </FieldRow>
            <FieldRow label="Formula Enrichment" description="Extract math formulas using VLM">
              <Toggle checked={!!get('pdf_pipeline.do_formula_enrichment', false)} onChange={(v) => set('pdf_pipeline.do_formula_enrichment', v)} />
            </FieldRow>
          </Section>

          <Section title="Image Generation" defaultOpen={false}>
            <FieldRow label="Images Scale" description="Scaling factor for page images">
              <NumberInput value={(get('pdf_pipeline.images_scale', 1.0) as number)} onChange={(v) => set('pdf_pipeline.images_scale', v)} min={0.5} max={4} step={0.5} />
            </FieldRow>
            <FieldRow label="Generate Page Images" description="Create PNG for each page">
              <Toggle checked={!!get('pdf_pipeline.generate_page_images', false)} onChange={(v) => set('pdf_pipeline.generate_page_images', v)} />
            </FieldRow>
            <FieldRow label="Generate Picture Images" description="Extract embedded images as files">
              <Toggle checked={!!get('pdf_pipeline.generate_picture_images', false)} onChange={(v) => set('pdf_pipeline.generate_picture_images', v)} />
            </FieldRow>
            <FieldRow label="Force Backend Text" description="Use PDF native text instead of OCR/layout predictions">
              <Toggle checked={!!get('pdf_pipeline.force_backend_text', false)} onChange={(v) => set('pdf_pipeline.force_backend_text', v)} />
            </FieldRow>
          </Section>
        </>
      )}

      {/* VLM Pipeline */}
      {pipelineMode === 'vlm' && (
        <Section title="VLM Pipeline">
          <FieldRow label="Model Preset">
            <ConfigSelect value={(get('vlm_pipeline.vlm_options.preset', 'granite_docling') as string)} options={VLM_PRESET_OPTIONS} onChange={(v) => set('vlm_pipeline.vlm_options.preset', v)} />
          </FieldRow>
          <FieldRow label="Response Format">
            <ConfigSelect value={(get('vlm_pipeline.vlm_options.response_format', 'doctags') as string)} options={VLM_RESPONSE_FORMAT_OPTIONS} onChange={(v) => set('vlm_pipeline.vlm_options.response_format', v)} />
          </FieldRow>
          <FieldRow label="Scale">
            <NumberInput value={(get('vlm_pipeline.vlm_options.scale', 2.0) as number)} onChange={(v) => set('vlm_pipeline.vlm_options.scale', v)} min={0.5} max={4} step={0.5} />
          </FieldRow>
          <FieldRow label="Batch Size">
            <NumberInput value={(get('vlm_pipeline.vlm_options.batch_size', 1) as number)} onChange={(v) => set('vlm_pipeline.vlm_options.batch_size', v)} min={1} max={16} />
          </FieldRow>
          <FieldRow label="Force Backend Text">
            <Toggle checked={!!get('vlm_pipeline.force_backend_text', false)} onChange={(v) => set('vlm_pipeline.force_backend_text', v)} />
          </FieldRow>
        </Section>
      )}

      {/* ASR Pipeline */}
      {pipelineMode === 'asr' && (
        <Section title="ASR Pipeline">
          <FieldRow label="Model">
            <ConfigSelect
              value={(get('asr_pipeline.asr_options.kind', 'whisper_native') as string)}
              options={[
                { value: 'whisper_native', label: 'Whisper (Native)' },
                { value: 'whisper_mlx', label: 'Whisper (MLX / Apple Silicon)' },
              ]}
              onChange={(v) => set('asr_pipeline.asr_options.kind', v)}
            />
          </FieldRow>
          <FieldRow label="Preset">
            <ConfigSelect
              value={(get('asr_pipeline.asr_options.preset', 'whisper_tiny') as string)}
              options={[
                { value: 'whisper_tiny', label: 'Tiny' },
                { value: 'whisper_small', label: 'Small' },
                { value: 'whisper_medium', label: 'Medium' },
                { value: 'whisper_large', label: 'Large' },
              ]}
              onChange={(v) => set('asr_pipeline.asr_options.preset', v)}
            />
          </FieldRow>
        </Section>
      )}

      {/* Enrichments */}
      <Section title="Enrichments">
        <FieldRow label="Picture Classification" description="Classify images as document-image vs photograph">
          <Toggle checked={!!get('enrichments.do_picture_classification', false)} onChange={(v) => set('enrichments.do_picture_classification', v)} />
        </FieldRow>
        <FieldRow label="Picture Description" description="Generate text captions for images">
          <Toggle checked={!!get('enrichments.do_picture_description', false)} onChange={(v) => set('enrichments.do_picture_description', v)} />
        </FieldRow>
        {!!get('enrichments.do_picture_description', false) && (
          <>
            <FieldRow label="Description Engine">
              <ConfigSelect
                value={(get('enrichments.picture_description_options.kind', 'picture_description_vlm_engine') as string)}
                options={PICTURE_DESC_KIND_OPTIONS}
                onChange={(v) => set('enrichments.picture_description_options.kind', v)}
              />
            </FieldRow>
            {(get('enrichments.picture_description_options.kind', 'picture_description_vlm_engine') as string) === 'picture_description_vlm_engine' && (
              <FieldRow label="VLM Preset">
                <ConfigSelect
                  value={(get('enrichments.picture_description_options.preset', 'smolvlm') as string)}
                  options={PICTURE_DESC_PRESET_OPTIONS}
                  onChange={(v) => set('enrichments.picture_description_options.preset', v)}
                />
              </FieldRow>
            )}
            {(get('enrichments.picture_description_options.kind') as string) === 'api' && (
              <>
                <FieldRow label="API URL">
                  <TextInput
                    value={(get('enrichments.picture_description_options.url', '') as string)}
                    onChange={(v) => set('enrichments.picture_description_options.url', v)}
                    placeholder="http://localhost:8000/v1/chat/completions"
                  />
                </FieldRow>
                <FieldRow label="Timeout (seconds)">
                  <NumberInput value={(get('enrichments.picture_description_options.timeout', 20) as number)} onChange={(v) => set('enrichments.picture_description_options.timeout', v)} min={1} max={120} />
                </FieldRow>
                <FieldRow label="Concurrency">
                  <NumberInput value={(get('enrichments.picture_description_options.concurrency', 1) as number)} onChange={(v) => set('enrichments.picture_description_options.concurrency', v)} min={1} max={16} />
                </FieldRow>
              </>
            )}
            <FieldRow label="Prompt">
              <TextInput
                value={(get('enrichments.picture_description_options.prompt', 'Describe this image in a few sentences.') as string)}
                onChange={(v) => set('enrichments.picture_description_options.prompt', v)}
              />
            </FieldRow>
          </>
        )}
        <FieldRow label="Chart Extraction" description="Extract chart/graph data using GraniteVision">
          <Toggle checked={!!get('enrichments.do_chart_extraction', false)} onChange={(v) => set('enrichments.do_chart_extraction', v)} />
        </FieldRow>
      </Section>
    </div>
  );
}

// â”€â”€â”€ Main panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function Component() {
  return <DoclingConfigPanel />;
}

export function DoclingConfigPanel() {
  useShellHeaderTitle({ title: 'Profiles', breadcrumbs: ['Blockdata Admin', 'Docling', 'Profiles'] });

  const [profiles, setProfiles] = useState<ParsingProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<DoclingConfig | null>(null);
  const [savedConfig, setSavedConfig] = useState<DoclingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Block presentation mode (from platform-api, not profile config)
  const [blockMode, setBlockMode] = useState<DocumentViewMode>(DEFAULT_DOCUMENT_VIEW_MODE);
  const [blockModeServer, setBlockModeServer] = useState<DocumentViewMode>(DEFAULT_DOCUMENT_VIEW_MODE);
  const [blockModeSaving, setBlockModeSaving] = useState(false);
  const blockModeDirty = blockMode !== blockModeServer;

  useEffect(() => {
    (async () => {
      try {
        const resp = await platformApiFetch('/admin/config/docling');
        if (!resp.ok) return;
        const data = await resp.json() as { docling_blocks_mode?: unknown };
        const mode = normalizeDocumentViewMode(data.docling_blocks_mode);
        setBlockMode(mode);
        setBlockModeServer(mode);
      } catch { /* fallback to default */ }
    })();
  }, []);

  const handleBlockModeSave = useCallback(async () => {
    if (blockModeSaving || !blockModeDirty) return;
    setBlockModeSaving(true);
    try {
      const resp = await platformApiFetch('/admin/config/docling', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docling_blocks_mode: blockMode, reason: 'Block presentation mode update' }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }
      setBlockModeServer(blockMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save block presentation mode');
    } finally {
      setBlockModeSaving(false);
    }
  }, [blockMode, blockModeDirty, blockModeSaving]);

  const isDirty = useMemo(() => {
    if (!editConfig || !savedConfig) return false;
    return JSON.stringify(editConfig) !== JSON.stringify(savedConfig);
  }, [editConfig, savedConfig]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId) ?? null,
    [profiles, selectedId],
  );

  const selectedProfileConfig = useMemo(
    () => (selectedProfile ? (selectedProfile.config as DoclingConfig) : null),
    [selectedProfile],
  );

  const profileCollection = useMemo(
    () => createListCollection<ProfileOption>({
      items: profiles.map((profile) => {
        const config = profile.config as DoclingConfig;
        return {
          label: config.name ?? 'Unnamed',
          value: profile.id,
          isDefault: Boolean(config.is_default),
        };
      }),
    }),
    [profiles],
  );

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('parsing_profiles')
        .select('*')
        .eq('parser', 'docling')
        .order('id');
      if (err) throw err;
      setProfiles(data ?? []);
      if (data && data.length > 0) {
        const current = selectedId ? data.find((p) => p.id === selectedId) : null;
        const target = current ?? data[0]!;
        setSelectedId(target.id);
        setEditConfig(target.config as DoclingConfig);
        setSavedConfig(target.config as DoclingConfig);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadProfiles();
  }, []);

  const selectProfile = useCallback((profile: ParsingProfile) => {
    setSelectedId(profile.id);
    setEditConfig(profile.config as DoclingConfig);
    setSavedConfig(profile.config as DoclingConfig);
  }, []);

  const handleProfileChange = useCallback((nextId: string | null) => {
    if (!nextId) return;
    const profile = profiles.find((item) => item.id === nextId);
    if (profile) {
      selectProfile(profile);
    }
  }, [profiles, selectProfile]);

  const handleSave = useCallback(async () => {
    if (!selectedId || !editConfig || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('parsing_profiles')
        .update({ config: editConfig })
        .eq('id', selectedId);
      if (err) throw err;
      setSavedConfig(structuredClone(editConfig));
      setProfiles((prev) =>
        prev.map((p) => (p.id === selectedId ? { ...p, config: editConfig as Record<string, unknown> } : p)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [selectedId, editConfig, saving]);

  const handleCreate = useCallback(async () => {
    setError(null);
    try {
      const newConfig: DoclingConfig = {
        name: 'New Profile',
        description: '',
        pipeline: 'standard',
        pdf_pipeline: {
          do_ocr: true,
          ocr_options: { kind: 'easyocr', lang: ['en'] },
          layout_options: { model: 'heron' },
          do_table_structure: true,
          table_structure_options: { mode: 'fast', do_cell_matching: true },
        },
        enrichments: {},
      };
      const { data, error: err } = await supabase
        .from('parsing_profiles')
        .insert({ parser: 'docling', config: newConfig })
        .select()
        .single();
      if (err) throw err;
      if (data) {
        setProfiles((prev) => [...prev, data]);
        selectProfile(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    }
  }, [selectProfile]);

  const handleDuplicate = useCallback(async () => {
    if (!editConfig) return;
    setError(null);
    try {
      const dupeConfig = { ...structuredClone(editConfig), name: `${editConfig.name ?? 'Profile'} (copy)`, is_default: false };
      const { data, error: err } = await supabase
        .from('parsing_profiles')
        .insert({ parser: 'docling', config: dupeConfig })
        .select()
        .single();
      if (err) throw err;
      if (data) {
        setProfiles((prev) => [...prev, data]);
        selectProfile(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate profile');
    }
  }, [editConfig, selectProfile]);

  const handleDelete = useCallback(async () => {
    if (!selectedId) return;
    const profile = profiles.find((p) => p.id === selectedId);
    if (!profile) return;
    const config = profile.config as DoclingConfig;
    if (config.is_default) {
      setError('Cannot delete the default profile');
      return;
    }
    if (!window.confirm(`Delete "${config.name ?? 'this profile'}"?`)) return;
    setError(null);
    try {
      const { error: err } = await supabase
        .from('parsing_profiles')
        .delete()
        .eq('id', selectedId);
      if (err) throw err;
      const remaining = profiles.filter((p) => p.id !== selectedId);
      setProfiles(remaining);
      if (remaining.length > 0) {
        selectProfile(remaining[0]!);
      } else {
        setSelectedId(null);
        setEditConfig(null);
        setSavedConfig(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete profile');
    }
  }, [selectedId, profiles, selectProfile]);


  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
        {error && (
          <div className="border-b border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-3 py-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
            <div className="min-w-[220px] max-w-sm flex-1">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Active profile
              </div>
              <ArkSelect.Root
                collection={profileCollection}
                value={selectedId ? [selectedId] : []}
                onValueChange={(details) => handleProfileChange(details.value[0] ?? null)}
                disabled={profileCollection.items.length === 0}
                positioning={{ placement: 'bottom-start', sameWidth: true, offset: { mainAxis: 6 }, strategy: 'fixed' }}
              >
                <ArkSelect.Control className="relative">
                  <ArkSelect.Trigger className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60">
                    <ArkSelect.ValueText placeholder="Select a profile" />
                    <ArkSelect.Indicator className="ml-2 shrink-0 text-muted-foreground">
                      <span aria-hidden="true">v</span>
                    </ArkSelect.Indicator>
                  </ArkSelect.Trigger>
                </ArkSelect.Control>
                <Portal>
                  <ArkSelect.Positioner className="z-50">
                    <ArkSelect.Content className="max-h-72 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
                      {profileCollection.items.map((item) => (
                        <ArkSelect.Item
                          key={item.value}
                          item={item}
                          className={cn(
                            'flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm text-popover-foreground',
                            'data-[state=checked]:bg-accent data-[state=checked]:font-medium',
                            'data-highlighted:bg-accent data-highlighted:outline-none',
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <ArkSelect.ItemText>{item.label}</ArkSelect.ItemText>
                            {item.isDefault && (
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-primary">
                                default
                              </span>
                            )}
                          </div>
                          <ArkSelect.ItemIndicator className="text-primary">Selected</ArkSelect.ItemIndicator>
                        </ArkSelect.Item>
                      ))}
                    </ArkSelect.Content>
                  </ArkSelect.Positioner>
                </Portal>
                <ArkSelect.HiddenSelect />
              </ArkSelect.Root>
            </div>

            {selectedProfileConfig?.is_default && (
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-primary">
                Default profile
              </span>
            )}

            {isDirty && (
              <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">
                Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { void handleCreate(); }}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Add profile"
            >
              <IconPlus size={13} />
              Add Profile
            </button>
            <button
              type="button"
              onClick={() => { void handleDuplicate(); }}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Duplicate profile"
            >
              <IconCopy size={13} />
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => { void handleDelete(); }}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-red-500 hover:bg-red-500/10"
              title="Delete profile"
            >
              <IconTrash size={13} />
            </button>
            <button
              type="button"
              onClick={() => { void handleSave(); }}
              disabled={!isDirty || saving}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <IconDeviceFloppy size={13} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Block presentation mode (absorbed from former Block Types page) */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">Block Presentation</div>
            <div className="text-xs text-muted-foreground">Parse Blocks uses Docling-native labels and reading order.</div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={blockMode}
              onChange={(e) => setBlockMode(e.currentTarget.value as DocumentViewMode)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
            >
              <option value="raw_docling">Docling Native</option>
            </select>
            {blockModeDirty && (
              <button
                type="button"
                onClick={() => { void handleBlockModeSave(); }}
                disabled={blockModeSaving}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <IconDeviceFloppy size={13} />
                {blockModeSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading docling profiles...
          </div>
        ) : editConfig ? (
          <ScrollArea className="min-h-0 flex-1" contentClass="p-3 space-y-3">
            <ConfigEditor config={editConfig} onChange={setEditConfig} />
          </ScrollArea>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
            No profiles. Click "Add Profile" to create one.
          </div>
        )}
    </div>
  );
}
```

## `web/src/pages/superuser/SuperuserApiEndpoints.tsx`

```tsx
import { useEffect, useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { platformApiFetch } from '@/lib/platformApi';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EndpointRow = {
  method: string;
  path: string;
  group: string;
  summary: string;
  auth: string;
  source: 'route' | 'plugin';
};

type OpenApiOperation = {
  tags?: string[];
  summary?: string;
  security?: Record<string, string[]>[];
  'x-required-role'?: string;
};

type OpenApiSpec = {
  paths?: Record<string, Record<string, OpenApiOperation>>;
};

type PluginFunction = {
  function_name: string;
  path: string;
  method: string;
  task_type: string;
  parameter_schema?: { name: string; type: string; required?: boolean }[];
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function resolveAuth(detail: OpenApiOperation): string {
  // Custom role extension takes precedence
  if (detail['x-required-role']) return detail['x-required-role'];
  // OpenAPI security field: empty array = public, present = auth required
  if (!detail.security || detail.security.length === 0) return 'none';
  // Check what schemes are listed
  const schemes = detail.security.flatMap((s) => Object.keys(s));
  if (schemes.includes('HTTPBearer')) return 'bearer';
  if (schemes.includes('APIKeyHeader')) return 'api_key (deprecated)';
  return 'bearer';
}

function getCatchAllAuth(spec: OpenApiSpec): string {
  const catchAll = spec.paths?.['/{function_name}']?.['post'];
  return catchAll ? resolveAuth(catchAll) : 'bearer';
}

function parseOpenApi(spec: OpenApiSpec): EndpointRow[] {
  const rows: EndpointRow[] = [];
  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    // Skip the catch-all plugin route â€” plugins are listed separately
    if (path === '/{function_name}') continue;
    for (const [method, detail] of Object.entries(methods)) {
      if (method === 'parameters') continue;
      rows.push({
        method: method.toUpperCase(),
        path,
        group: detail.tags?.[0] ?? 'other',
        summary: detail.summary ?? '',
        auth: resolveAuth(detail),
        source: 'route',
      });
    }
  }
  return rows;
}

function parsePlugins(functions: PluginFunction[], pluginAuth: string): EndpointRow[] {
  return functions.map((fn) => ({
    method: fn.method.toUpperCase(),
    path: fn.path.startsWith('/') ? fn.path : `/${fn.path}`,
    group: fn.task_type.split('.').slice(-2, -1)[0] || 'plugin',
    summary: `${fn.task_type}`,
    auth: pluginAuth,
    source: 'plugin' as const,
  }));
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-600 dark:text-emerald-400',
  POST: 'text-blue-600 dark:text-blue-400',
  PUT: 'text-amber-600 dark:text-amber-400',
  DELETE: 'text-red-600 dark:text-red-400',
  PATCH: 'text-purple-600 dark:text-purple-400',
};

const inputClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Component() {
  useShellHeaderTitle({ title: 'API Endpoints', breadcrumbs: ['Blockdata Admin', 'API Endpoints'] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<EndpointRow[]>([]);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'route' | 'plugin'>('all');
  const [groupFilter, setGroupFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [specResp, fnResp] = await Promise.all([
          platformApiFetch('/openapi.json'),
          platformApiFetch('/functions'),
        ]);

        if (!specResp.ok) throw new Error(`OpenAPI fetch failed: ${specResp.status}`);
        if (!fnResp.ok) throw new Error(`Functions fetch failed: ${fnResp.status}`);

        const spec = (await specResp.json()) as OpenApiSpec;
        const functions = (await fnResp.json()) as PluginFunction[];

        const routeRows = parseOpenApi(spec);
        const pluginAuth = getCatchAllAuth(spec);
        const pluginRows = parsePlugins(functions, pluginAuth);
        setEndpoints([...routeRows, ...pluginRows]);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const groups = useMemo(() => {
    const set = new Set(endpoints.map((e) => e.group));
    return ['all', ...Array.from(set).sort()];
  }, [endpoints]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return endpoints.filter((row) => {
      if (sourceFilter !== 'all' && row.source !== sourceFilter) return false;
      if (groupFilter !== 'all' && row.group !== groupFilter) return false;
      if (!q) return true;
      return [row.method, row.path, row.group, row.summary, row.auth, row.source]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [endpoints, search, sourceFilter, groupFilter]);

  const routeCount = endpoints.filter((e) => e.source === 'route').length;
  const pluginCount = endpoints.filter((e) => e.source === 'plugin').length;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {error && <ErrorAlert message={error} />}
      {loading && !error && (
        <p className="p-4 text-sm text-muted-foreground">Loading API endpoints...</p>
      )}

      {!loading && !error && (
        <>
          {/* Summary + Filters â€” pinned */}
          <div className="space-y-3 px-3 pt-3 md:px-4 md:pt-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{endpoints.length} endpoints</span>
              <span>{routeCount} routes</span>
              <span>{pluginCount} plugins</span>
            </div>

            <div className="grid gap-2 md:grid-cols-[1fr_160px_180px]">
              <input
                className={inputClass}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                placeholder="Search method, path, group, summary..."
              />
              <select
                className={inputClass}
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.currentTarget.value as typeof sourceFilter)}
              >
                <option value="all">All sources</option>
                <option value="route">Routes only</option>
                <option value="plugin">Plugins only</option>
              </select>
              <select
                className={inputClass}
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.currentTarget.value)}
              >
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g === 'all' ? 'All groups' : g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table â€” scrolls within container */}
          <div className="min-h-0 flex-1 px-3 pb-3 pt-3 md:px-4 md:pb-4">
            <ScrollArea className="h-full rounded-md border border-border">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-[1] bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="w-[70px] px-3 py-2 font-medium">Method</th>
                    <th className="px-3 py-2 font-medium">Path</th>
                    <th className="w-[100px] px-3 py-2 font-medium">Group</th>
                    <th className="px-3 py-2 font-medium">Summary</th>
                    <th className="w-[100px] px-3 py-2 font-medium">Auth</th>
                    <th className="w-[70px] px-3 py-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr
                      key={`${row.method}-${row.path}`}
                      className={cn(
                        'border-t border-border align-top hover:bg-accent/40',
                        i % 2 === 0 && 'bg-muted/20',
                      )}
                    >
                      <td className={cn('whitespace-nowrap px-3 py-2 font-mono font-semibold', METHOD_COLORS[row.method])}>
                        {row.method}
                      </td>
                      <td className="px-3 py-2 font-mono text-foreground">{row.path}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.group}</td>
                      <td className="max-w-[400px] truncate px-3 py-2 text-muted-foreground" title={row.summary}>
                        {row.summary}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                            row.auth === 'none' && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                            row.auth === 'bearer' && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                            row.auth === 'platform_admin' && 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                          )}
                        >
                          {row.auth}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                            row.source === 'route' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
                            row.source === 'plugin' && 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
                          )}
                        >
                          {row.source}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">No endpoints match current filters.</p>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}
```

## `web/src/pages/superuser/SuperuserAuditHistory.tsx`

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
  superuser: { user_id: string; email: string };
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

## `web/src/pages/superuser/SuperuserInstanceConfig.tsx`

```tsx
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { InstanceConfigPanel } from '@/pages/settings/InstanceConfigPanel';

export function Component() {
  useShellHeaderTitle({ title: 'Instance Config', breadcrumbs: ['Blockdata Admin', 'Instance Config'] });

  return (
    <div className="h-full min-h-0">
      <InstanceConfigPanel />
    </div>
  );
}
```

## `web/src/pages/superuser/SuperuserWorkerConfig.tsx`

```tsx
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { WorkerConfigPanel } from '@/pages/settings/WorkerConfigPanel';

export function Component() {
  useShellHeaderTitle({ title: 'Worker Config', breadcrumbs: ['Blockdata Admin', 'Worker Config'] });

  return (
    <div className="h-full min-h-0">
      <WorkerConfigPanel />
    </div>
  );
}
```

## `web/src/router.tsx`

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
        element: <AdminShellLayout />,
        children: [
          { path: '/app/superuser/parsers-docling', element: <Navigate to="/app/blockdata-admin/parsers-docling" replace /> },
          { path: '/app/superuser/instance-config', element: <Navigate to="/app/blockdata-admin/instance-config" replace /> },
          { path: '/app/superuser/worker-config', element: <Navigate to="/app/blockdata-admin/worker-config" replace /> },
          { path: '/app/superuser/audit', element: <Navigate to="/app/blockdata-admin/audit" replace /> },
          { path: '/app/superuser/api-endpoints', element: <Navigate to="/app/blockdata-admin/api-endpoints" replace /> },
          { path: '/app/superuser/test-integrations', element: <Navigate to="/app/blockdata-admin/test-integrations" replace /> },
          { path: '/app/superuser/ai-providers', element: <Navigate to="/app/blockdata-admin/ai-providers" replace /> },
          { path: '/app/superuser/ai-providers/:providerId', element: <Navigate to="/app/blockdata-admin/ai-providers" replace /> },
          { path: '/app/superuser/model-roles', element: <Navigate to="/app/blockdata-admin/model-roles" replace /> },
          { path: '/app/superuser/connections', element: <Navigate to="/app/blockdata-admin/connections" replace /> },
          { path: '/app/superuser/mcp', element: <Navigate to="/app/blockdata-admin/mcp" replace /> },
          {
            path: '/app/blockdata-admin',
            element: <BlockdataAdminGuard />,
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
          {
            path: '/app/agchain-admin',
            element: <AgchainAdminGuard />,
            children: [
              { index: true, element: <Navigate to="/app/agchain-admin/models" replace /> },
              {
                path: 'models',
                lazy: async () => ({ Component: (await import('@/pages/admin/AgchainAdminModelsPage')).default }),
              },
            ],
          },
          {
            path: '/app/superuser',
            element: <SuperuserGuard />,
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


