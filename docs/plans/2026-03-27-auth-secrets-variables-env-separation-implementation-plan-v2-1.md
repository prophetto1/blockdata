# Auth, Secrets, Variables, and Env Separation Implementation Plan (v2.2)

**Goal:** Separate identity/auth concerns from secret storage and runtime configuration, make the frontend use one canonical user-facing secrets surface, and harden backend secret handling so sensitive user values are treated as secrets — with backward-compatible dual-key decryption that preserves all existing encrypted rows.

**Architecture:** Keep hosted Supabase Auth as the identity and session authority. Keep services/platform-api as the app-owned secret control plane and trusted runtime resolution layer. Preserve user_provider_connections as the separate store for structured provider credentials. Make the canonical user-facing management surface Settings / Secrets, keep /app/secrets as a compatibility redirect for one phase. Harden the existing user_variables store into a route-only encrypted secret store, expose it through /secrets, and use a dedicated application encryption root secret (APP_SECRET_ENVELOPE_KEY) for all new encryptions. Existing rows encrypted with SUPABASE_SERVICE_ROLE_KEY remain readable through a backward-compatible dual-key decrypt fallback, and the hardening migration canonicalizes legacy `public.user_variables.name` values to uppercase so exact-name runtime lookup stays simple after deploy. user_api_keys is excluded from the crypto root split in this plan because its encrypt path is in a Deno edge function with an incompatible key derivation. `pipeline-worker` is explicitly not upgraded to user-scoped secret resolution in this plan because its deprecated `POST /{function_name}` route has no trusted authenticated-user seam; worker secret lookup remains env-only until a separate authenticated migration or decommissioning plan lands.

**Tech Stack:** Supabase Postgres migrations, FastAPI, Supabase Python client, React + TypeScript, existing crypto helpers, OpenTelemetry, pytest, Vitest.

- **Status:** Draft - implementation-ready revision
- **Author:** v2.2 revision (corrects v2.1 worker trust, secret-name normalization, and verification omissions)
- **Date:** 2026-03-27

## v1 Defect This Plan Corrects

