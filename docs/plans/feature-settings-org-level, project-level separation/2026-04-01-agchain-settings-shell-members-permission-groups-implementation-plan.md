# 2026-04-01 AGChain Settings Shell + Organization Members + Permission Groups Implementation Plan

## Will require revision before implementation

## Source of truth

This plan is derived from:

- `docs/plans/feature-settings-org-level, project-level separation/agchain-settings-reference-note.md`
- the current AGChain router, shell, settings page, and workspace context implementation
- the current platform-api AGChain workspace routes and access helpers
- the current linked Supabase schema as of 2026-04-01

## Objective

Replace the current AGChain settings placeholder with a real routed settings shell that makes scope explicit as `Organization -> Project -> Personal`, then deliver the first two real organization-level settings surfaces:

1. `Organization / Members`
2. `Organization / Permission Groups`

This batch must preserve the current AGChain shell and benchmark-definition route family while moving settings from a transitional landing page to a durable multi-tenant admin surface.

## Tech stack

- Frontend: React 19, TypeScript 5.9, Vite 7, React Router 7, Tailwind 4, Tabler icons, existing AGChain shell primitives
- Frontend testing: Vitest 4, Testing Library, jsdom
- Backend: FastAPI on Python 3.11
- Backend testing: pytest
- Database: Supabase Postgres, SQL migrations in `supabase/migrations`
- Auth: existing authenticated platform-api routes via `require_user_auth`
- Observability: OpenTelemetry spans and metrics plus structured logs through the existing `safe_attributes` contract

## Verified current state

### Frontend

- `web/src/router.tsx` mounts `/app/agchain/settings` as an index page and currently exposes only one child route: `/app/agchain/settings/project/benchmark-definition`.
- `web/src/router.tsx` keeps `/app/agchain/benchmarks` and `/app/agchain/build` as redirects into `/app/agchain/settings/project/benchmark-definition`.
- `web/src/components/layout/AgchainShellLayout.tsx` only renders Rail 2 when `location.pathname === '/app/agchain/settings/project/benchmark-definition'`.
- `web/src/pages/agchain/AgchainSettingsPage.tsx` is still a placeholder landing page with `Project`, `Organization`, and `Personal` cards and a benchmark-definition CTA.
- `web/src/components/agchain/AgchainBenchmarkNav.tsx` is currently the shell-level Rail 2 content for benchmark-definition hash sections.
- `web/src/hooks/agchain/useAgchainWorkspaceContext.ts` already provides the reusable org/project selection seam for any settings shell that depends on selected organization and selected project.

### Backend

- `services/platform-api/app/api/routes/agchain_workspaces.py` already exposes:
  - `GET /agchain/organizations`
  - `GET /agchain/projects`
  - `POST /agchain/projects`
  - `GET /agchain/projects/{project_id}`
  - `PATCH /agchain/projects/{project_id}`
- `services/platform-api/app/domain/agchain/workspace_registry.py` already returns `settings_partitions: ["project", "organization", "personal"]` from `get_project`.
- `services/platform-api/app/domain/agchain/project_access.py` already recognizes `organization_admin` as a bypass for project write access and already loads org/project membership rows.

### Database

- Existing AGChain workspace scope tables are live:
  - `public.agchain_organizations`
  - `public.agchain_organization_members`
  - `public.agchain_project_memberships`
  - `public.user_projects`
  - `public.profiles`
- `agchain_organization_members` currently supports only `membership_role in ('organization_admin', 'organization_member')`.
- `agchain_organization_members` currently supports only `membership_status in ('active', 'disabled')`.
- No permission-group tables currently exist in the linked database.
- No invite/pending-membership table currently exists in the linked database.

## Locked product decisions

- AGChain settings moves to a dedicated routed settings layout, not a card landing page.
- The visible information architecture is `Organization -> Project -> Personal`.
- `/app/agchain/settings` redirects to the first real org-level surface.
- `Organization` is the V1 anchor and must be truly functional.
- `Project` and `Personal` remain visible in the settings nav even where sections are still limited.
- `Organization / Members` lands first as the first real admin feature.
- `Organization / Permission Groups` lands second in the same initiative.
- Settings search in V1 filters settings-nav items only. It does not search page content.
- AGChain-personal settings remain inside AGChain. Global account/platform settings remain outside AGChain.
- Benchmark definition remains a real project child surface under settings and must stay reachable through the current compatibility routes and hash anchors.
- V1 permission-group creation and editing exposes organization-level grants only. Project-scope grant storage stays reserved for a later enforcement-focused batch.

## Execution gate: workspace-state architecture dependency

This plan is revised and lockable now, but implementation must not start until the separate workspace-state architecture issue is resolved.

Blocking dependency:

- selected-organization and selected-project source of truth across the AGChain shell

The settings implementation in this plan assumes the workspace-state decision will explicitly settle:

- whether `useAgchainWorkspaceContext` remains the shell authority or becomes a compatibility adapter
- how `selectedOrganizationId` is persisted and recovered
- how the shell behaves when org state is loading, missing, stale, or failed
- whether settings routes are allowed to auto-heal missing selection state or must stop in an explicit empty/error shell

Until that architecture issue is resolved, this plan is execution-blocked and should be treated as a revised implementation contract only.

## Architecture

### Shell model

- Keep the existing AGChain primary product rail.
- Convert AGChain settings into a routed subtree under `/app/agchain/settings/*`.
- Make Rail 2 a real settings rail for the entire settings subtree.
- Move the benchmark-definition hash-section nav out of shell Rail 2 and into page-local navigation inside the benchmark-definition page.
- Render settings pages inside a shared settings section layout that reuses the platform settings visual language where useful but stays inside the AGChain shell.

### Ownership model

- Organization settings govern shared tenant membership and reusable access bundles.
- Project settings govern the selected AGChain project or evaluation.
- Personal settings govern AGChain-specific personal defaults and credentials only.

## Pre-implementation contract

The implementation must satisfy these rules:

