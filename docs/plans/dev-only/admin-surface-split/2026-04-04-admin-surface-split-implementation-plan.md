# Admin Surface Split Implementation Plan

**Goal:** Split the current combined `Admin/Superuser` shell into three real surfaces, `Blockdata Admin`, `AGChain Admin`, and `Superuser`, with distinct backend-enforced gates, a three-option workspace selector, and a first-pass route/nav migration that moves current `CONFIG`, `OPERATIONS`, and `SYSTEM` items into BlockData Admin while keeping only `DEV ONLY` in Superuser.

**Architecture:** Keep the shell split in `web`, add a single authenticated platform API access probe for selector visibility and route guards, extend registry-backed auth in `services/platform-api` to resolve `blockdata_admin`, `agchain_admin`, and `platform_admin` separately, repurpose the existing `admin-config` edge function to `Blockdata Admin`, and create a new AGChain Admin shell with an initial `Models` placeholder route. Do not fake the split with one shared superuser gate.

**Tech Stack:** React + TypeScript, Vite, FastAPI, Supabase Postgres migrations, Supabase edge functions, OpenTelemetry, Vitest, pytest, Deno tests.

**Status:** In Progress
**Author:** Codex (requested by user)
**Date:** 2026-04-04

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/auth/access` | Return authenticated access booleans for `blockdata_admin`, `agchain_admin`, and `platform_admin` | New |
| GET | `/admin/config/docling` | Read Docling admin config | Existing - change auth from `require_superuser` to `require_blockdata_admin` |
| PATCH | `/admin/config/docling` | Update Docling admin config | Existing - change auth from `require_superuser` to `require_blockdata_admin` |
| POST | `/agchain/models` | Create AGChain model target | Existing - change auth from `require_superuser` to `require_agchain_admin` |
| PATCH | `/agchain/models/{model_target_id}` | Update AGChain model target | Existing - change auth from `require_superuser` to `require_agchain_admin` |
| POST | `/agchain/models/{model_target_id}/refresh-health` | Refresh AGChain model target health | Existing - change auth from `require_superuser` to `require_agchain_admin` |

#### New endpoint contracts

`GET /auth/access`

- Auth: `require_user_auth`
- Request: no body
- Response:
  - `blockdata_admin: boolean`
  - `agchain_admin: boolean`
  - `superuser: boolean`
- Touches: `registry_blockdata_admin_profiles`, `registry_agchain_admin_profiles`, `registry_superuser_profiles` through `require_auth`

#### Modified endpoint contracts

`GET|PATCH /admin/config/docling`

- Change: require `blockdata_admin` instead of `platform_admin`
- Why: the route powers a surface the user explicitly moved into `Blockdata Admin`

`POST|PATCH|POST refresh-health /agchain/models...`

- Change: require `agchain_admin` instead of `platform_admin`
- Why: AGChain model administration needs a counterpart admin backend separate from Superuser

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `auth.access.read` | `services/platform-api/app/api/routes/auth_access.py:get_auth_access` | Measure selector/guard access probe latency |
| Metric | `platform.auth.access.read.count` | `auth_access.py:get_auth_access` | Count successful authenticated access-probe reads |
| Metric | `platform.auth.access.read.duration_ms` | `auth_access.py:get_auth_access` | Measure access-probe duration |

Observability attribute rules:

- Allowed attributes: `blockdata_admin`, `agchain_admin`, `superuser`, `result`, `http.status_code`
- Forbidden in trace or metric attributes: `user_id`, `email`, registry row IDs, raw route paths beyond the fixed endpoint name

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260404153000_registry_admin_surface_profiles.sql` | Creates `registry_blockdata_admin_profiles` and `registry_agchain_admin_profiles` with the same email-based designation pattern as `registry_superuser_profiles`; backfills active superuser emails into both new registries | Yes - inserts mirrored designation rows for current active superusers so rollout preserves existing operator access |

### Edge Functions

| Function | Action | Auth |
|----------|--------|------|
| `_shared/superuser.ts` | Generalize registry-backed auth helpers so `requireSuperuser` remains intact and `requireBlockdataAdmin` is added | N/A |
| `admin-config` | Change gate from `requireSuperuser` to `requireBlockdataAdmin` | `Blockdata Admin` |

No new edge functions are introduced in this phase. Selector and route-guard access discovery will use the new platform API `GET /auth/access` seam instead of creating three probe functions.

### Frontend Surface Area

**New pages:** `1`

| Page | File | Used by |
|------|------|---------|
| `AgchainAdminModelsPage` | `web/src/pages/admin/AgchainAdminModelsPage.tsx` | `/app/agchain-admin/models` |

**New hooks:** `1`

