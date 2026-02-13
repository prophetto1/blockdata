# Superuser System AI Connectors Spec (Draft)

Date: 2026-02-13  
Owner: Platform  
Status: Draft for review before implementation

## 0) Review Findings Incorporated (2026-02-13)

This draft now explicitly tracks the following high-priority gaps raised in review:

1. Credential precedence must be explicitly signed off across all three sources:
   - user key (`user_api_keys`)
   - system connector (`runtime_primary`)
   - env fallback (`ANTHROPIC_API_KEY`)
2. Assistant provider scope must be either fully fixed or clearly marked provisional, not both.
3. Failure behavior for "configured but invalid/decrypt-failed" connector must be explicit.
4. Audit must capture full before/after + reason trail, not only `updated_by`/`updated_at`.
5. Model/default parameter authority must be explicit (connector auth vs model policy ownership).

## 1) Problem Statement

System-side AI execution currently depends on code-level environment configuration for at least one runtime path (document worker using Anthropic). This prevents superusers from rotating provider credentials without code edits/redeploy semantics and creates ambiguity between:

- User-level provider keys (`user_api_keys`) intended for user-scoped agent config.
- System-level provider keys required for platform-operated AI paths.

The product needs an explicit, auditable superuser-owned configuration surface for system AI requirements.

## 2) Goals

1. Add superuser-manageable system AI connector configuration in `Superuser Settings`.
2. Support two independent connector slots:
   - `runtime_primary`: the connector used by the current platform worker path.
   - `assistant_primary`: reserved connector for assistant runtime path (future execution wiring).
3. Remove the need to edit code to rotate the currently-used runtime provider key.
4. Keep system credentials isolated from user credentials and inaccessible to regular authenticated users.
5. Preserve existing behavior as fallback during rollout.

## 3) Non-Goals

1. Full multi-provider runtime dispatch in this phase.
2. MCP and CLI execution integration for assistant in this phase.
3. Replacing user-level `Agents` or `user_api_keys` flows.

## 4) Canonical Terms

- `User provider credentials`: `public.user_api_keys` (user-scoped).
- `System AI connectors`: superuser-managed credentials for platform-side runtime paths.
- `runtime_primary`: current document worker execution connector.
- `assistant_primary`: future assistant execution connector.

## 5) Requirements (SRL)

### SRL-1: Superuser-only management

The platform SHALL provide a superuser-only API surface to read/write system AI connector metadata and encrypted credentials.

Acceptance:
- Non-superuser receives `403`.
- Superuser can read/write connector settings.

### SRL-2: Two-slot connector model

The platform SHALL persist two named slots:

- `runtime_primary`
- `assistant_primary`

Each slot stores at minimum:
- `slot_key` (enum text)
- `provider`
- `api_key_encrypted`
- `key_suffix`
- `base_url` (nullable; required for `custom`)
- `is_valid` (nullable)
- `updated_at`
- `updated_by`

Acceptance:
- Both slots independently configurable.
- Updating one slot does not modify the other.

### SRL-3: Runtime slot guardrail

For this phase, `runtime_primary` SHALL be restricted to `provider = anthropic` to match current worker execution implementation.

Acceptance:
- API rejects non-anthropic provider for `runtime_primary`.

### SRL-4: Assistant slot flexibility

`assistant_primary` is **provisional pending sign-off**. Proposed phase-1 scope:

- allow provider values: `anthropic`, `openai`, `google`, `custom`

For `custom`, `base_url` is required and must be valid `http/https`.

Acceptance:
- Validation behavior matches rules above.

### SRL-5: Worker integration

Worker runtime key resolution SHALL use an explicit signed-off precedence order across all three sources.

Proposed default for implementation (preserves current user-key behavior while adding system control):

1. Decrypted user key from `user_api_keys(provider='anthropic')`, if configured and valid.
2. Decrypted system key from `runtime_primary`, if configured and valid.
3. Env fallback (`ANTHROPIC_API_KEY`) for backward compatibility.

Acceptance:
- Signed-off order is documented in code and tests.
- Runtime key can be rotated from superuser UI without code edits.

### SRL-6: Failure-mode policy for invalid configured keys

Failure handling SHALL be explicit and tested for all configured credential sources.

Decision required before implementation:
- Option A (strict): fail closed when the highest-priority configured source decrypt/validate fails.
- Option B (resilient): mark failing source invalid and continue to next source in precedence.

Acceptance:
- Behavior for "slot exists but decrypt fails" is documented and covered by automated tests.
- No silent, undocumented fallback behavior.

### SRL-7: Secret handling