- Do not keep the current three-card settings landing as the primary settings experience.
- Do not introduce direct browser CRUD against Supabase tables. All AGChain settings mutations must go through platform-api.
- Do not remove or rename the existing AGChain primary rail items in this batch.
- Do not break the current org/project focus seam in `useAgchainWorkspaceContext`.
- Do not break these compatibility routes:
  - `/app/agchain/benchmarks`
  - `/app/agchain/benchmarks/:benchmarkId`
  - `/app/agchain/build`
- Do not break benchmark-definition hash anchors:
  - `#steps`
  - `#questions`
  - `#context`
  - `#state`
  - `#scoring`
  - `#models`
  - `#runner`
  - `#validation`
  - `#runs`
- Do not attempt to replace every existing AGChain authorization check with permission-group grants in this batch.
- Do not add an outbound email-invite dependency unless an already-supported repo-native path is verified during implementation.

## Frozen compatibility seam

These seams remain authoritative during this batch:

- `useAgchainWorkspaceContext` remains the source of selected organization and selected project in the web app.
- `GET /agchain/organizations` remains the source for the organization selector.
- `GET /agchain/projects` and `GET /agchain/projects/{project_id}` remain the source for project selection and project metadata.
- Legacy project and benchmark access continues to rely on `agchain_organization_members` and `agchain_project_memberships`.
- Permission-group grants are introduced now, but non-settings AGChain surfaces continue to use the current membership-role checks unless explicitly extended in this batch.

## Locked route tree

### Frontend route family

The settings route tree must become:

- `/app/agchain/settings`
- `/app/agchain/settings/organization/members`
- `/app/agchain/settings/organization/permission-groups`
- `/app/agchain/settings/organization/api-keys`
- `/app/agchain/settings/organization/ai-providers`
- `/app/agchain/settings/project/general`
- `/app/agchain/settings/project/benchmark-definition`
- `/app/agchain/settings/project/members`
- `/app/agchain/settings/project/access`
- `/app/agchain/settings/personal/preferences`
- `/app/agchain/settings/personal/credentials`

### Route behavior

| Route | Status in this batch | Notes |
| --- | --- | --- |
| `/app/agchain/settings` | redirect | Redirect to `/app/agchain/settings/organization/members` |
| `/app/agchain/settings/organization/members` | real | First real org-level admin surface |
| `/app/agchain/settings/organization/permission-groups` | real | Second real org-level admin surface |
| `/app/agchain/settings/organization/api-keys` | visible, limited | Deliberate placeholder page inside the real settings shell |
| `/app/agchain/settings/organization/ai-providers` | visible, limited | Deliberate placeholder page inside the real settings shell |
| `/app/agchain/settings/project/general` | visible, limited | Deliberate placeholder or light project summary |
| `/app/agchain/settings/project/benchmark-definition` | real | Existing live project child surface retained |
| `/app/agchain/settings/project/members` | visible, limited | Reserved slot only |
| `/app/agchain/settings/project/access` | visible, limited | Reserved slot only |
| `/app/agchain/settings/personal/preferences` | visible, limited | AGChain-only personal preferences slot |
| `/app/agchain/settings/personal/credentials` | visible, limited | AGChain-only credentials slot |

### Shell behavior contract

- `AgchainShellLayout` renders a settings rail whenever the pathname starts with `/app/agchain/settings`.
- The settings rail contains:
  - a `Search settings` input
  - scope group headers
  - grouped nav items
  - active-route highlighting
- if organization state is loading, the shell stays mounted and the center panel renders a stable loading state instead of redirecting
- if organization state load fails, the shell stays mounted and the center panel renders a retryable error state instead of redirecting
- if the authenticated user has zero accessible AGChain organizations, the shell stays mounted and the center panel renders a no-organization empty state instead of redirecting
- if `selectedOrganizationId` is missing but at least one organization is available, the shell may auto-select the personal organization when present, otherwise the first accessible organization, exactly once per load cycle
- Non-settings AGChain routes keep no Rail 2 in this batch.
- `AgchainBenchmarkNav` becomes page-local inside the benchmark-definition page so benchmark section navigation still exists after Rail 2 is repurposed for settings.

## Locked settings navigation taxonomy

### Project

- `General`
- `Benchmark Definition`
- `Members`
- `Access`

### Organization

- `Members`
- `Permission Groups`
- `API Keys`
- `AI Providers`

### Personal

- `Preferences`
- `Credentials`

V1 functional items:

- `Organization / Members`
- `Organization / Permission Groups`
- `Project / Benchmark Definition`

V1 limited-but-visible items:

- `Project / General`
- `Project / Members`
- `Project / Access`
- `Organization / API Keys`
- `Organization / AI Providers`
- `Personal / Preferences`
- `Personal / Credentials`

## Locked platform API surface

### Existing endpoints reused as-is

- `GET /agchain/organizations`
- `GET /agchain/projects`
- `GET /agchain/projects/{project_id}`

### Modified existing endpoints

- None in this batch. Existing workspace endpoints remain authoritative and unchanged.

### New settings endpoints

All new settings endpoints live under the platform API and use `organization_id` path parameters to match current AGChain API conventions.

#### Global auth requirement

- Every new settings endpoint requires an authenticated user through `require_user_auth`.
- Every new settings endpoint requires organization-admin authority through a new `require_organization_admin` helper in `services/platform-api/app/domain/agchain/organization_access.py`.

