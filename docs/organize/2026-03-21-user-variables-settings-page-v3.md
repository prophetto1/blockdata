# Variables Settings Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a user-facing Variables page at `/app/settings/variables` that stores user-scoped named values securely and makes them available to trusted runtime execution via `get_secret()`.

**Architecture:** Keep the UI under the existing settings surface rather than extending the current top-level `Secrets` placeholder page. Use a new FastAPI `variables` route set plus an encrypted `user_variables` table. The browser reads metadata only; plaintext values are accepted on create and rotation, encrypted server-side, and never returned afterward.

**Tech Stack:** React, React Router, FastAPI, Supabase Postgres, existing AES-GCM helpers in `services/platform-api/app/infra/crypto.py`, existing auth dependency `require_user_auth`.

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/variables` | List current user variable metadata | **New** |
| POST | `/variables` | Create variable from plaintext value, return metadata only | **New** |
| PATCH | `/variables/{id}` | Update metadata and optionally rotate plaintext value | **New** |
| DELETE | `/variables/{id}` | Delete variable | **New** |

New endpoint details:

- `GET /variables`
  - Auth: `require_user_auth`
  - Response: `{ "variables": VariableMetadata[] }`
  - Touches: `public.user_variables`
- `POST /variables`
  - Auth: `require_user_auth`
  - Request: `{ "name": string, "value": string, "description"?: string, "value_kind"?: string }`
  - Response: `{ "variable": VariableMetadata }`
  - Touches: `public.user_variables`
- `PATCH /variables/{id}`
  - Auth: `require_user_auth`
  - Request: `{ "name"?: string, "value"?: string, "description"?: string, "value_kind"?: string }`
  - Response: `{ "variable": VariableMetadata }`
  - Touches: `public.user_variables`
- `DELETE /variables/{id}`
  - Auth: `require_user_auth`
  - Response: `{ "ok": true, "id": string }`
  - Touches: `public.user_variables`

`VariableMetadata` should include:

- `id`
- `name`
- `description`
- `value_kind`
- `value_suffix`
- `created_at`
- `updated_at`

Plaintext `value` must never be returned from any list or mutation response.

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `variables.list` | `services/platform-api/app/api/routes/variables.py` GET handler | Track list latency and failures |
| Trace span | `variables.create` | `services/platform-api/app/api/routes/variables.py` POST handler | Track create latency and failures |
| Trace span | `variables.update` | `services/platform-api/app/api/routes/variables.py` PATCH handler | Track rotation/update latency and failures |
| Trace span | `variables.delete` | `services/platform-api/app/api/routes/variables.py` DELETE handler | Track deletion latency and failures |
| Structured log | `variables.changed` | POST/PATCH/DELETE handlers | Log `user_id`, `variable_id`, `name`, `action` only |

No plaintext values, ciphertext, or request bodies containing secret values may appear in logs or spans.

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|---------------|----------------------|
| `20260321_xxx_create_user_variables.sql` | Create `public.user_variables`, indexes, unique `(user_id, name)` constraint, RLS policies | No |

Suggested table shape:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `name text not null`
- `description text null`
- `value_encrypted text not null`
- `value_suffix text null`
- `value_kind text not null default 'secret'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Suggested database rules:

- unique index on `(user_id, lower(name))`
- index on `user_id`
- RLS enabled
- authenticated users can only read and mutate their own metadata rows if direct reads are ever used later

The browser should continue using the FastAPI route layer rather than direct table writes.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

**New pages:** 1

| Page | File | Route |
|------|------|-------|
| SettingsVariables | `web/src/pages/settings/SettingsVariables.tsx` | `/app/settings/variables` |

**New components:** 2

| Component | File | Used by |
|-----------|------|---------|
| VariablesTable | `web/src/components/settings/VariablesTable.tsx` | `SettingsVariables` |
| VariableEditorDialog | `web/src/components/settings/VariableEditorDialog.tsx` | `SettingsVariables` |

**New hooks/services:** 1

| Module | File |
|--------|------|
| variablesApi | `web/src/lib/variablesApi.ts` |

**Modified files:** 11

| File | What changes |
|------|-------------|
| `web/src/router.tsx` | Add `/app/settings/variables` child route |
| `web/src/pages/settings/index.ts` | Export `SettingsVariables` |
| `web/src/pages/settings/settings-nav.ts` | Add `Variables` item under General |
| `web/src/pages/settings/settings-nav.test.ts` | Verify `/app/settings/variables` lookup |
| `web/src/components/shell/nav-config.ts` | Add `Variables` to settings drill |
| `web/src/components/shell/nav-config.test.ts` | Verify settings drill includes `Variables` |
| `web/src/components/common/useShellHeaderTitle.test.tsx` | Verify breadcrumb resolves to `Settings / Variables` |
| `services/platform-api/app/main.py` | Include variables router |
| `services/platform-api/app/domain/plugins/models.py` | Extend `get_secret()` beyond env-only |
| `services/pipeline-worker/app/shared/context.py` | Extend `get_secret()` beyond env-only |
| `services/pipeline-worker/app/shared/auth.py` | Allow credential resolution to use user variables via context |