| Hook | File | Used by |
|------|------|---------|
| `useAdminSurfaceAccess` | `web/src/hooks/useAdminSurfaceAccess.ts` | `ShellWorkspaceSelector.tsx`, `SuperuserGuard.tsx` |

**Modified components/layout/navigation files:** `4`

| File | What changes |
|------|--------------|
| `web/src/components/shell/ShellWorkspaceSelector.tsx` | Replace `Admin/Superuser` with three admin destinations and drive visibility from distinct access booleans |
| `web/src/components/admin/AdminLeftNav.tsx` | Split nav config into `Blockdata Admin`, `AGChain Admin`, and `Superuser` inventories; move only `DEV ONLY` to Superuser |
| `web/src/components/layout/AdminShellLayout.tsx` | Choose the correct rail inventory by route prefix instead of one global admin rail |
| `web/src/router.tsx` | Add `/app/blockdata-admin` and `/app/agchain-admin`, move routes, update redirects, and keep `/app/superuser` as DEV ONLY |

**Modified pages/guards/hooks/services:** `7`

| File | What changes |
|------|--------------|
| `web/src/pages/superuser/SuperuserGuard.tsx` | Become a multi-surface guard module for `superuser`, `blockdata_admin`, and `agchain_admin` |
| `web/src/hooks/useSuperuserProbe.ts` | Delegate to `useAdminSurfaceAccess` for backward compatibility |
| `web/src/pages/superuser/SuperuserWorkspace.tsx` | Become the BlockData Admin index surface instead of the Superuser index |
| `web/src/pages/superuser/SuperuserAuditHistory.tsx` | Continue using `admin-config`, now Blockdata Admin-gated |
| `web/src/pages/settings/DoclingConfigPanel.tsx` | Continue using `/admin/config/docling`, now Blockdata Admin-gated |
| `web/src/pages/superuser/SuperuserInstanceConfig.tsx` | Route moves under `/app/blockdata-admin` |
| `web/src/pages/superuser/SuperuserWorkerConfig.tsx` | Route moves under `/app/blockdata-admin` |

## Pre-Implementation Contract

No major product, API, auth, migration, or inventory decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The top-right workspace selector remains the same Ark UI control; only its elevated options change.
2. `Admin/Superuser` is removed and replaced with `Blockdata Admin`, `AGChain Admin`, and `Superuser`.
3. `Superuser` keeps only the current `DEV ONLY` inventory.
4. `Blockdata Admin` receives the current `CONFIG`, `OPERATIONS`, and `SYSTEM` inventory.
5. `AGChain Admin` launches now as a real, separately gated shell with a single `Models` menu and intentionally sparse placeholder content.
6. `Superuser` does not implicitly grant `Blockdata Admin` or `AGChain Admin` in code. Access continuity comes from migration backfill into the two new registry tables.
7. The selector and guards must not infer all access from one shared probe. Distinct access booleans must come from backend-backed auth state.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. A user designated only in `registry_blockdata_admin_profiles` sees `Blockdata Admin` in the selector and does not see `AGChain Admin` or `Superuser`.
2. That user can enter `/app/blockdata-admin`, sees `CONFIG`, `OPERATIONS`, and `SYSTEM` in the rail, and does not see `DEV ONLY`.
3. That same user can load BlockData-admin-owned backend seams that previously required superuser, specifically `admin-config`-backed pages and `/admin/config/docling`.
4. A user designated only in `registry_agchain_admin_profiles` sees `AGChain Admin` in the selector and can load `/app/agchain-admin/models`.
5. The initial `AGChain Admin` left rail contains exactly one menu item, `Models`.
6. A user designated only in `registry_superuser_profiles` sees `Superuser`, enters `/app/superuser`, and the rail contains only `DEV ONLY`.
7. Existing active superuser records are copied into both new admin registries during migration so the current operator identities retain admin access immediately after rollout.

### Locked Platform API Surface

#### New authenticated platform API endpoints: `1`

1. `GET /auth/access`

#### Existing platform API endpoints modified: `5`

1. `GET /admin/config/docling`
2. `PATCH /admin/config/docling`
3. `POST /agchain/models`
4. `PATCH /agchain/models/{model_target_id}`
5. `POST /agchain/models/{model_target_id}/refresh-health`

#### Existing platform API endpoints reused as-is: `2`

1. `GET /functions`
2. `GET /openapi.json`

### Locked Observability Surface

#### New traces: `1`

1. `auth.access.read`

#### New metrics: `1 counter`, `1 histogram`

1. `platform.auth.access.read.count`
2. `platform.auth.access.read.duration_ms`

### Locked Inventory Counts

#### Database

- New migrations: `1`
- Modified existing migrations: `0`

#### Supabase Edge

- Modified existing functions/helpers: `2`
- New edge functions: `0`

#### Platform API