#### Organization members

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/agchain/settings/organizations/{organization_id}/members` | List org members for the selected organization |
| `POST` | `/agchain/settings/organizations/{organization_id}/member-invitations` | Add existing platform users to the organization by email and optionally attach permission groups |
| `PATCH` | `/agchain/settings/organizations/{organization_id}/members/{organization_member_id}` | Disable or reactivate an organization membership |

##### `GET /agchain/settings/organizations/{organization_id}/members`

- Auth: authenticated user + `organization_admin` in `agchain_organization_members`
- Request:
  - path: `organization_id: string`
  - query:
    - `search?: string`
    - `status?: 'active' | 'disabled' | 'all'`
- Response:
  ```json
  {
    "organization": {
      "organization_id": "uuid",
      "organization_slug": "text",
      "display_name": "text",
      "is_personal": false
    },
    "items": [
      {
        "organization_member_id": "uuid",
        "organization_id": "uuid",
        "user_id": "uuid",
        "email": "text",
        "display_name": "text",
        "membership_role": "organization_admin | organization_member",
        "membership_status": "active | disabled",
        "created_at": "timestamp",
        "group_count": 0,
        "groups": [
          {
            "permission_group_id": "uuid",
            "name": "text",
            "is_system_group": false
          }
        ]
      }
    ]
  }
  ```
- Touched domain methods:
  - `require_organization_admin`
  - `list_organization_members`
- Touched tables:
  - `public.agchain_organizations`
  - `public.agchain_organization_members`
  - `public.profiles`
  - `public.agchain_permission_group_memberships`
  - `public.agchain_permission_groups`

##### `POST /agchain/settings/organizations/{organization_id}/member-invitations`

- Auth: authenticated user + `organization_admin`
- Request:
  ```json
  {
    "emails": ["person@example.com"],
    "permission_group_ids": ["uuid"]
  }
  ```
- Response:
  ```json
  {
    "ok": true,
    "organization_id": "uuid",
    "results": [
      {
        "email": "person@example.com",
        "outcome": "created | reactivated | already_member | not_found",
        "organization_member_id": "uuid",
        "user_id": "uuid",
        "permission_group_ids": ["uuid"],
        "error_code": null
      }
    ]
  }
  ```
- Touched domain methods:
  - `require_organization_admin`
  - `add_organization_members_by_email`
- Touched tables:
  - `public.profiles`
  - `public.agchain_organization_members`
  - `public.agchain_permission_groups`
  - `public.agchain_permission_group_memberships`

##### `PATCH /agchain/settings/organizations/{organization_id}/members/{organization_member_id}`

- Auth: authenticated user + `organization_admin`
- Request:
  ```json
  {
    "membership_status": "active | disabled"
  }
  ```
- Response:
  ```json
  {
    "ok": true,
    "member": {
      "organization_member_id": "uuid",
      "organization_id": "uuid",
      "user_id": "uuid",
      "membership_role": "organization_admin | organization_member",
      "membership_status": "active | disabled",
      "updated_at": "timestamp"
    }
  }
  ```
- Touched domain methods:
  - `require_organization_admin`
  - `update_organization_membership_status`
- Touched tables:
  - `public.agchain_organization_members`

#### Permission groups

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/agchain/settings/organizations/{organization_id}/permission-groups` | List permission groups with counts and scope summary |
| `POST` | `/agchain/settings/organizations/{organization_id}/permission-groups` | Create a permission group with a bounded organization-level permission set |
| `GET` | `/agchain/settings/organizations/{organization_id}/permission-groups/{permission_group_id}` | Load permission-group detail and grants for the permissions modal |
| `GET` | `/agchain/settings/organizations/{organization_id}/permission-groups/{permission_group_id}/members` | Load group members for the members modal |
| `POST` | `/agchain/settings/organizations/{organization_id}/permission-groups/{permission_group_id}/members` | Add one or more org members to a group |
| `DELETE` | `/agchain/settings/organizations/{organization_id}/permission-groups/{permission_group_id}/members/{organization_member_id}` | Remove one org member from a group |

##### `GET /agchain/settings/organizations/{organization_id}/permission-groups`

- Auth: authenticated user + `organization_admin`
- Request:
  - path: `organization_id: string`
  - query:
    - `search?: string`
- Response:
  ```json
  {
    "organization": {
      "organization_id": "uuid",
      "organization_slug": "text",
      "display_name": "text"
    },
    "items": [
      {
        "permission_group_id": "uuid",
        "organization_id": "uuid",
        "name": "text",
        "group_slug": "text",
        "description": "text",
        "is_system_group": false,
        "member_count": 0,
        "organization_permission_count": 0,
        "project_permission_count": 0,
        "created_at": "timestamp",
        "updated_at": "timestamp"
      }
    ]
  }
  ```
- Touched domain methods:
  - `require_organization_admin`
  - `list_permission_groups`
- Touched tables:
  - `public.agchain_permission_groups`
  - `public.agchain_permission_group_memberships`
  - `public.agchain_permission_group_grants`

##### `POST /agchain/settings/organizations/{organization_id}/permission-groups`

- Auth: authenticated user + `organization_admin`
- Request:
  ```json
  {
    "name": "Analysts",
    "description": "Read-only org admins",
    "permission_keys": [
      "organization.members.read",
      "organization.permission_groups.read"
    ]
  }
  ```
- Response:
  ```json
  {
    "ok": true,
    "group": {
      "permission_group_id": "uuid",
      "organization_id": "uuid",
      "name": "text",
      "group_slug": "text",
      "description": "text",
      "is_system_group": false,
      "organization_permission_count": 2,
      "project_permission_count": 0,
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  }
  ```
- Touched domain methods:
  - `require_organization_admin`
  - `create_permission_group`
- Touched tables:
  - `public.agchain_permission_groups`
  - `public.agchain_permission_group_grants`

##### `GET /agchain/settings/organizations/{organization_id}/permission-groups/{permission_group_id}`

- Auth: authenticated user + `organization_admin`
- Request:
  - path:
    - `organization_id: string`
    - `permission_group_id: string`
- Response:
  ```json
  {
    "group": {
      "permission_group_id": "uuid",
      "organization_id": "uuid",
      "name": "text",
      "group_slug": "text",
      "description": "text",
      "is_system_group": false
    },
    "grants": {
      "organization": [
        "organization.members.read"
      ],
      "project": []
    },
    "enforcement_notice": "Organization-scope grants are authoritative in this batch. Project-scope grants remain reserved for later enforcement work."
  }
  ```
- Touched domain methods:
  - `require_organization_admin`
  - `get_permission_group`
- Touched tables:
  - `public.agchain_permission_groups`
  - `public.agchain_permission_group_grants`

##### `GET /agchain/settings/organizations/{organization_id}/permission-groups/{permission_group_id}/members`

- Auth: authenticated user + `organization_admin`
- Request:
  - path:
    - `organization_id: string`
    - `permission_group_id: string`
  - query:
    - `search?: string`