## Key Decisions

- User-facing name is `Variables`, not `Secrets`.
- Route is `/app/settings/variables`.
- Breadcrumb is `Settings / Variables`.
- Values are secret-by-default in v1, even though the product language says Variables.
- The existing top-level `SecretsPage.tsx` is not the implementation target for this work.
- Runtime lookup remains name-based through `get_secret("NAME")`.
- Environment variables remain a fallback when no user-scoped variable exists.

## Existing Codebase Seams

Current settings placement:

- Router settings subtree already lives at `/app/settings/*` in `web/src/router.tsx`
- Settings drill currently includes `Account` and `Themes` in `web/src/components/shell/nav-config.ts`
- Settings child nav currently includes `Account` and `Themes` in `web/src/pages/settings/settings-nav.ts`

Current crypto and runtime patterns:

- Connection credentials are already encrypted with `encrypt_with_context()` in `services/platform-api/app/api/routes/connections.py`
- Shared crypto helpers already exist in `services/platform-api/app/infra/crypto.py`
- Platform API plugin `ExecutionContext.get_secret()` is env-only today in `services/platform-api/app/domain/plugins/models.py`
- Pipeline worker `ExecutionContext.get_secret()` is env-only today in `services/pipeline-worker/app/shared/context.py`

This plan should reuse those patterns instead of inventing a second encryption or runtime-resolution system.

## Tasks

### Task 1: Add the failing backend tests first

**Files:**

- Create: `services/platform-api/tests/test_variables.py`

**Step 1: Write failing tests for route behavior**

Cover:

- listing returns an empty array for a new user
- create stores a variable and returns metadata only
- patch updates description/name without returning plaintext
- patch can rotate the value without returning plaintext
- delete removes the row
- one user cannot access another user's variable

**Step 2: Run the tests to verify they fail**

Run:

```bash
pytest services/platform-api/tests/test_variables.py -v
```

Expected:

- import or route-not-found failures because `/variables` does not exist yet

### Task 2: Add the `user_variables` migration

**Files:**

- Create: `supabase/migrations/20260321_xxx_create_user_variables.sql`

**Step 1: Create the table and indexes**

Implement:

- `public.user_variables`
- unique `(user_id, lower(name))`
- timestamps
- `value_encrypted`
- metadata columns

**Step 2: Add RLS policies**

Policies should allow only the owning user to access rows if direct DB access is ever used later.

**Step 3: Verify migration syntax**

Run the project’s normal migration verification flow if available, or at minimum ensure the SQL is syntactically consistent with existing migrations.

### Task 3: Add FastAPI variables routes

**Files:**

- Create: `services/platform-api/app/api/routes/variables.py`
- Modify: `services/platform-api/app/main.py`
- Modify: `services/platform-api/app/infra/crypto.py` only if helper additions are truly needed

**Step 1: Write minimal route models**

Create request and response models for:

- create
- update
- metadata row
- list response

**Step 2: Implement `GET /variables`**

- require authenticated user
- select only metadata columns
- return rows sorted by `updated_at desc` or `name asc`

**Step 3: Implement `POST /variables`**

- require authenticated user
- encrypt plaintext with context `user-variables-v1`
- derive `value_suffix` from the plaintext for display
- upsert or insert depending on desired semantics
- return metadata only

**Step 4: Implement `PATCH /variables/{id}`**

- require authenticated user
- allow metadata-only updates
- if a new `value` is provided, re-encrypt and rotate suffix
- return metadata only

**Step 5: Implement `DELETE /variables/{id}`**

- require authenticated user
- delete only rows owned by the caller
- return `{ ok: true, id }`

**Step 6: Mount the router**

Add the new router to `services/platform-api/app/main.py` before the plugin catch-all.

**Step 7: Re-run backend tests**

Run:

```bash
pytest services/platform-api/tests/test_variables.py -v
```

Expected:

- PASS

### Task 4: Add observability and log hygiene in the route layer

**Files:**

- Modify: `services/platform-api/app/api/routes/variables.py`

**Step 1: Add spans/logs declared in the manifest**

For each handler:

- start the declared trace span
- log action metadata only
- do not include request bodies or decrypted values

**Step 2: Add failure-path assertions if test scaffolding exists**

At minimum, verify the implementation does not log plaintext values.

### Task 5: Extend runtime `get_secret()` in platform-api

**Files:**

- Modify: `services/platform-api/app/domain/plugins/models.py`
- Modify: `services/platform-api/tests/test_plugins.py`

**Step 1: Write failing tests**

Add tests for:

- `get_secret()` returns env value when no user-scoped variable exists
- `get_secret()` returns user-scoped variable when `user_id` is present and the variable exists
- user-scoped variable wins over env fallback if both exist

**Step 2: Implement minimal lookup**

- if `self.user_id` is present, fetch `user_variables` by `user_id` and `name`
- decrypt using the same context string
- if missing, fall back to `os.environ.get(key, "")`