- New route modules: `1`
- Modified existing route/auth modules: `3`
- Modified route registration modules: `1`

#### Frontend

- New top-level pages/routes: `1`
- New hooks: `1`
- Modified layout/nav/guard/router modules: `6`

#### Tests

- New test modules: `1`
- Modified existing test modules: `5`

### Locked File Inventory

#### New files

- `docs/plans/dev-only/admin-surface-split/2026-04-04-admin-surface-split-implementation-plan.md`
- `supabase/migrations/20260404153000_registry_admin_surface_profiles.sql`
- `services/platform-api/app/api/routes/auth_access.py`
- `services/platform-api/tests/test_auth_access.py`
- `web/src/hooks/useAdminSurfaceAccess.ts`
- `web/src/pages/admin/AgchainAdminModelsPage.tsx`

#### Modified files

- `supabase/functions/_shared/superuser.ts`
- `supabase/functions/_shared/superuser.test.ts`
- `supabase/functions/admin-config/index.ts`
- `services/platform-api/app/auth/dependencies.py`
- `services/platform-api/app/api/routes/agchain_models.py`
- `services/platform-api/app/api/routes/admin_config_docling.py`
- `services/platform-api/app/main.py`
- `services/platform-api/tests/test_auth.py`
- `services/platform-api/tests/test_agchain_models.py`
- `web/src/components/shell/ShellWorkspaceSelector.tsx`
- `web/src/components/shell/ShellWorkspaceSelector.test.tsx`
- `web/src/components/admin/AdminLeftNav.tsx`
- `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`
- `web/src/components/layout/AdminShellLayout.tsx`
- `web/src/components/layout/__tests__/AdminShellLayout.test.tsx`
- `web/src/router.tsx`
- `web/src/pages/superuser/SuperuserGuard.tsx`
- `web/src/hooks/useSuperuserProbe.ts`
- `web/src/pages/superuser/SuperuserWorkspace.tsx`
- `web/src/pages/superuser/PlanTracker.test.tsx`

## Frozen Admin Surface Contract

Do not implement this split by renaming the selector options while leaving all elevated navigation and guards behind the existing superuser probe.

Do not leave `CONFIG`, `OPERATIONS`, or `SYSTEM` on `/app/superuser` after introducing `Blockdata Admin`.

Do not make `platform_admin` a silent umbrella that automatically grants both new admin roles. The future requirement is that Superuser and the two admin surfaces may diverge by identity; the code must preserve that separation now.

## Explicit Risks Accepted In This Plan

1. `AGChain Admin` intentionally launches with placeholder content in `Models`; only the surface, gate, and first menu are in scope for this phase.
2. Some moved BlockData Admin pages may keep historical file names containing `Superuser` in this phase to avoid unnecessary churn.
3. Existing active superusers are mirrored into the two new admin registries during migration for continuity; later curation of those lists is a separate operational step.

## Completion Criteria

The work is complete only when all of the following are true:

1. The selector exposes the three elevated destinations exactly as locked above.
2. Route guards for `/app/blockdata-admin`, `/app/agchain-admin`, and `/app/superuser` are backed by distinct backend access booleans.
3. `admin-config` and `/admin/config/docling` are no longer superuser-only; they are `Blockdata Admin` owned.
4. AGChain model admin mutations are no longer superuser-only; they are `AGChain Admin` owned.
5. The migration creates both new registry tables and backfills current active superuser rows into them.
6. The locked inventory counts above match the actual created and modified files.

## Task 1: Lock failing frontend shell tests

**File(s):** `web/src/components/shell/ShellWorkspaceSelector.test.tsx`, `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`, `web/src/components/layout/__tests__/AdminShellLayout.test.tsx`, `web/src/pages/superuser/PlanTracker.test.tsx`

**Step 1:** Replace the current selector assertions so they expect `Blockdata Admin`, `AGChain Admin`, and `Superuser` instead of `Admin/Superuser`.
**Step 2:** Add failing assertions that `Blockdata Admin` shows `CONFIG`/`OPERATIONS`/`SYSTEM`, `Superuser` shows only `DEV ONLY`, and `/app/blockdata-admin/instance-config` still renders the secondary rail.
**Step 3:** Run the focused Vitest command and confirm the failures are about the new split, not test setup.

**Test command:** `cd web && npm run test -- src/components/shell/ShellWorkspaceSelector.test.tsx src/components/admin/__tests__/AdminLeftNav.test.tsx src/components/layout/__tests__/AdminShellLayout.test.tsx src/pages/superuser/PlanTracker.test.tsx`
**Expected output:** Failing assertions referencing missing admin destinations or incorrect nav grouping.

**Commit:** `test: lock admin surface split shell expectations`

## Task 2: Lock failing auth and AGChain admin backend tests

