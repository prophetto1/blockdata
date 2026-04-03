# AGChain Settings Shell Reconciled Closeout Implementation Plan

**Goal:** Replace the stale 2026-04-01 settings-shell execution artifact with a current-truth closeout plan that matches the shipped AGChain architecture, verifies the routed settings shell end to end, and limits any remaining implementation to regressions discovered during that verification.

**Architecture:** The routed settings shell already exists. `AgchainSettingsPage` is an index redirect, `AgchainSettingsNav` is the grouped settings rail inside `AgchainShellLayout`, organization members and permission groups are real page-owned settings surfaces, limited settings routes render through `AgchainSettingsPlaceholderLayout` and `AgchainSettingsPlaceholderPage`, and benchmark definition remains a real project-scoped page with page-local benchmark navigation. Backend settings routes, access helpers, migrations, and permission/invite persistence are already landed and stay frozen unless targeted verification proves a regression.

**Tech Stack:** React, TypeScript, React Router, Vitest, FastAPI, Supabase Postgres migrations, pytest, OpenTelemetry.

**Status:** Draft  
**Date:** 2026-04-03

## Takeover decision

This plan is a **rewrite with scope adjustment** under `taking-over-investigation-and-plan`.

Why:

- the original 2026-04-01 plan is largely implemented already
- a later approved plan changed the frontend settings composition contract
- continuing to execute the older plan as written would incorrectly re-open superseded architecture

This successor plan therefore becomes the execution artifact for any remaining settings-shell work.

## Source of truth

This plan is derived from:

- `docs/plans/feature-settings-org-level, project-level separation/2026-04-01-agchain-settings-shell-members-permission-groups-implementation-plan.md`
- `docs/plans/2026-04-02-agchain-page-composition-correction-implementation-plan.md`
- the current AGChain settings runtime files under `web/src/components/agchain/settings/**`, `web/src/pages/agchain/settings/**`, `web/src/pages/agchain/AgchainSettingsPage.tsx`, and `web/src/components/layout/AgchainShellLayout.tsx`
- the current AGChain settings backend files under `services/platform-api/app/api/routes/agchain_settings.py` and `services/platform-api/app/domain/agchain/**`
- the current AGChain settings migrations:
  - `supabase/migrations/20260402170000_agchain_settings_permission_groups_and_invites_schema.sql`
  - `supabase/migrations/20260402171000_agchain_settings_owners_backfill.sql`
- verification run on 2026-04-03:
  - `cd services/platform-api && pytest -q tests/test_agchain_workspaces.py tests/test_agchain_settings.py`
  - `cd web && npx vitest run src/components/agchain/AgchainOrganizationSwitcher.test.tsx src/components/agchain/settings/AgchainSettingsNav.test.tsx src/pages/agchain/AgchainSettingsPage.test.tsx src/components/agchain/AgchainBenchmarkNav.test.tsx src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx src/components/layout/AgchainShellLayout.test.tsx src/pages/agchain/settings/AgchainOrganizationMembersPage.test.tsx src/components/agchain/settings/InviteOrganizationMembersModal.test.tsx src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx src/components/agchain/settings/CreatePermissionGroupModal.test.tsx src/components/agchain/settings/PermissionGroupPermissionsModal.test.tsx src/components/agchain/settings/PermissionGroupMembersModal.test.tsx src/pages/agchain/AgchainBenchmarksPage.test.tsx`

Execution note:

- The original 2026-04-01 plan remains a historical design artifact.
- This successor plan is the only plan that should be executed going forward for the settings-shell batch.
- Any third-party evaluation packet for this successor plan should include:
  - `docs/plans/feature-settings-org-level, project-level separation/2026-04-01-agchain-settings-shell-members-permission-groups-implementation-plan.md`
  - `docs/plans/2026-04-02-agchain-page-composition-correction-implementation-plan.md`
  - this successor plan
  - the current AGChain settings runtime bundle or equivalent code packet

## Verified current state

### Routed settings shell is already live

- `web/src/pages/agchain/AgchainSettingsPage.tsx` already redirects `/app/agchain/settings` to `/app/agchain/settings/organization/members`.
- `web/src/components/layout/AgchainShellLayout.tsx` already mounts the settings rail for `/app/agchain/settings/*`.
- `web/src/components/agchain/settings/AgchainSettingsNav.tsx` already renders grouped `Organization`, `Project`, and `Personal` sections.
- limited settings routes already exist as visible placeholder routes rather than missing routes