- Response:
  ```json
  {
    "group": {
      "permission_group_id": "uuid",
      "name": "text",
      "is_system_group": false
    },
    "items": [
      {
        "organization_member_id": "uuid",
        "user_id": "uuid",
        "email": "text",
        "display_name": "text",
        "membership_role": "organization_admin | organization_member",
        "membership_status": "active | disabled",
        "created_at": "timestamp"
      }
    ]
  }
  ```
- Touched domain methods:
  - `require_organization_admin`
  - `list_permission_group_members`
- Touched tables:
  - `public.agchain_permission_group_memberships`
  - `public.agchain_organization_members`
  - `public.profiles`
  - `public.agchain_permission_groups`

##### `POST /agchain/settings/organizations/{organization_id}/permission-groups/{permission_group_id}/members`

- Auth: authenticated user + `organization_admin`
- Request:
  ```json
  {
    "organization_member_ids": ["uuid"]
  }
  ```
- Response:
  ```json
  {
    "ok": true,
    "added_count": 1,
    "already_present_count": 0,
    "items": [
      {
        "organization_member_id": "uuid",
        "permission_group_id": "uuid"
      }
    ]
  }
  ```
- Touched domain methods:
  - `require_organization_admin`
  - `add_permission_group_members`
- Touched tables:
  - `public.agchain_permission_group_memberships`
  - `public.agchain_organization_members`
  - `public.agchain_permission_groups`

##### `DELETE /agchain/settings/organizations/{organization_id}/permission-groups/{permission_group_id}/members/{organization_member_id}`

- Auth: authenticated user + `organization_admin`
- Request:
  - path:
    - `organization_id: string`
    - `permission_group_id: string`
    - `organization_member_id: string`
- Response:
  ```json
  {
    "ok": true,
    "removed": true
  }
  ```
- Touched domain methods:
  - `require_organization_admin`
  - `remove_permission_group_member`
- Touched tables:
  - `public.agchain_permission_group_memberships`

### Authorization contract

- All new settings reads and mutations require organization-admin authority in this batch.
- The canonical admin check remains the existing `agchain_organization_members.membership_role == 'organization_admin'`.
- Permission-group grants are stored and surfaced in this batch, but only organization-level grants are user-configurable and authoritative in V1.

### V1 organization-level permission vocabulary

- `organization.settings.manage`
- `organization.members.read`
- `organization.members.invite`
- `organization.members.remove`
- `organization.permission_groups.read`
- `organization.permission_groups.manage`

## Database migrations

### Migration 1

- Filename: `supabase/migrations/20260401170000_agchain_settings_permission_groups_schema.sql`
- Schema effect:
  - create `public.agchain_permission_groups`
  - create `public.agchain_permission_group_memberships`
  - create `public.agchain_permission_group_grants`
  - add non-unique indexes:
    - `agchain_permission_groups_organization_idx (organization_id, updated_at desc)`
    - `agchain_permission_group_memberships_group_idx (permission_group_id, created_at desc)`
    - `agchain_permission_group_memberships_member_idx (organization_member_id, created_at desc)`
    - `agchain_permission_group_grants_group_scope_idx (permission_group_id, scope_type, permission_key)`
  - add `set_updated_at()` trigger to `public.agchain_permission_groups`
- Data impact:
  - no mutation of existing AGChain membership rows
  - new empty permission-group tables become available for API writes in later tasks

### Migration 2

- Filename: `supabase/migrations/20260401171000_agchain_settings_permission_groups_admin_backfill.sql`
- Schema effect:
  - no new schema objects
- Data impact:
  - create one system group named `Organization Admins` per existing `agchain_organizations` row
  - attach all current `organization_admin` memberships to those system groups
  - seed only the V1 organization-level grants for those system groups
  - do not write project-scope grants in this batch

## Edge functions

- No edge functions in this batch.
- All browser reads and writes stay on the existing `web -> platform-api -> Supabase` path.

## Locked persistence contract

### Existing tables reused

- `public.agchain_organizations`
- `public.agchain_organization_members`
- `public.agchain_project_memberships`
- `public.user_projects`
- `public.profiles`

### New tables required

#### `public.agchain_permission_groups`

Required columns:

- `permission_group_id UUID PRIMARY KEY`
- `organization_id UUID NOT NULL REFERENCES public.agchain_organizations(organization_id) ON DELETE CASCADE`
- `group_slug TEXT NOT NULL`
- `name TEXT NOT NULL`
- `description TEXT NOT NULL DEFAULT ''`
- `is_system_group BOOLEAN NOT NULL DEFAULT false`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Required constraints:

- unique `(organization_id, group_slug)`

Required non-unique indexes:

- `agchain_permission_groups_organization_idx (organization_id, updated_at desc)`

#### `public.agchain_permission_group_memberships`

Required columns:

- `permission_group_membership_id UUID PRIMARY KEY`
- `permission_group_id UUID NOT NULL REFERENCES public.agchain_permission_groups(permission_group_id) ON DELETE CASCADE`
- `organization_member_id UUID NOT NULL REFERENCES public.agchain_organization_members(organization_member_id) ON DELETE CASCADE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Required constraints:

- unique `(permission_group_id, organization_member_id)`

Required non-unique indexes:

- `agchain_permission_group_memberships_group_idx (permission_group_id, created_at desc)`
- `agchain_permission_group_memberships_member_idx (organization_member_id, created_at desc)`

#### `public.agchain_permission_group_grants`

Required columns:

- `permission_group_grant_id UUID PRIMARY KEY`
- `permission_group_id UUID NOT NULL REFERENCES public.agchain_permission_groups(permission_group_id) ON DELETE CASCADE`
- `scope_type TEXT NOT NULL CHECK (scope_type IN ('organization', 'project'))`
- `permission_key TEXT NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Required constraints:

- unique `(permission_group_id, scope_type, permission_key)`

Required non-unique indexes:

- `agchain_permission_group_grants_group_scope_idx (permission_group_id, scope_type, permission_key)`

### Seed/backfill requirements

The migration batch must also:

- create a system group named `Organization Admins` for each existing organization
- assign all current `organization_admin` memberships to that system group
- seed the `Organization Admins` group with the full V1 organization-level permission set only

### Explicit V1 persistence decisions