The v1 plan declared both "No data rewrite; existing rows remain intact" (migration section) and "SUPABASE_SERVICE_ROLE_KEY is no longer used as the crypto root" (Locked Acceptance #10). These are contradictory — switching the decrypt key without a compatibility path makes existing encrypted rows unreadable. The v1 plan also omitted model_registry.py (which decrypts user_api_keys) from its modified files inventory.

This v2 plan resolves the contradiction by introducing dual-key decrypt fallback, scoping the crypto root split to Python-only encrypt/decrypt paths, and explicitly excluding user_api_keys until its Deno edge function encrypt path is migrated.

## v2 Defects This Plan Corrects

The v2 plan still had three implementation-blocking defects after the crypto contradiction was fixed:

- Task 7 rewrote `ExecutionContext.get_secret()` as a synchronous method even though the current `platform-api` and `pipeline-worker` seams are both async.
- The plan required worker-side user-scoped secret resolution but never carried `user_id` through the existing worker request and context models.
- The locked inventory counts and verification commands did not match the actual files and runtime surfaces that the plan required implementers to modify.

This v2 baseline revision preserved the async secret-resolution seam and re-locked the inventory and verification sections, but it still assumed worker-side user identity could be trusted once propagated. That remaining assumption is corrected in v2.2 below.

## v2.1 Defects This Plan Corrects

The v2.1 plan still had three approval-blocking defects after the runtime seam and inventory issues were addressed:

- It treated deprecated `pipeline-worker` request-body `user_id` as a trusted user identity source even though the worker route has no auth dependency or caller-bound user principal.
- Its runtime lookup example queried `user_variables` by exact `name` match even though the live storage contract is case-insensitive via the `(user_id, lower(name))` unique index.
- Its verification contract omitted `services/platform-api/tests/infra/test_execution_context.py` even though the plan modifies `ExecutionContext.get_secret()`.

This v2.2 revision removes worker user-scoped secret propagation from scope, locks secret names to a canonical uppercase representation at write/read boundaries, and updates the locked inventory and verification sweep to cover the actual execution-context seam being changed.

## Crypto Call Site Inventory (verified from live code)

| File | Op | Table | Context | Line |
| --- | --- | --- | --- | --- |
| variables.py | encrypt | user_variables | user-variables-v1 | 80, 105 |
| connections.py | encrypt | user_provider_connections | provider-connections-v1 | 62 |
| connection.py | decrypt | user_provider_connections | provider-connections-v1 | 32 |
| services/platform-api/app/domain/agchain/model_registry.py | decrypt | user_api_keys | user-api-keys-v1 | 288 |
| user-api-keys/index.ts (edge fn) | encrypt | user_api_keys | user-api-keys-v1 | 83 |

## Key Derivation Incompatibility (pre-existing, discovered during investigation)

Python crypto.py derives keys as SHA256(secret + context). The Deno edge function api_key_crypto.ts derives keys as SHA256(secret + "\n" + context + "\n"). These produce different keys from the same inputs. This means the Python decrypt_with_context in model_registry.py cannot decrypt rows written by the Deno edge function. This is a pre-existing bug not introduced by this plan. It is documented here as a discovered risk and excluded from scope.

## Manifest

### Platform API

| Verb | Path | Action | Status |
| --- | --- | --- | --- |
| GET | /secrets | List authenticated user secret metadata | New |
| POST | /secrets | Create authenticated user secret from plaintext input and return metadata only | New |
| PATCH | /secrets/{secret_id} | Update metadata and optionally rotate plaintext secret value | New |
| DELETE | /secrets/{secret_id} | Delete authenticated user secret | New |
| GET | /variables | Compatibility alias for the current secret store | Existing — mark deprecated, mirror /secrets |
| POST | /variables | Compatibility alias for the current secret store | Existing — mark deprecated, mirror /secrets |
| PATCH | /variables/{variable_id} | Compatibility alias for the current secret store | Existing — mark deprecated, mirror /secrets |
| DELETE | /variables/{variable_id} | Compatibility alias for the current secret store | Existing — mark deprecated, mirror /secrets |
| GET | /connections | Read provider connection metadata | Existing — no contract changes |
| POST | /connections/connect | Save encrypted provider credentials | Existing — internal crypto key source changes, API contract unchanged |
| POST | /connections/disconnect | Revoke provider credential record | Existing — no contract changes |
| POST | /connections/test | Resolve and test a saved provider connection | Existing — internal decrypt uses dual-key fallback, API contract unchanged |
| POST | /auth/oauth/attempts | Track OAuth attempt lifecycle | Existing — no contract changes |
| POST | /auth/oauth/attempts/{attempt_id}/events | Record OAuth callback events | Existing — no contract changes |

### New endpoint contracts

#### GET /secrets

- **Auth:** require_user_auth
- **Request:** no body
- **Response:** `{ "secrets": SecretMetadata[] }`
- **Touches:** `public.user_variables`
- **Returns metadata only:** `id`, `name`, `description`, `value_kind`, `value_suffix`, `created_at`, `updated_at`

#### POST /secrets

- **Auth:** require_user_auth
- **Request:** `{ "name": string, "value": string, "description"?: string | null, "value_kind"?: "secret" | "token" | "api_key" | "client_secret" | "webhook_secret" }`
- **Response:** `{ "secret": SecretMetadata }`
- **Touches:** `public.user_variables`
- Encrypts server-side with `APP_SECRET_ENVELOPE_KEY` before insert; never returns plaintext or ciphertext
- Secret names are case-insensitive on input and are canonicalized to uppercase in storage and metadata responses

#### PATCH /secrets/{secret_id}

- **Auth:** require_user_auth
- **Request:** `{ "name"?: string, "value"?: string, "description"?: string | null, "value_kind"?: string }`
- **Response:** `{ "secret": SecretMetadata }`
- **Touches:** `public.user_variables`
- When value is present, re-encrypts with `APP_SECRET_ENVELOPE_KEY` and updates suffix metadata
- When `name` is present, the backend canonicalizes it to uppercase before uniqueness checks and persistence

#### DELETE /secrets/{secret_id}

- **Auth:** require_user_auth
- **Request:** no body
- **Response:** `{ "ok": true, "id": string }`
- **Touches:** `public.user_variables`

### Modified endpoint contracts

#### GET/POST/PATCH/DELETE /variables

- **Change:** retain as compatibility aliases to the same secret-management implementation, emit deprecation response metadata, and stop describing the surface as "Variables" in user-facing responses or OpenAPI summaries.
- **Compatibility response shape:** preserve the existing `{"variables": [...]}` / `{"variable": {...}}` body keys in this phase so deprecated callers continue to work. The canonical `/secrets` surface uses `{"secrets": [...]}` / `{"secret": {...}}`.
- **Implementation constraint:** keep this inside `variables.py` by calling the same handler functions used by `/secrets` directly; do not introduce a new shared service module in this phase.
- **Why:** the current backend already exposes /variables, but the mounted frontend does not use a Variables settings surface and the stored values are secret-valued rather than general-purpose non-secret config.

#### POST /connections/connect

- **Change:** internal encrypt call uses APP_SECRET_ENVELOPE_KEY instead of SUPABASE_SERVICE_ROLE_KEY. API request/response contract unchanged.
- **Why:** crypto root split.

#### POST /connections/test

- **Change:** internal decrypt uses dual-key fallback (try APP_SECRET_ENVELOPE_KEY first, fall back to SUPABASE_SERVICE_ROLE_KEY). API request/response contract unchanged.
- **Why:** existing encrypted rows must remain readable after key split.

### Pipeline Worker Compatibility Surface

No `pipeline-worker` route contract changes in this plan.

- `POST /{function_name}` remains unchanged.
- `pipeline-worker` secret lookup remains env-only in this plan.
- User-scoped secret resolution is introduced only in `services/platform-api`, where the request already carries an authenticated principal.

## Observability

| Type | Name | Where | Purpose |
| --- | --- | --- | --- |
| Trace span | secrets.list | services/platform-api/app/api/routes/secrets.py:list_secrets | Measure metadata-list latency and failures |
| Trace span | secrets.create | services/platform-api/app/api/routes/secrets.py:create_secret | Measure create latency and validation failures |
| Trace span | secrets.update | services/platform-api/app/api/routes/secrets.py:update_secret | Measure rotate/update latency and missing-row failures |
| Trace span | secrets.delete | services/platform-api/app/api/routes/secrets.py:delete_secret | Measure delete latency and missing-row failures |
| Trace span | secrets.resolve | services/platform-api/app/domain/plugins/models.py:get_secret | Measure runtime resolution source and misses |
| Metric | platform.secrets.list.count | secrets.py:list_secrets | Count list requests |
| Metric | platform.secrets.change.count | secrets.py:create_secret, update_secret, delete_secret | Count create, rotate, and delete actions |
| Metric | platform.secrets.resolve.count | platform-api runtime get_secret() implementation | Count runtime hits, env fallbacks, and misses |
| Metric | platform.crypto.fallback.count | crypto.py:decrypt_with_fallback | Count how often legacy-key fallback is needed (measures rotation progress) |
| Structured log | secrets.changed | secrets.py create/update/delete handlers | Audit action and result without logging names or values |

### Observability Attribute Rules

- **Allowed attributes:** action, result, value_kind, resolution_source, caller, http.status_code, crypto.key_source (primary or fallback)
- **Forbidden in trace or metric attributes:** user_id, email, secret_id, secret names, suffixes, plaintext values, ciphertext, env keys, connection ids, OAuth attempt secrets, auth tokens

## Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
| --- | --- | --- |
| 20260327110000_user_secret_store_hardening.sql | Hardens public.user_variables into a route-only secret store by revoking direct browser table access, preserving service-role access, retaining owner-bound RLS, canonicalizing existing `name` values to uppercase, and clarifying table comments/default semantics as secret storage | Limited data rewrite: existing `public.user_variables.name` values are updated to uppercase canonical form. No ciphertext rewrite. Existing rows encrypted with SUPABASE_SERVICE_ROLE_KEY remain readable through dual-key decrypt fallback introduced later in this plan |

## Edge Functions

No edge functions created or modified.

The user-api-keys edge function continues to encrypt user_api_keys rows with SUPABASE_SERVICE_ROLE_KEY using the Deno key derivation. This plan does not change that path. A separate future plan should migrate the API key encrypt/decrypt surface to platform-api with a consistent key derivation and the APP_SECRET_ENVELOPE_KEY root.

## Frontend Surface Area

**New pages/routes:** 1

| Page | File | Route |
| --- | --- | --- |
| SettingsSecrets | web/src/pages/settings/SettingsSecrets.tsx | /app/settings/secrets |

**New components:** 2

| Component | File | Used by |
| --- | --- | --- |
| SecretsTable | web/src/components/settings/SecretsTable.tsx | SettingsSecrets.tsx |
| SecretEditorDialog | web/src/components/settings/SecretEditorDialog.tsx | SettingsSecrets.tsx |

**New libraries/services:** 1

| File | Purpose |
| --- | --- |
| web/src/lib/secretsApi.ts | Typed frontend client for /secrets CRUD and compatibility error handling |

**Modified pages:** 2

| Page | File | What changes |
| --- | --- | --- |
| SecretsPage | web/src/pages/SecretsPage.tsx | Replace placeholder with compatibility redirect to /app/settings/secrets |
| Router settings subtree | web/src/router.tsx | Mount /app/settings/secrets and keep /app/secrets compatibility path |

**Modified support files:** 6

| File | What changes |
| --- | --- |
| web/src/pages/settings/index.ts | Export SettingsSecrets |
| web/src/pages/settings/settings-nav.ts | Add Secrets under settings navigation |
| web/src/pages/settings/settings-nav.test.ts | Verify Secrets appears and resolves correctly |
| web/src/components/shell/nav-config.ts | Point Secrets to canonical settings route /app/settings/secrets |
| web/src/components/shell/nav-config.test.ts | Verify shell nav points to canonical secrets surface |
| web/src/components/common/useShellHeaderTitle.test.tsx | Verify breadcrumb/title resolves Settings / Secrets |

## Pre-Implementation Contract

No major product, API, observability, auth-boundary, crypto-boundary, or terminology decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

## Locked Product Decisions

- The current live frontend secret-management menu label is Secrets, not Variables.
- There is no mounted frontend settings/menu surface named Variables for secret management today.
- The canonical user-facing management surface in this phase is Settings / Secrets at /app/settings/secrets.
- /app/secrets remains only as a compatibility redirect for one phase; it is not the long-term canonical route.
- Hosted Supabase Auth remains the identity and session authority. Secret CRUD and secret storage do not move into Supabase Auth tables or APIs.
- Connections remains a distinct product surface for structured provider credentials. It is not merged into Secrets in this phase.
- Environment variables remain deployment/runtime configuration owned by the process environment and .env, not user-managed config rows.
- The existing public.user_variables table is treated as the physical secret store for this phase; the product surface and API surface are canonicalized to Secrets without a risky table rename.
- Secret names are case-insensitive. The hardening migration canonicalizes existing `public.user_variables.name` values to uppercase, and all future write/read boundaries use the uppercase canonical form. The persisted `name` value and metadata responses use the uppercase canonical form.
- New secret encryptions use APP_SECRET_ENVELOPE_KEY. Decrypt paths try APP_SECRET_ENVELOPE_KEY first and fall back to SUPABASE_SERVICE_ROLE_KEY for rows encrypted before the rotation. Both env vars are required until a separate rotation plan re-encrypts all existing rows.
- Trusted runtime resolution order is: user secret hit (decrypted via dual-key fallback), then env fallback, then empty string or explicit miss behavior. Browser code never resolves plaintext secret values from storage rows.
- `services/platform-api` is the only runtime in scope for new user-scoped secret resolution. `pipeline-worker` remains a deprecated env-only compatibility surface and does not gain request-body identity propagation in this plan.
- user_api_keys is excluded from the crypto root split. Its encrypt path is in the Deno user-api-keys edge function, and the Deno/Python key derivations are incompatible. A separate plan handles that migration.
- model_registry.py decrypt stays on SUPABASE_SERVICE_ROLE_KEY only. It is not converted to dual-key fallback in this plan because the rows it reads are encrypted by Deno with an incompatible derivation. Changing the primary key would not help.

## Locked Acceptance Contract

The implementation is only complete when all of the following are true:

- The frontend settings navigation visibly includes Secrets.
- There is still no frontend settings/menu entry named Variables for secret management.
- Visiting /app/secrets redirects to /app/settings/secrets.
- The Settings / Secrets page can list, create, update, and delete authenticated user secrets through platform-api.
- Secret list/detail responses return metadata only and never plaintext values or ciphertext blobs.
- Secret creation, update, and runtime lookup are case-insensitive, persisted/returned secret names are canonicalized to uppercase, and legacy `public.user_variables.name` rows are normalized to that same uppercase canonical form by the migration.
- Direct browser table access to public.user_variables is no longer sufficient to read or mutate secret rows.
- `services/platform-api` `ExecutionContext.get_secret()` remains async, normalizes the requested secret name before querying storage, resolves a user-scoped secret when a user id is present, and falls back to env only when no user secret exists.
- `pipeline-worker` route shape and auth behavior are unchanged in this plan.
- Connections flows continue to work without being merged into Secrets.
- OAuth login behavior is unchanged.
- All new encrypt operations use APP_SECRET_ENVELOPE_KEY. All decrypt operations on user_variables and user_provider_connections try APP_SECRET_ENVELOPE_KEY first with backward-compatible fallback to SUPABASE_SERVICE_ROLE_KEY. Both env vars are required.
- Existing encrypted rows in user_variables and user_provider_connections remain readable after deployment with no ciphertext rewrite.
- Existing `public.user_variables.name` values are normalized to uppercase during the hardening migration.
- The platform.crypto.fallback.count metric is emitting, providing visibility into how many rows still need rotation.

## Locked Platform API Surface

**New authenticated user endpoints:** 4

- GET /secrets
- POST /secrets
- PATCH /secrets/{secret_id}
- DELETE /secrets/{secret_id}

**Existing endpoints deprecated as compatibility aliases:** 4

- GET /variables
- POST /variables
- PATCH /variables/{variable_id}
- DELETE /variables/{variable_id}

**Existing endpoints with internal crypto changes:** 2

- POST /connections/connect — encrypt with APP_SECRET_ENVELOPE_KEY
- POST /connections/test — decrypt with dual-key fallback

**Existing endpoints reused as-is:** 4

- GET /connections
- POST /connections/disconnect
- POST /auth/oauth/attempts
- POST /auth/oauth/attempts/{attempt_id}/events

## Locked Worker Compatibility Surface

**Modified existing compatibility endpoint surfaces:** 0

- `pipeline-worker` `POST /{function_name}` remains unchanged in this plan

## Locked Observability Surface

**New traces:** 5

- secrets.list
- secrets.create
- secrets.update
- secrets.delete
- secrets.resolve

**New metrics:** 4

- platform.secrets.list.count
- platform.secrets.change.count
- platform.secrets.resolve.count
- platform.crypto.fallback.count

**New structured logs:** 1

- secrets.changed

## Locked Inventory Counts

### Database

- New migrations: 1
- Modified existing migrations: 0

### Backend

- New route modules: 1
- Modified existing backend modules: 7

### Shared Config

- Modified existing shared config files: 1

### Frontend

- New top-level pages/routes: 1
- New visual components: 2
- New frontend libraries/services: 1
- Modified existing frontend files: 8

### Tests

- New test modules: 2
- Modified existing test modules: 8

## Locked File Inventory

### New files

- supabase/migrations/20260327110000_user_secret_store_hardening.sql
- services/platform-api/app/api/routes/secrets.py
- services/platform-api/tests/test_secrets.py
- web/src/lib/secretsApi.ts
- web/src/pages/settings/SettingsSecrets.tsx
- web/src/pages/settings/SettingsSecrets.test.tsx
- web/src/components/settings/SecretsTable.tsx
- web/src/components/settings/SecretEditorDialog.tsx

### Modified files

- services/platform-api/app/infra/crypto.py
- services/platform-api/app/core/config.py
- services/platform-api/app/api/routes/variables.py
- services/platform-api/app/api/routes/connections.py
- services/platform-api/app/infra/connection.py
- services/platform-api/app/main.py
- services/platform-api/app/domain/plugins/models.py
- .env.example
- web/src/router.tsx
- web/src/pages/SecretsPage.tsx
- web/src/pages/settings/index.ts
- web/src/pages/settings/settings-nav.ts
- web/src/pages/settings/settings-nav.test.ts
- web/src/components/shell/nav-config.ts
- web/src/components/shell/nav-config.test.ts
- web/src/components/common/useShellHeaderTitle.test.tsx
- services/platform-api/tests/test_variables.py
- services/platform-api/tests/test_connections.py
- services/platform-api/tests/test_plugins.py
- services/platform-api/tests/infra/test_crypto.py
- services/platform-api/tests/infra/test_execution_context.py

## Frozen Crypto Seam Contract
### Dual-key decrypt boundary

The existing encrypt_with_context and decrypt_with_context functions in crypto.py are not modified. They remain single-key functions. A new decrypt_with_fallback(ciphertext, context) function is added that:

- Resolves APP_SECRET_ENVELOPE_KEY (primary) and SUPABASE_SERVICE_ROLE_KEY (fallback) from environment
- Tries decrypt_with_context(ciphertext, primary, context)
- On InvalidTag or decryption failure, retries with decrypt_with_context(ciphertext, fallback, context)
- Increments platform.crypto.fallback.count when fallback succeeds
- Raises if both fail

A new get_envelope_key() function returns APP_SECRET_ENVELOPE_KEY and raises RuntimeError if missing. Encrypt call sites use this to get the key.

### What does NOT change

- decrypt_with_context signature and behavior — unchanged
- encrypt_with_context signature and behavior — unchanged
- model_registry.py line 288 — stays on SUPABASE_SERVICE_ROLE_KEY directly (excluded from split, see Locked Decision #12)
- user-api-keys/index.ts edge function — unchanged
- api_key_crypto.ts shared module — unchanged

### What changes

- variables.py encrypt calls: os.environ.get("SUPABASE_SERVICE_ROLE_KEY") → get_envelope_key()
- connections.py encrypt call: same change
- connection.py decrypt call: decrypt_with_context(blob, secret, ctx) → decrypt_with_fallback(blob, ctx)
- New secrets.py routes: use get_envelope_key() for encrypt, decrypt_with_fallback() for any decrypt

## Frozen Runtime Resolution Seam Contract

- `services/platform-api` `ExecutionContext.get_secret()` remains `async def`.
- `services/platform-api` normalizes requested secret names to uppercase before querying `public.user_variables` and before env fallback. This exact-name lookup is safe because the hardening migration canonicalizes legacy stored names first.
- `pipeline-worker` continues to expose the existing `POST /{function_name}` execution route unchanged.
- `pipeline-worker` remains env-only for secret lookup in this plan.

## Frozen Frontend Naming Contract

The current mounted frontend secret-management label is Secrets, via the shell navigation and /app/secrets. There is no mounted frontend settings page or navigation item named Variables for secret management.

Do not implement this by introducing a second competing menu label such as Variables while leaving Secrets in place. The product must converge on one user-facing secret-management name in this phase, and that name is Secrets.

## Explicit Risks Accepted In This Plan

- Physical table stays named user_variables. The product/API surface is canonicalized to Secrets without a risky table rename.
- The hardening migration rewrites existing `public.user_variables.name` values to uppercase canonical form. Any direct SQL consumer that depended on legacy casing will observe the canonical value after deploy.
- Compatibility aliases for /variables temporarily preserve backend naming drift while callers migrate.
- Connections remains separate even though some users may think of connection credentials as "secrets."
- `pipeline-worker` remains unable to resolve user-scoped secrets safely until it has a trusted authenticated caller seam or is fully decommissioned. This plan accepts that limitation instead of introducing a request-body `user_id` trust hole.
- user_api_keys is excluded from the crypto root split. Rows in that table remain encrypted with SUPABASE_SERVICE_ROLE_KEY via the Deno edge function. A separate plan handles migration of that encrypt/decrypt path to platform-api.
- Pre-existing Deno/Python key derivation incompatibility. Python crypto.py and Deno api_key_crypto.ts produce different derived keys from the same inputs. This means model_registry.py may fail to decrypt Deno-encrypted user_api_keys rows. This is a pre-existing bug, not introduced by this plan, and is noted for a follow-up investigation.
- Both APP_SECRET_ENVELOPE_KEY and SUPABASE_SERVICE_ROLE_KEY are required until a separate rotation plan re-encrypts all existing rows and eliminates old-key dependence.
- `decrypt_with_fallback()` has an intentionally asymmetric transition-period failure mode: if `APP_SECRET_ENVELOPE_KEY` is unset at decrypt time, decrypts can still fall through to `SUPABASE_SERVICE_ROLE_KEY`, while new encrypts fail loudly through `get_envelope_key()`. This is accepted for backward compatibility during rotation, but both env vars remain required by contract.

## Completion Criteria

The work is complete only when all of the following are true:

- The locked API surface in this plan exists exactly as specified.
- The locked traces, metrics, and structured logs exist exactly as specified.
- The frontend has one canonical secret-management name and route target.
- Auth, Secrets, Connections, and deployment Env each have distinct runtime ownership and are no longer conflated in the user-facing product surface or backend crypto model.
- The inventory counts in this plan match the actual set of created and modified files.
- All new encrypt operations use APP_SECRET_ENVELOPE_KEY.
- All decrypt operations on user_variables and user_provider_connections use dual-key fallback.
- Secret names are canonicalized to uppercase consistently at create, update, and runtime lookup boundaries.
- Existing encrypted rows remain readable with no ciphertext rewrite.
- Existing `public.user_variables.name` rows have been canonicalized to uppercase.
- The platform.crypto.fallback.count metric is emitting.

## Tasks
### Task 1: Write failing crypto dual-key tests

**File(s):** `services/platform-api/tests/infra/test_crypto.py`

- **Step 1:** Add test_decrypt_with_fallback_uses_primary_key — encrypt with key A, decrypt_with_fallback should succeed using key A as primary.
- **Step 2:** Add test_decrypt_with_fallback_falls_back_to_legacy — encrypt with key B (legacy), set key A as primary, verify decrypt_with_fallback succeeds via fallback.
- **Step 3:** Add test_decrypt_with_fallback_raises_when_both_fail — encrypt with key C, set A as primary and B as fallback, verify it raises.
- **Step 4:** Add test_get_envelope_key_raises_when_missing — verify get_envelope_key() raises RuntimeError when env var is unset.
- **Step 5:** Run tests and confirm they fail.

**Test command:**

```bash
python -m pytest services/platform-api/tests/infra/test_crypto.py -v
```

**Expected output:** New tests fail because decrypt_with_fallback and get_envelope_key do not exist yet.

**Commit:** `test(secrets): add failing dual-key crypto tests`

### Task 2: Implement dual-key crypto helpers

**File(s):** `services/platform-api/app/infra/crypto.py`, `services/platform-api/app/core/config.py`, `.env.example`

- **Step 1:** Add to crypto.py:

```python
import logging

_logger = logging.getLogger("crypto")
_fallback_counter = None  # initialized lazily to avoid import-time OTel dependency


def get_envelope_key() -> str:
    """Return the primary application encryption key. Raises if missing."""
    key = os.environ.get("APP_SECRET_ENVELOPE_KEY", "")
    if not key:
        raise RuntimeError(
            "APP_SECRET_ENVELOPE_KEY is required for secret encryption. "
            "Add it to your .env file."
        )
    return key


def decrypt_with_fallback(ciphertext: str, context: str) -> str:
    """Decrypt using APP_SECRET_ENVELOPE_KEY, falling back to SUPABASE_SERVICE_ROLE_KEY.

    This supports the key rotation period where existing rows are encrypted
    with the old key and new rows use the new key.
    """
    if not ciphertext.startswith("enc:v1:"):
        return ciphertext  # plaintext fallback

    primary = os.environ.get("APP_SECRET_ENVELOPE_KEY", "")
    fallback = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if primary:
        try:
            return decrypt_with_context(ciphertext, primary, context)
        except Exception:
            pass  # fall through to legacy key

    if fallback:
        try:
            result = decrypt_with_context(ciphertext, fallback, context)
            _logger.debug("crypto.fallback_decrypt context=%s", context)
            _increment_fallback_counter()
            return result
        except Exception:
            pass

    raise ValueError(
        f"Decryption failed with all available keys for context '{context}'"
    )


def _increment_fallback_counter():
    global _fallback_counter
    if _fallback_counter is None:
        try:
            from opentelemetry import metrics
            meter = metrics.get_meter("platform-api")
            _fallback_counter = meter.create_counter(
                "platform.crypto.fallback.count",
                description="Count of decryptions that required legacy key fallback",
            )
        except Exception:
            return
    if _fallback_counter:
        _fallback_counter.add(1)
```

- **Step 2:** Add app_secret_envelope_key field to Settings dataclass in config.py:

```python
app_secret_envelope_key: Optional[str] = None
```

And in from_env():

```python
app_secret_envelope_key=_env_or_none("APP_SECRET_ENVELOPE_KEY"),
```

- **Step 3:** Add APP_SECRET_ENVELOPE_KEY= to .env.example with comment:

```bash
# Required: dedicated encryption key for user secrets and provider connections.
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
APP_SECRET_ENVELOPE_KEY=
```

- **Step 4:** Run crypto tests.

**Test command:**

```bash
python -m pytest services/platform-api/tests/infra/test_crypto.py -v
```

**Expected output:** All crypto tests pass including new dual-key tests.

**Commit:** `feat(secrets): add dual-key decrypt fallback and envelope key helper`

### Task 3: Write failing backend secret route tests

**File(s):** `services/platform-api/tests/test_secrets.py`, `services/platform-api/tests/test_variables.py`

- **Step 1:** Create test_secrets.py with failing coverage for list, create, update, and delete against /secrets. Follow the existing test pattern from test_variables.py (mock auth principal, patch get_supabase_admin and encrypt_with_context).
- **Step 2:** Assert metadata-only responses and absence of plaintext/ciphertext fields in every response body.
- **Step 3:** Add tests that create/update canonicalize secret names to uppercase and that mixed-case input still resolves to one stored identity.
- **Step 4:** Add test that create calls get_envelope_key() not os.environ.get("SUPABASE_SERVICE_ROLE_KEY").
- **Step 5:** Update test_variables.py to lock the deprecation-alias behavior for /variables.
- **Step 6:** Run and confirm new tests fail.

**Test command:**

```bash
python -m pytest services/platform-api/tests/test_secrets.py services/platform-api/tests/test_variables.py -v
```

**Expected output:** New /secrets tests fail because the route does not exist yet; updated /variables compatibility assertions fail until the alias behavior is implemented.

**Commit:** `test(secrets): add failing secret route coverage`

### Task 4: Add the secret store hardening migration

**File(s):** `supabase/migrations/20260327110000_user_secret_store_hardening.sql`

- **Step 1:** Create the migration to revoke direct table privileges on public.user_variables from anon and authenticated, and update all existing `name` values to their uppercase canonical form.
- **Step 2:** Preserve service-role CRUD access and keep owner-bound RLS in place.
- **Step 3:** Add comments clarifying that public.user_variables is the physical encrypted secret store for this phase and that the migration canonicalizes metadata names only, not ciphertext.
- **Step 4:** Verify the migration applies, table privileges match the locked contract, and no remaining `public.user_variables.name` values differ from `upper(name)`.

**Test command:**

```text
Supabase MCP: apply_migration, list_tables(schemas=["public"], verbose=true), then execute_sql("select count(*) as non_uppercase_names from public.user_variables where name <> upper(name);")
```

**Expected output:** Migration recorded, public.user_variables still exists, direct authenticated privileges revoked, and `non_uppercase_names = 0`.

**Commit:** `feat(secrets): harden secret store privileges`

### Task 5: Switch encrypt call sites to APP_SECRET_ENVELOPE_KEY

**File(s):** `services/platform-api/app/api/routes/variables.py`, `services/platform-api/app/api/routes/connections.py`, `services/platform-api/app/infra/connection.py`

- **Step 1:** In variables.py, replace both encrypt call sites (lines 80 and 105):

```python
# Before:
secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
encrypted = encrypt_with_context(body.value, secret, CRYPTO_CONTEXT)

# After:
from app.infra.crypto import get_envelope_key
encrypted = encrypt_with_context(body.value, get_envelope_key(), CRYPTO_CONTEXT)
```

- **Step 2:** In connections.py, replace the encrypt call site (line 62):

```python
# Before:
secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
encrypted = encrypt_with_context(json_mod.dumps(body.credentials), secret, CRYPTO_CONTEXT)

# After:
from app.infra.crypto import get_envelope_key
encrypted = encrypt_with_context(json_mod.dumps(body.credentials), get_envelope_key(), CRYPTO_CONTEXT)
```

- **Step 3:** In connection.py, replace the decrypt call (line 32):

```python
# Before:
secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
credential_json = decrypt_with_context(row["credential_encrypted"], secret, "provider-connections-v1")

# After:
from app.infra.crypto import decrypt_with_fallback
credential_json = decrypt_with_fallback(row["credential_encrypted"], "provider-connections-v1")
```

- **Step 4:** Update test_connections.py to set APP_SECRET_ENVELOPE_KEY in the test environment and verify the new key source is used.
- **Step 5:** Run targeted tests.

**Test command:**

```bash
python -m pytest services/platform-api/tests/test_variables.py services/platform-api/tests/test_connections.py services/platform-api/tests/infra/test_crypto.py -v
```

**Expected output:** All tests pass with the new key source.

**Commit:** `feat(secrets): switch encrypt sites to APP_SECRET_ENVELOPE_KEY with dual-key decrypt`

### Task 6: Implement the canonical /secrets backend surface

**File(s):** `services/platform-api/app/api/routes/secrets.py`, `services/platform-api/app/api/routes/variables.py`, `services/platform-api/app/main.py`

- **Step 1:** Create secrets.py with the locked request/response models and metadata-only CRUD handlers. Use get_envelope_key() for encrypt and decrypt_with_fallback() for any decrypt. Canonicalize incoming secret names to uppercase before persistence and in metadata responses. Add the locked trace spans and metrics.
- **Step 2:** Register the new router in app/main.py between variables and auth_oauth (position 5g-bis):

```python
# 5g2. Canonical secrets surface (user-scoped, before plugin catch-all)
from app.api.routes.secrets import router as secrets_router
app.include_router(secrets_router)
```

- **Step 3:** Rework `variables.py` into compatibility aliases over the same handler functions used by `secrets.py`, add deprecation response metadata, preserve the same uppercase canonical name behavior, and mark the route summaries as deprecated. Do this inside `variables.py`; do not create a new shared service module in this phase.
- **Step 4:** Add the secrets.changed structured log.
- **Step 5:** Run targeted tests.

**Test command:**

```bash
python -m pytest services/platform-api/tests/test_secrets.py services/platform-api/tests/test_variables.py -v
```

**Expected output:** All secret-route and compatibility tests pass with metadata-only responses.

**Commit:** `feat(secrets): add canonical secrets api surface`

### Task 7: Implement trusted runtime secret resolution in platform-api

**File(s):** `services/platform-api/app/domain/plugins/models.py`, `services/platform-api/tests/test_plugins.py`, `services/platform-api/tests/infra/test_execution_context.py`

- **Step 1:** Preserve the existing async seam in `platform-api` by changing `ExecutionContext.get_secret()` to resolve user-scoped secrets asynchronously rather than rewriting it to a sync method:

```python
async def get_secret(self, name: str) -> str:
    """Resolve a user-scoped secret by name, falling back to env."""
    normalized_name = name.strip().upper()
    # Task 4 canonicalized legacy rows, so exact uppercase lookup is safe here.
    if self.user_id and self.supabase_url and self.supabase_key:
        sb = create_client(self.supabase_url, self.supabase_key)
        result = sb.table("user_variables").select(
            "value_encrypted"
        ).eq("user_id", self.user_id).eq("name", normalized_name).limit(1).execute()
        row = (result.data or [None])[0]
        if row and row.get("value_encrypted"):
            from app.infra.crypto import decrypt_with_fallback
            return decrypt_with_fallback(row["value_encrypted"], "user-variables-v1")
    return os.environ.get(normalized_name, "")
```

- **Step 2:** Add the `secrets.resolve` trace span and `platform.secrets.resolve.count` metric to the `platform-api` `get_secret()` implementation.
- **Step 3:** Extend `services/platform-api/tests/test_plugins.py` for async secret hit and env fallback coverage.
- **Step 4:** Extend `services/platform-api/tests/infra/test_execution_context.py` for canonical uppercase lookup behavior and mixed-case caller input.

**Test command:**

```bash
python -m pytest services/platform-api/tests/test_plugins.py services/platform-api/tests/infra/test_execution_context.py -v
```

**Expected output:** `platform-api` runtime contexts resolve user secrets first, env fallback second, and mixed-case secret requests resolve through the uppercase canonical name.

**Commit:** `feat(secrets): wire runtime secret resolution`

### Task 8: Write failing frontend secrets tests

**File(s):** `web/src/pages/settings/SettingsSecrets.test.tsx`, `web/src/pages/settings/settings-nav.test.ts`, `web/src/components/shell/nav-config.test.ts`, `web/src/components/common/useShellHeaderTitle.test.tsx`

- **Step 1:** Add failing tests for a new Settings / Secrets route and breadcrumb.
- **Step 2:** Add failing tests proving that Secrets appears in settings navigation.
- **Step 3:** Add failing tests proving /app/secrets redirects to /app/settings/secrets.
- **Step 4:** Add a negative assertion that no secret-management settings route or nav item named Variables is introduced.

**Test command:**

```bash
npm --prefix web run test -- src/pages/settings/SettingsSecrets.test.tsx src/pages/settings/settings-nav.test.ts src/components/shell/nav-config.test.ts src/components/common/useShellHeaderTitle.test.tsx
```

**Expected output:** New tests fail because the canonical settings secrets surface is not mounted yet.

**Commit:** `test(secrets): add failing frontend secrets surface coverage`

### Task 9: Implement the frontend secrets surface

**File(s):** `web/src/lib/secretsApi.ts`, `web/src/pages/settings/SettingsSecrets.tsx`, `web/src/components/settings/SecretsTable.tsx`, `web/src/components/settings/SecretEditorDialog.tsx`, `web/src/router.tsx`, `web/src/pages/SecretsPage.tsx`, `web/src/pages/settings/index.ts`, `web/src/pages/settings/settings-nav.ts`, `web/src/components/shell/nav-config.ts`

- **Step 1:** Add secretsApi.ts for typed CRUD calls to /secrets.
- **Step 2:** Build SettingsSecrets.tsx with metadata-only table, create/edit dialog, rotate flow, and delete flow. Follow the existing settings visual language and interaction patterns used by nearby settings surfaces such as `ConnectionsPanel`.
- **Step 3:** Mount /app/settings/secrets in the settings router and export the page from the settings index.
- **Step 4:** Convert SecretsPage.tsx from placeholder into a compatibility redirect to /app/settings/secrets.
- **Step 5:** Update settings-nav.ts to add Secrets with IconLock under Operations group.
- **Step 6:** Update nav-config.ts to point both shell nav entries to /app/settings/secrets.
- **Step 7:** Run frontend tests.

**Test command:**

```bash
npm --prefix web run test -- src/pages/settings/SettingsSecrets.test.tsx src/pages/settings/settings-nav.test.ts src/components/shell/nav-config.test.ts src/components/common/useShellHeaderTitle.test.tsx
```

**Expected output:** All frontend tests pass.

**Commit:** `feat(secrets): add canonical settings secrets ui`

### Task 10: Verification sweep

**File(s):** This plan document.

- **Step 1:** Run the full targeted backend test suite:

```bash
python -m pytest services/platform-api/tests/test_secrets.py services/platform-api/tests/test_variables.py services/platform-api/tests/test_connections.py services/platform-api/tests/test_plugins.py services/platform-api/tests/infra/test_crypto.py services/platform-api/tests/infra/test_execution_context.py -v
```

- **Step 2:** Run the full targeted frontend test suite:

```bash
npm --prefix web run test -- src/pages/settings/SettingsSecrets.test.tsx src/pages/settings/settings-nav.test.ts src/components/shell/nav-config.test.ts src/components/common/useShellHeaderTitle.test.tsx
```

- **Step 3:** Verify migration state and table privileges in Supabase.
- **Step 3a:** Verify `select count(*) from public.user_variables where name <> upper(name)` returns zero after the migration.
- **Step 4:** Verify /app/secrets redirects and Settings / Secrets works for an authenticated user.
- **Step 5:** Verify case-insensitive secret creation/update and runtime lookup all converge on the uppercase canonical secret name.
- **Step 6:** Compare actual file inventory against locked counts.
- **Step 7:** Verify platform.crypto.fallback.count metric is registered (will emit once legacy-encrypted rows are decrypted in a live environment).

**Test command:** Both test commands above.

**Expected output:** All targeted tests pass. Inventory counts match.

**Commit:** `chore(secrets): verify auth secrets variables env separation`

## Execution Handoff

When this plan is approved:

- Read the plan fully before starting.
- Follow the plan exactly. Do not improvise on locked decisions.
- If a locked decision turns out to be wrong, stop and revise the plan.
- model_registry.py is explicitly excluded — do not touch it.
- The user-api-keys edge function is explicitly excluded — do not touch it.
- Use the verification-before-completion skill before claiming any task is done.