### Benchmark-definition compatibility seam already landed

- `web/src/components/agchain/AgchainBenchmarkNav.tsx` remains the page-local benchmark-definition navigation model
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx` remains the real benchmark-definition surface
- benchmark-definition route and hash compatibility tests are green

### Backend settings foundations already landed

- `services/platform-api/app/api/routes/agchain_settings.py` already exposes:
  - permission definitions
  - organization members list
  - pending invite creation
  - membership status update
  - permission-group list
  - permission-group create
  - permission-group detail
  - permission-group member list/add/remove
- `services/platform-api/app/domain/agchain/organization_access.py`, `organization_members.py`, `permission_groups.py`, and `project_access.py` already exist
- both planned migrations already exist
- backend verification is green: `22 passed`

### Organization members and permission groups are already real pages

- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx` is already a real organization-scoped page
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx` is already a real organization-scoped page
- both pages already use the later AGChain page-owned composition pattern rather than the older wrapper pattern
- frontend verification is green: `36 passed`

### The original frontend wrapper contract is superseded

- `AgchainSettingsSectionLayout` was part of the older plan
- the later 2026-04-02 AGChain page-composition correction explicitly deleted that wrapper
- current limited settings routes render through:
  - `web/src/components/agchain/settings/AgchainSettingsPlaceholderLayout.tsx`
  - `web/src/components/agchain/settings/AgchainSettingsPlaceholderPage.tsx`
- current real settings pages own their own composition through `AgchainPageFrame` and `AgchainPageHeader`

### One unrelated build blocker exists outside this scope

- `cd web && npm run build` currently fails in dirty worktree state because of an unrelated TypeScript error in `web/src/components/agchain/datasets/AgchainDatasetVersionSwitcher.tsx`
- that file is outside this plan's scope
- this plan does not absorb that unrelated dataset regression

## Pre-implementation contract

No settings-shell closeout work may improvise a return to the 2026-04-01 wrapper model. If any item below needs to change, this plan must be revised first.

## Locked decisions

1. This batch is a reconciliation and closeout batch, not a reimplementation of the original feature.
2. The routed settings shell, members API, invites API, permission-groups API, and persistence foundations are already considered landed.
3. `AgchainSettingsSectionLayout` must not be reintroduced.
4. Real settings pages remain page-owned surfaces.
5. Limited settings routes remain explicit placeholder surfaces.
6. Benchmark definition remains a real project-scoped settings route with page-local benchmark navigation.
7. This batch does not widen into real implementations for `project/general`, `project/members`, `project/access`, `personal/preferences`, or `personal/credentials`.
8. This batch does not widen into unrelated dataset, tools, or general AGChain build issues.
9. Backend settings files are frozen unless targeted verification proves a regression.
10. If all targeted verification remains green and browser checks pass, no code changes are required.

## Locked route contract

| Route | Expected state in this batch |
| --- | --- |
| `/app/agchain/settings` | redirect to organization members |
| `/app/agchain/settings/organization/members` | real page |
| `/app/agchain/settings/organization/permission-groups` | real page |
| `/app/agchain/settings/organization/api-keys` | visible placeholder |
| `/app/agchain/settings/organization/ai-providers` | visible placeholder |
| `/app/agchain/settings/project/general` | visible placeholder |
| `/app/agchain/settings/project/benchmark-definition` | real page |
| `/app/agchain/settings/project/members` | visible placeholder |
| `/app/agchain/settings/project/access` | visible placeholder |
| `/app/agchain/settings/personal/preferences` | visible placeholder |
| `/app/agchain/settings/personal/credentials` | visible placeholder |

## Locked platform API surface

The platform API contract for this batch is frozen. No new settings endpoints are added, and no existing settings endpoint is removed.

### Existing settings endpoints preserved

- `GET /agchain/settings/organizations/{organization_id}/permission-definitions`
- `GET /agchain/settings/organizations/{organization_id}/members`
- `POST /agchain/settings/organizations/{organization_id}/member-invitations`
- `PATCH /agchain/settings/organizations/{organization_id}/members/{organization_member_id}`
- `GET /agchain/settings/organizations/{organization_id}/permission-groups`
- `POST /agchain/settings/organizations/{organization_id}/permission-groups`
- `GET /agchain/settings/organizations/{organization_id}/permission-groups/{permission_group_id}`
- `GET /agchain/settings/organizations/{organization_id}/permission-groups/{permission_group_id}/members`
- `POST /agchain/settings/organizations/{organization_id}/permission-groups/{permission_group_id}/members`
- `DELETE /agchain/settings/organizations/{organization_id}/permission-groups/{permission_group_id}/members/{organization_member_id}`

### Allowed API change class

- targeted regression repair only
- no request/response contract broadening
- no route-prefix or authorization-boundary changes

## Locked observability surface

Existing settings observability remains frozen in this batch. Regression fixes may repair broken instrumentation on existing routes, but they do not create a new telemetry model.

### Existing observability contract preserved

| Type | Name | Emit location | Purpose | Allowed attributes |
| --- | --- | --- | --- | --- |
| span | `agchain.settings.members.list` | `services/platform-api/app/api/routes/agchain_settings.py` `list_organization_members_route()` | trace members-list latency and result volume | `organization_id_present`, `row_count`, `latency_ms`, `result` |
| counter | `platform.agchain.settings.members.list.count` | same route | count members-list requests | `organization_id_present`, `row_count`, `latency_ms`, `result` |
| histogram | `platform.agchain.settings.members.list.duration_ms` | same route | record members-list latency | `organization_id_present`, `row_count`, `latency_ms`, `result` |
| span | `agchain.settings.members.invite` | `create_organization_member_invitations_route()` | trace invite-batch execution and outcomes | `organization_id_present`, `email_count`, `invite_created_count`, `already_pending_count`, `already_member_count`, `invalid_email_count`, `result` |
| counter | `platform.agchain.settings.members.invite.count` | same route | count invite-batch executions | `organization_id_present`, `email_count`, `invite_created_count`, `already_pending_count`, `already_member_count`, `invalid_email_count`, `result` |
| structured log | `agchain.settings.members.invite.completed` | same route | record invite-batch completion summary | same safe attributes as the invite span/counter |
| span | `agchain.settings.members.update` | `update_organization_membership_status_route()` | trace membership status changes | `organization_id_present`, `organization_member_id_present`, `membership_status`, `result` |
| counter | `platform.agchain.settings.members.update.count` | same route | count membership status updates | `organization_id_present`, `organization_member_id_present`, `membership_status`, `result` |
| span | `agchain.settings.permission_groups.list` | `list_permission_groups_route()` | trace permission-group list latency and result volume | `organization_id_present`, `row_count`, `latency_ms`, `result` |
| counter | `platform.agchain.settings.permission_groups.list.count` | same route | count permission-group list requests | `organization_id_present`, `row_count`, `latency_ms`, `result` |
| histogram | `platform.agchain.settings.permission_groups.list.duration_ms` | same route | record permission-group list latency | `organization_id_present`, `row_count`, `latency_ms`, `result` |
| span | `agchain.settings.permission_groups.create` | `create_permission_group_route()` | trace permission-group creation | `organization_id_present`, `permission_key_count`, `result` |
| counter | `platform.agchain.settings.permission_groups.create.count` | same route | count permission-group create requests | `organization_id_present`, `permission_key_count`, `result` |
| structured log | `agchain.settings.permission_groups.created` | same route | record created-group summary | `permission_group_id`, `is_system_group`, plus the same safe span attributes |
| span | `agchain.settings.permission_groups.get` | `get_permission_group_route()` | trace permission-group detail fetches | `organization_id_present`, `permission_group_id_present`, `result` |
| span | `agchain.settings.permission_groups.members.list` | `list_permission_group_members_route()` | trace group-members list reads | `organization_id_present`, `permission_group_id_present`, `row_count`, `result` |
| span | `agchain.settings.permission_groups.members.add` | `add_permission_group_members_route()` | trace member-add operations | `organization_id_present`, `permission_group_id_present`, `requested_member_count`, `added_count`, `already_present_count`, `result` |
| counter | `platform.agchain.settings.permission_groups.members.add.count` | same route | count member-add operations | `organization_id_present`, `permission_group_id_present`, `requested_member_count`, `added_count`, `already_present_count`, `result` |
| span | `agchain.settings.permission_groups.members.remove` | `remove_permission_group_member_route()` | trace member-removal operations | `organization_id_present`, `permission_group_id_present`, `organization_member_id_present`, `removed`, `result` |
| counter | `platform.agchain.settings.permission_groups.members.remove.count` | same route | count member-removal operations | `organization_id_present`, `permission_group_id_present`, `organization_member_id_present`, `removed`, `result` |

### Forbidden observability attributes

- raw email addresses
- invite tokens or hashed invite tokens
- permission group descriptions
- raw permission-key arrays
- full organization member identifiers or profile payloads beyond the existing `_present` booleans
- any new attributes outside the preserved contract above unless this plan is revised first

### Allowed observability change class

- restore or preserve current telemetry on existing settings routes
- no new telemetry families unless a targeted regression fix requires parity restoration

## Database Migrations

No database migrations.

Justification:

- the settings-shell schema, invite tables, permission-group tables, and `Owners` backfill migrations already landed in the original implementation batch
- this closeout plan is limited to verification and bounded regression repair against already-landed runtime behavior
- if any regression repair would require a new migration, implementation must stop and this plan must be revised first

## Edge Functions

No edge function changes.

Justification:

- the AGChain settings shell, members surface, permission-groups surface, and benchmark-definition seam in this batch do not route through a Supabase edge-function seam that needs migration or repair
- all allowed backend regression repair in this plan is constrained to the existing platform API and domain helpers

## Frontend Surface Area

### Inventory count summary

- Modified existing frontend runtime files: `20`
- Modified existing frontend test files: `13`
- New frontend runtime files: `0`
- New frontend test files: `0`
- Deleted frontend runtime files: `0`
- Deleted frontend test files: `0`

### Mount responsibility

| File | Mount / responsibility |
| --- | --- |
| `web/src/pages/agchain/AgchainSettingsPage.tsx` | settings index redirect for `/app/agchain/settings` |
| `web/src/components/layout/AgchainShellLayout.tsx` | mounts the settings rail inside the AGChain shell for `/app/agchain/settings/*` |
| `web/src/components/agchain/settings/AgchainSettingsNav.tsx` | grouped settings navigation authority for organization, project, and personal sections |
| `web/src/components/agchain/settings/AgchainSettingsPlaceholderPage.tsx` | mounted placeholder owner for limited settings routes |
| `web/src/components/agchain/settings/AgchainSettingsPlaceholderLayout.tsx` | visual scaffold for mounted limited settings routes |
| `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx` | real organization-level settings page for members |
| `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx` | real organization-level settings page for permission groups |
| `web/src/pages/agchain/AgchainBenchmarksPage.tsx` | real project-scoped benchmark-definition settings surface |
| `web/src/components/agchain/AgchainBenchmarkNav.tsx` | page-local benchmark-definition subsection navigation |
| `web/src/components/agchain/AgchainOrganizationSwitcher.tsx` | footer route into organization members from the AGChain shell switcher surface |

## Locked inventory counts

These are maximum-touch counts for this closeout batch. Zero actual code edits is a valid outcome if verification stays green.

### Frontend runtime

- Modified existing frontend runtime files: `20`
- New frontend runtime files: `0`
- Deleted frontend runtime files: `0`

### Frontend tests

- Modified existing frontend test files: `13`
- New frontend test files: `0`
- Deleted frontend test files: `0`

### Backend runtime

- Modified existing backend runtime files: `5`
- New backend runtime files: `0`
- Deleted backend runtime files: `0`

### Backend tests

- Modified existing backend test files: `2`
- New backend test files: `0`
- Deleted backend test files: `0`

### Database

- Modified migration files: `0`
- New migration files: `0`

## Locked file inventory

### Frontend runtime files

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/agchain/AgchainOrganizationSwitcher.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.tsx`
- `web/src/components/agchain/settings/AgchainSettingsNav.tsx`
- `web/src/components/agchain/settings/AgchainSettingsSearch.tsx`
- `web/src/components/agchain/settings/AgchainSettingsPlaceholderLayout.tsx`
- `web/src/components/agchain/settings/AgchainSettingsPlaceholderPage.tsx`
- `web/src/components/agchain/AgchainBenchmarkNav.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx`
- `web/src/components/agchain/settings/OrganizationMembersTable.tsx`
- `web/src/components/agchain/settings/InviteOrganizationMembersModal.tsx`
- `web/src/hooks/agchain/useAgchainOrganizationMembers.ts`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx`
- `web/src/components/agchain/settings/PermissionGroupsTable.tsx`
- `web/src/components/agchain/settings/CreatePermissionGroupModal.tsx`
- `web/src/components/agchain/settings/PermissionGroupPermissionsModal.tsx`
- `web/src/components/agchain/settings/PermissionGroupMembersModal.tsx`
- `web/src/hooks/agchain/useAgchainPermissionGroups.ts`
- `web/src/lib/agchainSettings.ts`

### Frontend test files

- `web/src/components/agchain/AgchainOrganizationSwitcher.test.tsx`
- `web/src/components/agchain/settings/AgchainSettingsNav.test.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.test.tsx`
- `web/src/components/agchain/AgchainBenchmarkNav.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx`
- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.test.tsx`
- `web/src/components/agchain/settings/InviteOrganizationMembersModal.test.tsx`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx`
- `web/src/components/agchain/settings/CreatePermissionGroupModal.test.tsx`
- `web/src/components/agchain/settings/PermissionGroupPermissionsModal.test.tsx`
- `web/src/components/agchain/settings/PermissionGroupMembersModal.test.tsx`

### Backend runtime files

- `services/platform-api/app/api/routes/agchain_settings.py`
- `services/platform-api/app/domain/agchain/organization_access.py`
- `services/platform-api/app/domain/agchain/organization_members.py`
- `services/platform-api/app/domain/agchain/permission_groups.py`
- `services/platform-api/app/domain/agchain/project_access.py`

### Backend test files

- `services/platform-api/tests/test_agchain_settings.py`
- `services/platform-api/tests/test_agchain_workspaces.py`

## Frozen seam contract

- `web/src/components/agchain/settings/AgchainSettingsNav.tsx` remains the grouped settings-rail authority.
- `web/src/components/agchain/settings/AgchainSettingsPlaceholderLayout.tsx` and `AgchainSettingsPlaceholderPage.tsx` remain the placeholder authority for limited settings routes.
- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx` and `AgchainPermissionGroupsPage.tsx` remain real page-owned settings surfaces.
- `web/src/components/agchain/AgchainBenchmarkNav.tsx` remains page-local benchmark-definition navigation, not shell Rail 2.
- `web/src/pages/agchain/AgchainSettingsPage.tsx` remains an index redirect stub, not a standalone content page.

## Explicit risks

1. This closeout batch may legitimately end with zero code edits if all targeted verification remains green.
2. Full `cd web && npm run build` may remain red because of the known out-of-scope TypeScript failure in `web/src/components/agchain/datasets/AgchainDatasetVersionSwitcher.tsx`.
3. Manual verification depends on a valid AGChain-authenticated browser session with organization and project context available.
4. The original 2026-04-01 wrapper-oriented screenshots and composition assumptions are no longer the truth source for real settings pages; using them directly can create false-positive regression claims.
5. Because backend files remain in maximum-touch scope only for regression repair, widening into new settings API work during this batch would be plan drift.

## Task breakdown

### Task 1: Verify the routed settings shell and benchmark-definition seam against the locked contract

**Files:**

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/agchain/AgchainOrganizationSwitcher.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.tsx`
- `web/src/components/agchain/settings/AgchainSettingsNav.tsx`
- `web/src/components/agchain/settings/AgchainSettingsSearch.tsx`
- `web/src/components/agchain/settings/AgchainSettingsPlaceholderLayout.tsx`
- `web/src/components/agchain/settings/AgchainSettingsPlaceholderPage.tsx`
- `web/src/components/agchain/AgchainBenchmarkNav.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/components/agchain/AgchainOrganizationSwitcher.test.tsx`
- `web/src/components/agchain/settings/AgchainSettingsNav.test.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.test.tsx`
- `web/src/components/agchain/AgchainBenchmarkNav.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx`

**Steps:**

1. Re-run the routed shell and benchmark-definition tests.
2. Manually verify `/app/agchain/settings` redirect behavior, grouped settings navigation, organization-switcher footer action, limited placeholder routes, and benchmark-definition route/hash behavior in the browser.
3. If both automated and manual verification pass, mark this surface complete with no runtime edits.
4. If verification fails, only the following regression classes are eligible for repair in this batch:
   - broken `/app/agchain/settings` redirect behavior
   - broken grouped settings navigation or search filtering
   - broken organization-switcher footer routing into organization members
   - limited settings routes no longer rendering through the explicit placeholder scaffold
   - benchmark-definition route, hash, or page-local navigation ownership regression
5. After any allowed repair, rerun the exact same verification command and browser checks before proceeding.

**Test command:**

- `cd web && npx vitest run src/components/agchain/AgchainOrganizationSwitcher.test.tsx src/components/agchain/settings/AgchainSettingsNav.test.tsx src/pages/agchain/AgchainSettingsPage.test.tsx src/components/agchain/AgchainBenchmarkNav.test.tsx src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx src/components/layout/AgchainShellLayout.test.tsx src/pages/agchain/AgchainBenchmarksPage.test.tsx`

**Expected output:**

- Vitest passes with grouped settings navigation, redirect behavior, organization-switcher routing, benchmark-definition compatibility, and shell ownership still covered.
- Either no edits were required, or only the allowed regression classes above were repaired and re-verified.

**Commit:** `fix(agchain-settings): repair routed shell closeout regressions`

### Task 2: Verify the real organization settings surfaces against the locked contract

**Files:**

- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx`
- `web/src/components/agchain/settings/OrganizationMembersTable.tsx`
- `web/src/components/agchain/settings/InviteOrganizationMembersModal.tsx`
- `web/src/hooks/agchain/useAgchainOrganizationMembers.ts`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx`
- `web/src/components/agchain/settings/PermissionGroupsTable.tsx`
- `web/src/components/agchain/settings/CreatePermissionGroupModal.tsx`
- `web/src/components/agchain/settings/PermissionGroupPermissionsModal.tsx`
- `web/src/components/agchain/settings/PermissionGroupMembersModal.tsx`
- `web/src/hooks/agchain/useAgchainPermissionGroups.ts`
- `web/src/lib/agchainSettings.ts`
- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.test.tsx`
- `web/src/components/agchain/settings/InviteOrganizationMembersModal.test.tsx`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx`
- `web/src/components/agchain/settings/CreatePermissionGroupModal.test.tsx`
- `web/src/components/agchain/settings/PermissionGroupPermissionsModal.test.tsx`
- `web/src/components/agchain/settings/PermissionGroupMembersModal.test.tsx`
- `services/platform-api/app/api/routes/agchain_settings.py`
- `services/platform-api/app/domain/agchain/organization_access.py`
- `services/platform-api/app/domain/agchain/organization_members.py`
- `services/platform-api/app/domain/agchain/permission_groups.py`
- `services/platform-api/app/domain/agchain/project_access.py`
- `services/platform-api/tests/test_agchain_settings.py`
- `services/platform-api/tests/test_agchain_workspaces.py`

**Steps:**

1. Re-run the backend settings/access test suite.
2. Re-run the frontend members and permission-groups test suite.
3. Manually verify that members and permission groups still render as real page-owned surfaces rather than placeholder routes.
4. If all verification passes, mark this surface complete with no runtime or backend edits.
5. If verification fails, only the following regression classes are eligible for repair in this batch:
   - organization members route rendering as placeholder or broken shell content
   - invite modal outcomes, validation, or pending-invite reporting regression
   - protected `Owners` visibility or last-owner safeguard regression
   - permission-definition loading, permission-group create/detail/list regression
   - permission-group member add/remove or modal flow regression
   - organization-access or project-access enforcement regression on existing settings routes
6. After any allowed repair, rerun the exact backend and frontend verification commands before proceeding.

**Test commands:**

- `cd services/platform-api && pytest -q tests/test_agchain_workspaces.py tests/test_agchain_settings.py`
- `cd web && npx vitest run src/pages/agchain/settings/AgchainOrganizationMembersPage.test.tsx src/components/agchain/settings/InviteOrganizationMembersModal.test.tsx src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx src/components/agchain/settings/CreatePermissionGroupModal.test.tsx src/components/agchain/settings/PermissionGroupPermissionsModal.test.tsx src/components/agchain/settings/PermissionGroupMembersModal.test.tsx`

**Expected output:**

- Pytest passes with organization-access, invite persistence, permission groups, and protected `Owners` safeguards covered.
- Vitest passes with organization members and permission-groups flows still covered under the corrected page-owned layout model.
- Either no edits were required, or only the allowed regression classes above were repaired and re-verified.

**Commit:** `fix(agchain-settings): repair organization settings closeout regressions`

### Task 3: Close out the reconciled settings-shell batch

**Steps:**

1. Record a closeout evidence artifact for this batch that includes:
   - the exact `pytest` output from `tests/test_agchain_workspaces.py tests/test_agchain_settings.py`
   - the exact `vitest` output from the targeted frontend settings-shell suite
   - the manual browser checklist result, item by item
   - the exact `cd web && npm run build` output from the candidate closeout commit or branch state
   - the build-waiver note, if applicable
2. Run `cd web && npm run build` on the candidate closeout commit or branch state. This build run is mandatory for closeout.
3. If no settings regressions remain, close the batch without reopening already-green architecture.
4. This batch may close without a green full web build only if that mandatory build run proves the only remaining failure is the known out-of-scope TypeScript error in `web/src/components/agchain/datasets/AgchainDatasetVersionSwitcher.tsx`.
5. If the mandatory build run fails in any locked file-inventory path covered by this plan, the batch cannot close until that settings-shell regression is fixed.
6. If the dataset-switcher failure is the only remaining build blocker, record it explicitly as a build waiver for this batch rather than silently ignoring it.

**Manual verification checklist:**

1. Open `/app/agchain/settings` and verify redirect to `/app/agchain/settings/organization/members`.
2. Verify the settings rail shows grouped `Organization`, `Project`, and `Personal` sections.
3. Verify the org-switcher footer action lands on organization members.
4. Verify `Organization / Members` renders as a real page.
5. Verify `Organization / Permission Groups` renders as a real page.
6. Verify limited settings routes render the explicit placeholder scaffold.
7. Verify `/app/agchain/settings/project/benchmark-definition` remains real and benchmark subsection navigation still works.

**Commit:** `test(agchain-settings): close out reconciled settings shell verification`

## Locked acceptance contract

The reconciled settings-shell batch is complete only when all of the following are true:

1. `/app/agchain/settings` redirects to `/app/agchain/settings/organization/members`.
2. The settings rail remains grouped into `Organization`, `Project`, and `Personal`.
3. `AgchainSettingsSectionLayout` is not reintroduced.
4. Limited settings routes render through `AgchainSettingsPlaceholderLayout` and `AgchainSettingsPlaceholderPage`.
5. `Organization / Members` remains a real page-owned settings surface.
6. `Organization / Permission Groups` remains a real page-owned settings surface.
7. Benchmark definition remains a real project-scoped settings route with page-local benchmark navigation.
8. Backend settings/access tests pass.
9. Frontend settings-shell, members, permission-groups, and benchmark-definition tests pass.
10. Manual browser verification passes for redirect, grouped navigation, real org pages, placeholder routes, and benchmark-definition.
11. No unrelated dataset/build issues are silently absorbed into this settings-shell batch.
12. A fresh `cd web && npm run build` run is executed on the candidate closeout commit or branch state.
13. Either that mandatory build run is green, or it proves the only remaining web-build failure is the documented out-of-scope `AgchainDatasetVersionSwitcher.tsx` error with an explicit waiver recorded during Task 3.

## Completion criteria

This successor plan is complete when:

- the current routed settings-shell architecture is verified against the live repo rather than the superseded wrapper design
- any remaining regressions are fixed without reopening the settled architecture
- the original 2026-04-01 plan is no longer treated as the executable source of truth
- future AGChain settings work can continue from the reconciled current-truth contract in this document
- the closeout evidence artifact contains the exact backend test output, frontend test output, manual checklist result, and candidate-state build result
- the batch closeout rule for the out-of-scope dataset build failure is explicit rather than implicit