- Do not add a pending-invitation table in this batch.
- Do not change `agchain_organization_members.user_id` nullability in this batch.
- Do not widen `agchain_organization_members.membership_status` beyond `active` and `disabled` in this batch.
- Do not expose user-configurable project-scope grants in this batch.
- Do not replace `agchain_project_memberships` with permission-group-derived project access in this batch.

## Locked inventory counts

### Frontend counts

- Modified existing route-config files: `1`
- Modified existing pages: `2`
- Modified existing components/layout files: `2`
- Modified existing hooks: `0`
- Modified existing service/lib files: `0`
- New pages: `2`
- New components: `10`
- New hooks: `2`
- New service/lib files: `1`

### Backend and database counts

- Modified existing backend runtime files: `2`
- Modified existing backend test files: `1`
- New backend route files: `1`
- New backend domain files: `3`
- New backend test files: `1`
- New migration files: `2`
- New edge functions: `0`

## Frontend surface area

### Count lock summary

- Exact modified frontend file count in this batch: `5`
- Exact new frontend file count in this batch: `15`

### Mount-point contract

| Path | Type | Status | Mount point / responsibility |
| --- | --- | --- | --- |
| `web/src/router.tsx` | route config | modify | Declares the full `/app/agchain/settings/*` subtree and redirect behavior |
| `web/src/components/layout/AgchainShellLayout.tsx` | layout component | modify | Mounts the settings rail for all settings routes and preserves AGChain shell framing |
| `web/src/components/agchain/AgchainBenchmarkNav.tsx` | component | modify | Re-homed from shell Rail 2 to page-local benchmark-definition navigation |
| `web/src/pages/agchain/AgchainBenchmarksPage.tsx` | page | modify | Hosts benchmark-definition page-local navigation and existing project child content |
| `web/src/pages/agchain/AgchainSettingsPage.tsx` | page | modify | Redirect-only route container for `/app/agchain/settings` |
| `web/src/components/agchain/settings/AgchainSettingsNav.tsx` | component | new | Secondary settings rail mounted by `AgchainShellLayout` on `/app/agchain/settings/*` |
| `web/src/components/agchain/settings/AgchainSettingsSearch.tsx` | component | new | Search box mounted at the top of the settings rail |
| `web/src/components/agchain/settings/AgchainSettingsSectionLayout.tsx` | component | new | Shared page frame for every AGChain settings section |
| `web/src/components/agchain/settings/AgchainSettingsPlaceholderPage.tsx` | component | new | Placeholder body used by visible-but-limited settings sections |
| `web/src/components/agchain/settings/OrganizationMembersTable.tsx` | component | new | Main list body for `Organization / Members` |
| `web/src/components/agchain/settings/InviteOrganizationMembersModal.tsx` | component | new | Invite/add-existing-user flow launched from `Organization / Members` |
| `web/src/components/agchain/settings/PermissionGroupsTable.tsx` | component | new | Main list body for `Organization / Permission Groups` |
| `web/src/components/agchain/settings/CreatePermissionGroupModal.tsx` | component | new | Group creation flow launched from `Organization / Permission Groups` |
| `web/src/components/agchain/settings/PermissionGroupPermissionsModal.tsx` | component | new | Permissions inspection modal launched from permission-group rows |
| `web/src/components/agchain/settings/PermissionGroupMembersModal.tsx` | component | new | Group-members inspection/edit modal launched from permission-group rows |
| `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx` | page | new | Routed page at `/app/agchain/settings/organization/members` |
| `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx` | page | new | Routed page at `/app/agchain/settings/organization/permission-groups` |
| `web/src/lib/agchainSettings.ts` | service/lib | new | Browser client for the new AGChain settings platform-api endpoints |
| `web/src/hooks/agchain/useAgchainOrganizationMembers.ts` | hook | new | Members page data loading and mutation orchestration |
| `web/src/hooks/agchain/useAgchainPermissionGroups.ts` | hook | new | Permission-groups page data loading and mutation orchestration |

## Locked file inventory

### Frontend

### Existing files expected to change

- `web/src/router.tsx`
- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/agchain/AgchainBenchmarkNav.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.tsx`

### New frontend files expected

- `web/src/components/agchain/settings/AgchainSettingsNav.tsx`
- `web/src/components/agchain/settings/AgchainSettingsSearch.tsx`
- `web/src/components/agchain/settings/AgchainSettingsSectionLayout.tsx`
- `web/src/components/agchain/settings/AgchainSettingsPlaceholderPage.tsx`
- `web/src/components/agchain/settings/OrganizationMembersTable.tsx`
- `web/src/components/agchain/settings/InviteOrganizationMembersModal.tsx`
- `web/src/components/agchain/settings/PermissionGroupsTable.tsx`
- `web/src/components/agchain/settings/CreatePermissionGroupModal.tsx`
- `web/src/components/agchain/settings/PermissionGroupPermissionsModal.tsx`
- `web/src/components/agchain/settings/PermissionGroupMembersModal.tsx`
- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx`
- `web/src/lib/agchainSettings.ts`
- `web/src/hooks/agchain/useAgchainOrganizationMembers.ts`
- `web/src/hooks/agchain/useAgchainPermissionGroups.ts`

### Existing frontend primitives to reuse

- `web/src/pages/settings/SettingsPageHeader.tsx`
- `web/src/pages/settings/settings-nav.ts`
- existing AGChain shell tokens and rail styling

### Frontend test files

- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/components/agchain/AgchainBenchmarkNav.test.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx`
- `web/src/components/agchain/settings/AgchainSettingsNav.test.tsx`
- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.test.tsx`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx`
- `web/src/components/agchain/settings/InviteOrganizationMembersModal.test.tsx`
- `web/src/components/agchain/settings/CreatePermissionGroupModal.test.tsx`
- `web/src/components/agchain/settings/PermissionGroupPermissionsModal.test.tsx`
- `web/src/components/agchain/settings/PermissionGroupMembersModal.test.tsx`

### Backend

### Existing backend files expected to change

- `services/platform-api/app/main.py`
- `services/platform-api/app/domain/agchain/project_access.py`

### New backend files expected

- `services/platform-api/app/api/routes/agchain_settings.py`
- `services/platform-api/app/domain/agchain/organization_access.py`
- `services/platform-api/app/domain/agchain/organization_members.py`
- `services/platform-api/app/domain/agchain/permission_groups.py`

### Existing backend test files expected to change

- `services/platform-api/tests/test_agchain_workspaces.py`

### New backend test files expected

- `services/platform-api/tests/test_agchain_settings.py`

### Database migration files

- `supabase/migrations/20260401170000_agchain_settings_permission_groups_schema.sql`
- `supabase/migrations/20260401171000_agchain_settings_permission_groups_admin_backfill.sql`

## Locked observability surface

### Telemetry items

| Type | Name | Emit location | Purpose | Allowed attributes |
| --- | --- | --- | --- | --- |
| span | `agchain.settings.members.list` | `services/platform-api/app/api/routes/agchain_settings.py` members list route | Trace organization-members list latency and result count | `organization_id_present`, `row_count`, `latency_ms`, `result` |
| span | `agchain.settings.members.invite` | `services/platform-api/app/api/routes/agchain_settings.py` member-invitations route | Trace add-member batch execution and outcomes | `organization_id_present`, `email_count`, `created_count`, `reactivated_count`, `already_member_count`, `not_found_count`, `result` |
| span | `agchain.settings.members.update` | `services/platform-api/app/api/routes/agchain_settings.py` member status route | Trace membership status changes | `organization_id_present`, `organization_member_id_present`, `membership_status`, `result` |
| span | `agchain.settings.permission_groups.list` | `services/platform-api/app/api/routes/agchain_settings.py` permission-groups list route | Trace permission-group list latency and result count | `organization_id_present`, `row_count`, `latency_ms`, `result` |
| span | `agchain.settings.permission_groups.create` | `services/platform-api/app/api/routes/agchain_settings.py` create group route | Trace permission-group creation and grant count | `organization_id_present`, `permission_key_count`, `result` |
| span | `agchain.settings.permission_groups.get` | `services/platform-api/app/api/routes/agchain_settings.py` permission-group detail route | Trace modal detail loads | `organization_id_present`, `permission_group_id_present`, `result` |
| span | `agchain.settings.permission_groups.members.list` | `services/platform-api/app/api/routes/agchain_settings.py` group members list route | Trace group-members modal loads | `organization_id_present`, `permission_group_id_present`, `row_count`, `result` |
| span | `agchain.settings.permission_groups.members.add` | `services/platform-api/app/api/routes/agchain_settings.py` add group members route | Trace group-members add operations | `organization_id_present`, `permission_group_id_present`, `requested_member_count`, `added_count`, `already_present_count`, `result` |
| span | `agchain.settings.permission_groups.members.remove` | `services/platform-api/app/api/routes/agchain_settings.py` remove group member route | Trace group-members remove operations | `organization_id_present`, `permission_group_id_present`, `organization_member_id_present`, `removed`, `result` |
| counter | `platform.agchain.settings.members.list.count` | members list route | Count members-list requests | `organization_id_present`, `result` |
| counter | `platform.agchain.settings.members.invite.count` | member-invitations route | Count add-member requests | `organization_id_present`, `result` |
| counter | `platform.agchain.settings.members.update.count` | member status route | Count membership-status updates | `organization_id_present`, `membership_status`, `result` |
| counter | `platform.agchain.settings.permission_groups.list.count` | permission-groups list route | Count permission-group list requests | `organization_id_present`, `result` |
| counter | `platform.agchain.settings.permission_groups.create.count` | create group route | Count permission-group creates | `organization_id_present`, `result` |
| counter | `platform.agchain.settings.permission_groups.members.add.count` | add group members route | Count group-members add requests | `organization_id_present`, `result` |
| counter | `platform.agchain.settings.permission_groups.members.remove.count` | remove group member route | Count group-members remove requests | `organization_id_present`, `result` |
| histogram | `platform.agchain.settings.members.list.duration_ms` | members list route | Measure members-list latency | `organization_id_present`, `result` |
| histogram | `platform.agchain.settings.permission_groups.list.duration_ms` | permission-groups list route | Measure permission-group list latency | `organization_id_present`, `result` |
| structured log | `agchain.settings.members.invite.completed` | member-invitations route | Record batch invite outcomes without exposing raw emails | `organization_id_present`, `email_count`, `created_count`, `reactivated_count`, `already_member_count`, `not_found_count` |
| structured log | `agchain.settings.permission_groups.created` | create group route | Record permission-group creation metadata | `organization_id_present`, `permission_group_id`, `permission_key_count`, `is_system_group` |

### Attribute rules

Allowed attributes for this feature:

- boolean presence flags such as `organization_id_present`, `permission_group_id_present`, `organization_member_id_present`
- aggregate counts such as `row_count`, `email_count`, `permission_key_count`, `added_count`, `already_present_count`
- controlled enum values such as `membership_status` and `result`
- generated identifiers only where existing structured logs already permit them, limited to `permission_group_id`

Forbidden attributes for this feature:

- raw email addresses
- display names
- free-text search strings
- raw `organization_id`, `user_id`, or `organization_member_id`
- permission-group descriptions
- any modal form free text other than validated aggregate counts

### Logging rules

- Do not log raw invite email lists.
- Log batch sizes and outcome counts instead of raw addresses.
- Preserve the existing `safe_attributes` pattern for structured logs.

## UX contract

### Settings shell

- The settings rail must be stable across settings subroutes.
- The active scope and active section must be visually obvious.
- The settings search box filters visible nav items in real time.
- Empty-state sections must still render inside the real settings shell, not as dead links.
- Loading, error, no-organization, and auto-healed-selection states must render inside the settings shell without redirect loops.

### Organization members page

- Header: title, short description, `Invite` primary action
- Toolbar: search input, optional status filter
- Main body: list/table of members
- Row content: display name, email, membership status, legacy org role, group summary
- Row action: disable/reactivate membership
- Empty states:
  - only initial admin exists
  - search returns no matches

### Permission groups page

- Header: title, short description, `Create permission group` primary action
- Toolbar: search input
- Main body: list/table of groups
- Row actions:
  - open permissions modal
  - open members modal
- Create modal:
  - name
  - description
  - bounded checklist of V1 organization-level permission keys only
- Members modal:
  - search existing org members
  - add/remove members
- Permissions modal:
  - read-only grouped view of stored grants in V1
  - explicit callout that project-scope enforcement is reserved for a later batch

## Risks and mitigations

### Risk 1: Benchmark-definition navigation regression

Repurposing Rail 2 for settings creates a real risk of breaking the benchmark-definition workflow.

Mitigation:

- keep the benchmark-definition route path unchanged
- preserve all existing hash anchors
- move benchmark subsection navigation into page-local UI in the same batch
- keep benchmark redirect tests in the verification sweep

### Risk 2: Access-model drift between legacy roles and new groups

Current AGChain authorization is still driven by `membership_role`, while permission groups are new.

Mitigation:

- keep `organization_admin` as the authority for new settings mutations in this batch
- seed `Organization Admins` groups from existing admin memberships
- expose only organization-level grants in V1 create/edit flows
- document that non-settings AGChain surfaces remain on legacy role checks until a later dedicated migration

### Risk 3: Member invite semantics become fake or incomplete

There is no verified outbound invite flow in the current repo.

Mitigation:

- lock V1 to existing-account email lookup through `profiles`
- return explicit `not_found` outcomes for unknown emails
- do not promise pending invite delivery in this batch

### Risk 4: Placeholder sections reintroduce transitional ambiguity

If placeholder sections render as dead ends, the settings shell will still feel unfinished.

Mitigation:

- use explicit limited placeholder pages inside the real shell
- show scoped explanatory copy and forward-looking labels
- keep the nav structure stable

## Locked acceptance contract

### Settings shell

1. Visiting `/app/agchain/settings` redirects to `/app/agchain/settings/organization/members`.
2. Every `/app/agchain/settings/*` route renders the AGChain primary rail and the settings secondary rail.
3. The settings search box filters settings-nav items without changing routes.
4. The benchmark-definition route remains reachable at `/app/agchain/settings/project/benchmark-definition`.
5. Legacy benchmark redirects continue to land on the benchmark-definition route and preserve hash anchors.
6. While organization state is loading, the settings shell stays mounted and renders a stable loading state.
7. If organization state load fails, the settings shell stays mounted and renders a retryable error state.
8. If the user has zero AGChain organizations, the settings shell stays mounted and renders a no-organization empty state.

### Organization members

1. An organization admin can load the selected organization members list.
2. An organization admin can search members by name or email.
3. An organization admin can add existing platform users by email.
4. An organization admin can attach permission groups during the add-member flow.
5. An organization admin can disable and reactivate organization memberships.
6. The members list shows assigned group summaries.

### Permission groups

1. An organization admin can view the organization permission-group list.
2. An organization admin can create a permission group with a bounded permission set.
3. An organization admin can open a permissions modal for a group and inspect grouped grants.
4. An organization admin can open a members modal for a group and add or remove members.
5. System-generated `Organization Admins` groups exist for existing organizations after migration/backfill.

### Compatibility

1. `/app/agchain/benchmarks` still redirects to `/app/agchain/settings/project/benchmark-definition`.
2. `/app/agchain/benchmarks/:benchmarkId` still redirects into the benchmark-definition route and preserves the hash fragment.
3. `/app/agchain/build` still redirects to `/app/agchain/settings/project/benchmark-definition`.
4. Existing workspace selector flows continue to work.

## Task breakdown

Execution note:

- Do not begin Task 1 until the workspace-state architecture dependency described above is resolved and folded into this plan or an approved prerequisite artifact.

### Task 1: Replace the placeholder settings landing with a routed settings shell

Files:

- `web/src/router.tsx`
- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.tsx`
- `web/src/components/agchain/settings/AgchainSettingsNav.tsx`
- `web/src/components/agchain/settings/AgchainSettingsSearch.tsx`
- `web/src/components/agchain/settings/AgchainSettingsSectionLayout.tsx`
- `web/src/components/agchain/settings/AgchainSettingsPlaceholderPage.tsx`
- `web/src/components/agchain/settings/AgchainSettingsNav.test.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.test.tsx`

Steps:

1. Add the full settings route family under `/app/agchain/settings/*`.
2. Convert `/app/agchain/settings` into an index redirect.
3. Render a settings rail for any settings pathname.
4. Add scoped nav groups and V1 nav filtering.
5. Replace the current card landing with real section pages and deliberate placeholders.

Test command:

- `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx src/pages/agchain/AgchainSettingsPage.test.tsx src/components/agchain/settings/AgchainSettingsNav.test.tsx`

Expected output:

- Vitest passes with `/app/agchain/settings` redirecting into the org members route, the settings rail mounted across settings subroutes, and loading/error/empty shell states locked.

Commit message:

- `feat(agchain-settings): add routed settings shell`

### Task 2: Re-home benchmark-definition navigation inside the new settings shell

Files:

- `web/src/components/agchain/AgchainBenchmarkNav.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx`
- `web/src/components/agchain/AgchainBenchmarkNav.test.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx`

Steps:

1. Stop using `AgchainBenchmarkNav` as shell Rail 2.
2. Reuse its section model as page-local benchmark-definition navigation.
3. Preserve all benchmark hashes and compatibility redirects.

Test command:

- `cd web && npx vitest run src/components/agchain/AgchainBenchmarkNav.test.tsx src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx src/components/layout/AgchainShellLayout.test.tsx`

Expected output:

- Vitest passes with benchmark-definition hashes preserved, compatibility redirects still landing on the same route, and shell Rail 2 owned by settings rather than benchmark navigation.

Commit message:

- `refactor(agchain-settings): move benchmark section nav into page`

### Task 3: Add organization-settings access and persistence foundations

Files:

- `supabase/migrations/20260401170000_agchain_settings_permission_groups_schema.sql`
- `supabase/migrations/20260401171000_agchain_settings_permission_groups_admin_backfill.sql`
- `services/platform-api/app/domain/agchain/organization_access.py`
- `services/platform-api/app/domain/agchain/project_access.py`

Steps:

1. Add permission-group tables and indexes.
2. Add backfill for `Organization Admins` groups and memberships.
3. Add reusable organization-access helpers for admin-only settings routes.

Test command:

- `cd services/platform-api && pytest -q tests/test_agchain_workspaces.py tests/test_agchain_settings.py`

Expected output:

- Pytest passes with organization-admin access helpers covered, and the migration pair remains ready for linked-database application and post-apply schema verification.

Commit message:

- `feat(agchain-settings): add permission group schema and org admin access helpers`

### Task 4: Implement organization-members backend

Files:

- `services/platform-api/app/api/routes/agchain_settings.py`
- `services/platform-api/app/domain/agchain/organization_members.py`
- `services/platform-api/app/main.py`
- `services/platform-api/tests/test_agchain_settings.py`

Steps:

1. Add members list endpoint with profile join and group summary.
2. Add add-member-by-email endpoint with batch outcomes.
3. Add membership status update endpoint.
4. Add spans, counters, histograms, and structured logs.

Test command:

- `cd services/platform-api && pytest -q tests/test_agchain_settings.py -k "organization_members or member_invitations or membership_status"`

Expected output:

- Pytest passes with members list, add-by-email, disable/reactivate, not-found email, duplicate add, and non-admin denial cases covered.

Commit message:

- `feat(agchain-settings): add organization members api`

### Task 5: Implement organization-members frontend

Files:

- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx`
- `web/src/components/agchain/settings/OrganizationMembersTable.tsx`
- `web/src/components/agchain/settings/InviteOrganizationMembersModal.tsx`
- `web/src/hooks/agchain/useAgchainOrganizationMembers.ts`
- `web/src/lib/agchainSettings.ts`
- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.test.tsx`
- `web/src/components/agchain/settings/InviteOrganizationMembersModal.test.tsx`

Steps:

1. Build the `Organization Members` page inside the settings shell.
2. Wire loading, empty, error, and search states.
3. Wire the add-member modal to the new batch API outcomes.
4. Show group summaries per member row.

Test command:

- `cd web && npx vitest run src/pages/agchain/settings/AgchainOrganizationMembersPage.test.tsx src/components/agchain/settings/InviteOrganizationMembersModal.test.tsx`

Expected output:

- Vitest passes with member list load, search, invite modal validation, batch outcome rendering, and disable/reactivate row actions covered.

Commit message:

- `feat(agchain-settings): add organization members ui`

### Task 6: Implement permission-groups backend

Files:

- `services/platform-api/app/api/routes/agchain_settings.py`
- `services/platform-api/app/domain/agchain/permission_groups.py`
- `services/platform-api/tests/test_agchain_settings.py`

Steps:

1. Add permission-group list endpoint with counts.
2. Add create endpoint with bounded permission vocabulary validation.
3. Add detail endpoint for the permissions modal.
4. Add group-members list/add/remove endpoints.
5. Add observability for the new endpoints.

Test command:

- `cd services/platform-api && pytest -q tests/test_agchain_settings.py -k "permission_group"`

Expected output:

- Pytest passes with list, create, detail, system-group visibility, member add/remove flows, invalid permission-key rejection, and non-admin denial covered.

Commit message:

- `feat(agchain-settings): add permission groups api`

### Task 7: Implement permission-groups frontend

Files:

- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx`
- `web/src/components/agchain/settings/PermissionGroupsTable.tsx`
- `web/src/components/agchain/settings/CreatePermissionGroupModal.tsx`
- `web/src/components/agchain/settings/PermissionGroupPermissionsModal.tsx`
- `web/src/components/agchain/settings/PermissionGroupMembersModal.tsx`
- `web/src/hooks/agchain/useAgchainPermissionGroups.ts`
- `web/src/lib/agchainSettings.ts`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx`
- `web/src/components/agchain/settings/CreatePermissionGroupModal.test.tsx`
- `web/src/components/agchain/settings/PermissionGroupPermissionsModal.test.tsx`
- `web/src/components/agchain/settings/PermissionGroupMembersModal.test.tsx`

Steps:

1. Build the `Permission Groups` page inside the settings shell.
2. Add create flow with organization-level permission checklist only.
3. Add permissions inspection modal.
4. Add members modal with searchable org-member add/remove flow.

Test command:

- `cd web && npx vitest run src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx src/components/agchain/settings/CreatePermissionGroupModal.test.tsx src/components/agchain/settings/PermissionGroupPermissionsModal.test.tsx src/components/agchain/settings/PermissionGroupMembersModal.test.tsx`

Expected output:

- Vitest passes with group list, create modal, permissions modal, members modal, add/remove flows, and the explicit project-scope-future-enforcement callout covered.

Commit message:

- `feat(agchain-settings): add permission groups ui`

### Task 8: Run stabilization and full verification

Test commands:

- `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx src/components/agchain/AgchainBenchmarkNav.test.tsx src/pages/agchain/AgchainSettingsPage.test.tsx src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx src/pages/agchain/AgchainBenchmarksPage.test.tsx src/components/agchain/settings/AgchainSettingsNav.test.tsx src/pages/agchain/settings/AgchainOrganizationMembersPage.test.tsx src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx src/components/agchain/settings/InviteOrganizationMembersModal.test.tsx src/components/agchain/settings/CreatePermissionGroupModal.test.tsx src/components/agchain/settings/PermissionGroupPermissionsModal.test.tsx src/components/agchain/settings/PermissionGroupMembersModal.test.tsx`
- `cd services/platform-api && pytest -q tests/test_agchain_settings.py tests/test_agchain_workspaces.py`
- `cd web && npm run build`

Expected output:

- All targeted Vitest and pytest commands pass, and the web build completes without introducing new AGChain settings regressions.

Manual verification:

- select an organization and open `/app/agchain/settings`
- confirm redirect to `Organization / Members`
- confirm settings rail search filters nav items
- confirm loading, error, and no-organization shell states do not redirect-loop
- confirm `Permission Groups` create/member flows
- confirm benchmark-definition route and hash links still work

Commit message:

- `test(agchain-settings): verify routed settings shell and org admin flows`

## Completion criteria

The plan is complete when:

- the shell architecture is explicit and routable
- the backend/data contract is specific enough to implement without guesswork
- the compatibility seam for benchmark definition is frozen
- the org-members and permission-groups scope is real, not placeholder-only
- the verification contract is strong enough to catch regressions before claiming completion