**Step 3: Re-run plugin tests**

Run:

```bash
pytest services/platform-api/tests/test_plugins.py -v
```

Expected:

- PASS

### Task 6: Extend runtime `get_secret()` in pipeline worker

**Files:**

- Modify: `services/pipeline-worker/app/shared/context.py`
- Modify: `services/pipeline-worker/app/shared/auth.py`
- Create or modify: pipeline worker tests covering context/auth resolution

**Step 1: Write failing tests**

Cover:

- env fallback remains intact
- user-scoped variable lookup works when context has a user id
- `$ENV.NAME` behavior continues to work

**Step 2: Implement minimal resolution**

- teach worker `ExecutionContext.get_secret()` the same lookup order as platform-api
- keep `resolve_credentials()` compatible with current auth config strings
- allow future auth config use of context-backed variable resolution without breaking env references

**Step 3: Run worker tests**

Run the narrowest relevant worker test command for the files added.

### Task 7: Add the frontend Variables page tests first

**Files:**

- Create: `web/src/pages/settings/SettingsVariables.test.tsx`
- Create if needed: component tests for dialog/table behavior

**Step 1: Write failing UI tests**

Cover:

- page renders `Variables`
- list fetch renders metadata rows only
- create dialog accepts `name`, `value`, `description`
- after save, plaintext is no longer shown in the table
- edit dialog can rotate the value
- delete removes the row from the list

**Step 2: Run the tests to verify failure**

Run:

```bash
npm.cmd run test -- src/pages/settings/SettingsVariables.test.tsx
```

Expected:

- missing route/component/service failures

### Task 8: Build the frontend page and API client

**Files:**

- Create: `web/src/lib/variablesApi.ts`
- Create: `web/src/pages/settings/SettingsVariables.tsx`
- Create: `web/src/components/settings/VariablesTable.tsx`
- Create: `web/src/components/settings/VariableEditorDialog.tsx`

**Step 1: Implement the API client**

Create typed helpers for:

- list
- create
- update
- delete

Use the same authenticated fetch conventions already used for other platform-api-backed pages in the repo.

**Step 2: Implement the page shell**

- set shell header to `Settings / Variables`
- fetch rows on load
- render loading, empty, error, and populated states

**Step 3: Implement the table**

Show only:

- name
- description
- kind
- suffix
- updated time
- actions

Do not show plaintext values.

**Step 4: Implement the dialog**

- create mode
- edit metadata mode
- rotate value mode
- unsaved reveal only inside the modal input field

**Step 5: Re-run UI tests**

Run:

```bash
npm.cmd run test -- src/pages/settings/SettingsVariables.test.tsx
```

Expected:

- PASS

### Task 9: Wire settings navigation, route, and breadcrumb

**Files:**

- Modify: `web/src/router.tsx`
- Modify: `web/src/pages/settings/index.ts`
- Modify: `web/src/pages/settings/settings-nav.ts`
- Modify: `web/src/pages/settings/settings-nav.test.ts`
- Modify: `web/src/components/shell/nav-config.ts`
- Modify: `web/src/components/shell/nav-config.test.ts`
- Modify: `web/src/components/common/useShellHeaderTitle.test.tsx`

**Step 1: Add the route**

Add:

- `/app/settings/variables`

**Step 2: Add the nav item**

Add `Variables` to:

- settings page nav
- classic settings drill

**Step 3: Verify breadcrumb behavior**

Ensure the shell header resolves:

- `Settings / Variables`

### Task 10: Full verification

**Step 1: Run backend tests**

```bash
pytest services/platform-api/tests/test_variables.py services/platform-api/tests/test_plugins.py -v
```

**Step 2: Run frontend tests**

```bash
npm.cmd run test -- src/pages/settings/SettingsVariables.test.tsx src/pages/settings/settings-nav.test.ts src/components/shell/nav-config.test.ts src/components/common/useShellHeaderTitle.test.tsx
```

**Step 3: Run typechecks**

Use the repo’s normal web and backend verification commands.

At minimum:

```bash
cd web && ..\\node_modules\\.bin\\tsc.cmd -b --pretty false
```

and the normal platform-api test/import checks used in this repo.

**Step 4: Manual verification**

- open `/app/settings/variables`
- create a variable
- verify the table never shows plaintext after save
- refresh the page and verify metadata persists
- confirm breadcrumb shows `Settings / Variables`
- confirm runtime `get_secret("NAME")` resolves the saved value for an authenticated execution context

## Expected Outcome

- Users can manage Variables from `Settings / Variables`
- Browser reads remain metadata-only
- Persisted values are encrypted at rest
- `get_secret("NAME")` resolves user-scoped values in trusted runtime contexts
- Environment variables remain a fallback
- Future layout capture auth can reference Variables by name rather than inventing a separate credential store

## Out of Scope

- Plaintext browser re-read or reveal of persisted values
- Shared team/org-scoped variables
- Variable version history
- Separate public non-secret variables in v1
- Replacing the existing top-level `/app/secrets` placeholder in this phase