**File(s):** `services/platform-api/tests/test_auth.py`, `services/platform-api/tests/test_auth_access.py`, `services/platform-api/tests/test_agchain_models.py`, `supabase/functions/_shared/superuser.test.ts`

**Step 1:** Add failing tests for separate `blockdata_admin` and `agchain_admin` role resolution plus `GET /auth/access`.
**Step 2:** Update AGChain model route tests to expect `require_agchain_admin`.
**Step 3:** Add failing Deno tests for `requireBlockdataAdmin` alongside the preserved `requireSuperuser` behavior.

**Test command:** `cd services/platform-api && pytest -q tests/test_auth.py tests/test_auth_access.py tests/test_agchain_models.py`
**Expected output:** Failing assertions for missing roles, missing `/auth/access`, or unchanged superuser-only AGChain auth.

**Commit:** `test: lock admin registry role split backend expectations`

## Task 3: Implement registry, auth, and edge gating

**File(s):** `supabase/migrations/20260404153000_registry_admin_surface_profiles.sql`, `supabase/functions/_shared/superuser.ts`, `supabase/functions/admin-config/index.ts`, `services/platform-api/app/auth/dependencies.py`, `services/platform-api/app/api/routes/auth_access.py`, `services/platform-api/app/api/routes/admin_config_docling.py`, `services/platform-api/app/api/routes/agchain_models.py`, `services/platform-api/app/main.py`

**Step 1:** Create the migration for the two new registry tables plus superuser-row backfill.
**Step 2:** Extend registry-backed auth helpers and role resolution to support `blockdata_admin` and `agchain_admin`.
**Step 3:** Add `GET /auth/access` with the locked observability contract.
**Step 4:** Re-gate `admin-config`, `/admin/config/docling`, and AGChain model admin mutations to the new roles.
**Step 5:** Run the backend and Deno tests until they pass cleanly.

**Test command:** `cd services/platform-api && pytest -q tests/test_auth.py tests/test_auth_access.py tests/test_agchain_models.py && cd ../../supabase && deno test functions/_shared/superuser.test.ts`
**Expected output:** All targeted pytest and Deno tests pass.

**Commit:** `feat: add separate blockdata and agchain admin auth gates`

## Task 4: Implement selector, routes, and admin shell split

**File(s):** `web/src/hooks/useAdminSurfaceAccess.ts`, `web/src/hooks/useSuperuserProbe.ts`, `web/src/pages/superuser/SuperuserGuard.tsx`, `web/src/components/shell/ShellWorkspaceSelector.tsx`, `web/src/components/admin/AdminLeftNav.tsx`, `web/src/components/layout/AdminShellLayout.tsx`, `web/src/router.tsx`, `web/src/pages/admin/AgchainAdminModelsPage.tsx`, `web/src/pages/superuser/SuperuserWorkspace.tsx`

**Step 1:** Add the authenticated access hook and wire the selector plus guards to it.
**Step 2:** Split the admin nav inventories and make the admin shell choose the correct inventory by route prefix.
**Step 3:** Add `/app/blockdata-admin` and `/app/agchain-admin`, move the current BlockData-owned routes, and keep `/app/superuser` DEV ONLY.
**Step 4:** Add the AGChain Admin models placeholder and repoint legacy redirects.
**Step 5:** Run the focused frontend test command until all shell tests pass.

**Test command:** `cd web && npm run test -- src/components/shell/ShellWorkspaceSelector.test.tsx src/components/admin/__tests__/AdminLeftNav.test.tsx src/components/layout/__tests__/AdminShellLayout.test.tsx src/pages/superuser/PlanTracker.test.tsx`
**Expected output:** All targeted Vitest modules pass with the new selector and route split.

**Commit:** `feat: split admin selector and routes into three surfaces`

## Task 5: Final verification

**File(s):** `docs/plans/dev-only/admin-surface-split/2026-04-04-admin-surface-split-implementation-plan.md`

**Step 1:** Re-run all targeted frontend, backend, and Deno test commands.
**Step 2:** Verify the selector and each guarded route manually in the logged-in app.
**Step 3:** Compare the actual file inventory to the locked inventory and note any drift before handoff.

**Test command:** `cd web && npm run test -- src/components/shell/ShellWorkspaceSelector.test.tsx src/components/admin/__tests__/AdminLeftNav.test.tsx src/components/layout/__tests__/AdminShellLayout.test.tsx src/pages/superuser/PlanTracker.test.tsx && cd ../services/platform-api && pytest -q tests/test_auth.py tests/test_auth_access.py tests/test_agchain_models.py && cd ../../supabase && deno test functions/_shared/superuser.test.ts`
**Expected output:** All targeted checks pass with no unexpected failures.

**Commit:** `chore: verify admin surface split`