Credentials SHALL be encrypted at rest using existing edge encryption pattern and service-role runtime secret.

Acceptance:
- No plaintext key is exposed in API responses.
- Browser receives only non-sensitive fields (e.g., suffix, status).

### SRL-8: Superuser UI surface

`/app/settings/superuser` SHALL include an explicit `System AI Connectors` section with:

- Connector cards for `runtime_primary` and `assistant_primary`.
- Key set/rotate action.
- Optional clear/disconnect action.
- Provider selector (assistant slot only in this phase).
- Base URL field when provider is `custom`.
- Status summary (`configured`, `updated_at`, `key suffix`, validation note).

Acceptance:
- Superuser can configure both slots from UI.
- UI copy clearly distinguishes system connectors from user provider settings.

### SRL-9: Auditability

Connector changes SHALL be fully auditable with:

- `changed_by`
- `changed_at`
- `old_value`
- `new_value`
- `reason` (nullable but supported)

Acceptance:
- Audit records are queryable and match update history.
- UI can show recent connector audit events.

### SRL-10: Model/default parameter authority

System connector records SHALL define **authentication + endpoint only**.

Model/default inference parameters remain controlled by existing runtime policy keys (admin policy model controls), unless a future spec explicitly changes this boundary.

Acceptance:
- No duplicate model/default fields are introduced in system connector table.
- Superuser UI copy states this boundary clearly.

## 6) Data Model (Proposed)

Table: `public.system_ai_connectors`

- `slot_key text primary key` check in (`runtime_primary`, `assistant_primary`)
- `provider text not null`
- `api_key_encrypted text null`
- `key_suffix text null`
- `base_url text null`
- `is_valid boolean null`
- `updated_at timestamptz not null default now()`
- `updated_by uuid null`
- `created_at timestamptz not null default now()`

Security:
- RLS enabled.
- No direct `authenticated` write grants.
- Writes only through superuser edge function with service role.
- Read responses must omit encrypted secret.

## 7) API Surface (Proposed)

New edge function: `superuser-ai-connectors`

- `GET /functions/v1/superuser-ai-connectors`
  - superuser auth required
  - returns sanitized connector records

- `PUT/PATCH /functions/v1/superuser-ai-connectors`
  - superuser auth required
  - upsert connector config
  - validates slot/provider/base_url
  - encrypts key if provided

- `DELETE /functions/v1/superuser-ai-connectors?slot_key=...`
  - superuser auth required
  - clears connector credential and metadata for slot

## 8) UX Copy Constraints

Must clearly state:

- "System AI connectors are platform-level credentials."
- "These are separate from user agent/provider keys."
- For `runtime_primary`: "Used by document worker execution path."
- For `assistant_primary`: "Reserved for assistant runtime path (provider integration pending)."

## 9) Rollout Plan

1. Add migration for `system_ai_connectors`.
2. Add `superuser-ai-connectors` edge function.
3. Add Superuser Settings UI section.
4. Wire worker credential resolution per signed-off precedence order (`user`, `runtime_primary`, `env`).
5. Verify by rotating runtime key in UI and executing worker flow.

## 10) Acceptance Test Matrix

1. Non-superuser access to connector API returns `403`.
2. Superuser can set `runtime_primary` Anthropic key and see suffix/status.
3. Setting `runtime_primary` with non-anthropic provider fails validation.
4. Setting `assistant_primary` custom without `base_url` fails validation.
5. Worker precedence behavior matches signed-off order across `user_api_keys`, `runtime_primary`, and env.
6. Worker behavior for "configured but bad key/decrypt failure" matches selected policy (strict vs resilient).
7. Worker succeeds with DB-configured runtime key when env key is empty (where precedence permits).
8. Worker still succeeds with env key when higher-priority sources are unset (where precedence permits).
9. API responses never include `api_key_encrypted`.
10. Connector audit entries include old/new/reason metadata.

## 11) Open Decisions (Need explicit sign-off)

1. Final worker credential precedence order:
   - Option A: `user_api_keys -> runtime_primary -> env` (compatibility-first)
   - Option B: `runtime_primary -> user_api_keys -> env` (platform-control-first)
2. Failure behavior when highest-priority configured source is invalid/decrypt-failed:
   - Option A: fail closed
   - Option B: mark invalid and continue to next source
3. `assistant_primary` provider scope for phase 1:
   - Option A: Anthropic-only
   - Option B: multi-provider (`anthropic/openai/google/custom`)
4. Audit storage target:
   - Option A: dedicated `system_ai_connectors_audit` table
   - Option B: extend/shared admin policy audit mechanism
5. Should we expose a "Test connection" action in this phase or defer?
