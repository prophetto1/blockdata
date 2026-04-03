# User Secrets Page Implementation Plan (v2)

> **Version update:** This document does not modify the original plan file.
>
> - Original file: `docs/plans/2026-03-19-user-secrets-page.md`
> - Updated file: `docs/plans/2026-03-19-user-secrets-page-v2.md`

**Goal:** Create a user-facing Secrets page at `/app/settings/secrets` that follows the platform's existing security patterns for sensitive data: encrypted storage, metadata-only browser reads, backend-owned writes, and runtime-only secret resolution.

**Architecture:** Reuse the repo's current secret-handling direction rather than introducing plaintext browser-readable storage. Secret values are stored encrypted at rest. The browser sees only metadata such as name, description, suffix or fingerprint, and timestamps. Secret CRUD goes through trusted backend APIs. Runtime secret resolution is implemented in backend execution contexts, not by direct browser access to secret rows.

**Tech Stack:** Supabase Postgres migration, trusted backend API layer, existing AES-GCM crypto helpers, React/TypeScript settings UI, existing settings shell navigation and routing.

---

## Architectural Alignment

This version updates the original plan to align with code patterns already present in the repo:

- `user_api_keys` stores encrypted values and exposes only non-secret fields to the browser.
- `user_provider_connections` stores encrypted credentials and keeps plaintext out of API responses.
- Platform and worker execution contexts already expose a `get_secret()` abstraction, but they currently resolve environment variables only. This plan extends that abstraction to support user-scoped secrets.

This plan does not introduce a weaker storage pattern than the existing API-key or connection systems.

---

## Scope

### In scope

- Add a user secrets settings page at `/app/settings/secrets`
- Add encrypted user secret storage
- Add backend secret CRUD routes
- Add metadata-only list/read behavior for the frontend
- Add runtime secret lookup for trusted backend execution paths
- Add navigation and router updates for the new page
- Add tests covering encryption, non-readability, authorization, and runtime lookup

### Out of scope

- Secret sharing across users or workspaces
- Full secret version-history UI
- Secret usage analytics UI
- Secret import/export
- Cross-project or cross-environment secret promotion workflows

---

## Security Requirements

This feature must follow normal platform secret patterns:

- **Non-readability:** plaintext secret values are never returned after creation or update
- **Encryption at rest:** stored secret values are encrypted server-side before persistence
- **RBAC and tenancy boundaries:** users may manage only their own secrets
- **Auditability:** create, update, delete, and resolution events should be loggable
- **Runtime-only resolution:** decryption happens only in trusted backend execution paths
- **Log hygiene:** secret values must never appear in request logs, traces, analytics, or error payloads
- **Multiline support:** private keys, certificates, and JSON blobs must be supported safely
- **Metadata split:** non-secret fields remain queryable without exposing secret bodies

Masking in the UI alone is not sufficient. The stored value itself must be treated as secret.

---

## Data Model

Create a dedicated user secrets table with encrypted storage and metadata separation.

### Proposed table

`public.user_secrets`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `name text not null`
- `secret_encrypted text not null`
- `value_suffix text null`
- `description text null`
- `secret_kind text not null default 'token'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### Constraints

- `unique(user_id, name)`
- validate `name` against a stable identifier format such as uppercase letters, numbers, and underscores

### Browser-visible columns

The browser should be able to read:

- `id`
- `user_id`
- `name`
- `value_suffix`
- `description`
- `secret_kind`
- `created_at`
- `updated_at`

The browser should not be granted direct read access to `secret_encrypted`.

---

## Backend Ownership

The browser should not write secret values directly to the table.

Instead, create trusted backend routes such as:

- `GET /user-secrets`
- `POST /user-secrets`
- `PATCH /user-secrets/{id}`
- `DELETE /user-secrets/{id}`

Behavior:

- `GET` returns metadata only
- `POST` accepts plaintext from the authenticated caller, encrypts it server-side, stores suffix or fingerprint metadata, and returns metadata only
- `PATCH` rotates the value and or updates metadata, but never returns plaintext
- `DELETE` removes the secret

The route should reject empty values, normalize names, and prevent duplicate names per user.

---

## Encryption Pattern

Use the same crypto direction already used elsewhere in the repo:

- AES-GCM
- stable context string for this feature, for example `user-secrets-v1`
- server-side encryption before insert or update
- decryption only in trusted backend code

Do not store plaintext values in `user_secrets`.

Do not rely on direct browser `insert` or `update` calls for secret bodies.

---

## Runtime Resolution

The original plan deferred runtime resolution. In practice, this feature is only half-finished without it.

The backend execution context should support:

- `get_secret("SECRET_NAME")`

Resolution rules:

1. Determine the authenticated user or run owner
2. Look up `user_secrets` for that user and name
3. Decrypt the value in trusted backend code
4. Return plaintext only to the in-process runtime caller
5. Never expose decrypted values in API responses

This should be wired into:

- `services/platform-api/app/domain/plugins/models.py`
- `services/pipeline-worker/app/shared/context.py`

Tests should be updated so `get_secret()` is no longer env-only when a user-scoped secret exists.

---

## Frontend Changes

The new page should follow the existing settings-page patterns.

### Route

Add:

- `/app/settings/secrets`

### Navigation

Update all relevant settings navigation sources, not just one file:

- `web/src/pages/settings/settings-nav.ts`
- `web/src/components/shell/nav-config.ts`
- `web/src/router.tsx`

### Page behavior

Page title:

- `Secrets`

Description:

- `Store API tokens and credentials for use in functions and workflows.`

UI elements:

- search input
- add secret button
- metadata table with name, masked indicator, description, kind, updated time, actions
- create and edit modal
- delete confirmation

The table should show metadata only. The secret body should not be re-fetched and revealed from storage after save.

If a reveal interaction is kept, it should only apply to unsaved form state in the modal, not to persisted secret retrieval.

---

## Secret Types

The platform should support common secret categories maintained by modern platforms:

- API keys
- bearer tokens
- webhook signing secrets
- client secrets
- database passwords
- private keys and certificates
- service-account JSON blobs
- access key and secret pairs stored as separate secrets

Storage format:

- strings by default
- multiline strings supported

Guidance:

- prefer one secret per sensitive value
- do not encourage large structured bundles unless needed for compatibility

---

## Testing Requirements

### Database and API

- user A cannot access user B's secret metadata
- secret values are encrypted before storage
- metadata-only reads never expose plaintext
- duplicate names are rejected per user
- update rotates ciphertext and updates timestamps
- delete removes the row

### Frontend

- settings route renders correctly
- nav item appears in both settings navigation systems
- add, edit, delete, and search flows work
- plaintext is never rendered from persisted backend reads

### Runtime

- `get_secret()` resolves user-scoped secrets for trusted execution contexts
- env fallback behavior is explicit and tested
- logs and error payloads do not include plaintext secret values

---

## Implementation Slices

### Slice 1: Secure storage and backend CRUD

- add migration
- add backend API
- add encryption context
- add metadata-only response model
- add API tests

### Slice 2: Settings page and navigation

- add route
- add page component
- update both nav definitions
- add UI tests

### Slice 3: Runtime secret resolution

- extend execution contexts
- implement user-scoped lookup and decrypt
- add runtime tests

### Slice 4: Hardening

- audit logging
- redact secret values from logs
- add operational documentation

---

## Critical Files

- `docs/plans/2026-03-19-user-secrets-page.md`
- `web/src/router.tsx`
- `web/src/pages/settings/settings-nav.ts`
- `web/src/components/shell/nav-config.ts`
- `web/src/pages/settings/SettingsPageHeader.tsx`
- `services/platform-api/app/domain/plugins/models.py`
- `services/pipeline-worker/app/shared/context.py`
- `supabase/functions/_shared/api_key_crypto.ts`
- `services/platform-api/app/infra/crypto.py`
- `supabase/migrations/`

---

## Acceptance Criteria

- A user can create, update, list, search, and delete named secrets from `/app/settings/secrets`
- Persisted secret values are encrypted at rest
- Plaintext secret values are never returned by normal list or detail reads
- The new page appears consistently in settings navigation
- Trusted backend runtime paths can resolve a user's secret by name
- Secret values do not appear in logs, traces, or frontend query results

---

## Summary

The original plan identified the right product surface but used the wrong storage pattern for this codebase. This v2 plan keeps the same user-facing feature while aligning implementation with the repo's existing encrypted secret handling, backend-owned writes, and runtime-only resolution model.
