# AGChain Settings Hierarchy Reference Note

## Purpose

This document is a **design and implementation-reference note** for moving AGChain settings out of the current placeholder state and into the new hierarchy:

- **Organization level**
- **Project level**
- **User level**

The immediate goal is **not** to fully specify every backend contract. The goal is to give implementation planners and IDE workers a stable reference for:

1. the intended **information architecture**,
2. the expected **UI pattern and interaction model**,
3. the **first functional settings surfaces** to prioritize, and
4. the acceptance shape for a first real implementation pass.

This note is intentionally grounded in the reference pattern shown in Braintrust-like settings screens, especially:

- left-side settings navigation grouped by scope,
- a searchable settings shell,
- a central list/detail workflow,
- modal-based CRUD for simple admin tasks,
- member management and permission group management as the first concrete features.

---

## Why this should be prioritized now

Implementing AGChain Settings first does three important things:

1. **Makes the org → project → user hierarchy visible in the product** rather than only implied in code or plans.
2. **Stabilizes future access control and configuration work** by giving the system a canonical home for settings-related UI and state.
3. **Clarifies directional intent** for the platform: AGChain is no longer a loose collection of pages; it is becoming a properly scoped multi-tenant workspace.

Even if only a subset of settings become functional in the first pass, the shell itself is strategically important.

---

## Immediate objective

Create the **first real AGChain Settings page** with a Braintrust-style structure and implement the **first two real functional areas**:

1. **Members**
2. **Permission Groups**

These two features are the best initial wedge because they:

- directly express the new hierarchy,
- are familiar platform patterns,
- do not require novel UX invention,
- create a foundation for all later scoped controls,
- reduce ambiguity around ownership, project visibility, and administrative responsibilities.

---

## Product framing

### Hierarchy to support

AGChain settings should be modeled around three scopes:

#### 1) Organization scope
Applies across the tenant / workspace / organization.

Examples:
- organization members
- permission groups
- org-level API/provider settings
- service identities / tokens
- environment-level defaults
- audit/logging access rules

#### 2) Project scope
Applies to a selected AGChain project/workspace.

Examples:
- project members / project grants
- benchmark/project access
- project-scoped tools, prompts, scorers, datasets permissions
- project-level provider bindings
- project default runtime policies

#### 3) User scope
Applies to the current authenticated user.

Examples:
- personal credentials
- UI preferences
- default project selection
- notification preferences
- personal API keys or tokens where applicable

### Important directional rule
The Settings page should not feel like a random list of unrelated admin pages. It should visibly communicate:

> **Settings are organized by scope.**
>
> Organization settings govern the shared tenant.
> Project settings govern the current AGChain workspace.
> User settings govern the current user’s own defaults and credentials.

That hierarchy should be legible from the first screen load.

---

## Reference pattern to emulate from Braintrust-style settings

The Braintrust screenshots suggest a very useful operating pattern:

### Structural characteristics worth carrying over

- **Persistent left rail** for product navigation.
- **Secondary settings navigation** inside the settings page.
- **Grouping by scope/category** rather than by technical implementation.
- **Search box** at the top of settings for fast filtering / discoverability.
- **Simple central panel** that changes based on selected settings section.
- **List-first admin screens** for entities like members or permission groups.
- **Small, focused modal dialogs** for actions like invite, inspect permissions, or manage members.
- **Low visual clutter** with administrative, utility-first styling.
- **Stable empty states** and upgrade/availability messaging when functionality is restricted.

### Important nuance
We should copy the **interaction model and layout discipline**, not blindly clone visual details. AGChain has its own shell, domain, and future needs. But the reference is good because it is:

- familiar,
- operational,
- scalable,
- easy for admins to learn.

---

## High-level page design

## 1. Settings shell

AGChain should replace the current placeholder with a real settings shell.

### Shell layout

#### Leftmost: AGChain product navigation
This remains the existing AGChain primary nav.

#### Secondary column: Settings navigation
A dedicated settings navigation panel should appear once the user enters Settings.

This panel should include:
- a search input such as **Search settings**
- grouped setting links under scope headers

Example grouping:

### Project
- General
- Members
- Access / Project permissions
- Tools / integrations (future)
- AI providers / runtimes (future)
- Advanced (future)

### Organization
- Members
- Permission Groups
- API Keys / Service Tokens (future)
- Providers / Integrations (future)
- Environments / Logging / Data Plane (future)

### User
- Profile / personal settings
- Personal credentials
- Personal defaults
- Notifications (future)

This exact menu does not need to be fully implemented immediately, but the shell should be designed so these sections can be added without redesign.

### Main content panel
The main content area should render the selected section:

- page title
- brief explanatory copy
- optional section-level actions
- main data list/table/cards
- modals/drawers for CRUD or inspection

---

## 2. First two functional surfaces

The first implementation pass should make these real:

### A. Organization Members
### B. Permission Groups

These should live inside the new settings shell and be treated as production-facing foundations, even if only V1.

---

## Detailed functional plan

# A. Organization Members

## User outcome
An organization owner/admin can:

- view organization members,
- search/filter members,
- invite members,
- inspect role/group assignment summary,
- remove or deactivate members if policy allows,
- understand which members belong to which permission groups.

## V1 page shape

### Header area
- Title: **Organization Members**
- Short description: explains that these are members of the organization/workspace
- Primary action button: **Invite**

### Search/filter bar
- search members by name/email
- optional filter by status
- optional filter by group / access level later

### Members list
Each row should ideally show:
- avatar / initials
- display name
- email
- organization role summary or effective access summary
- joined date
- recent activity or last seen if available
- row actions menu

### Invite modal
The reference pattern is good and should be used:
- one or multiple email addresses
- optional permission group assignment at invite time
- clear validation and inline errors
- explicit callout that invited users receive organization access, not necessarily unrestricted project access

### Row actions
Likely actions:
- view member details
- change group assignment(s)
- remove from organization
- resend invite (if pending)
- copy email / identifier (optional)

## V1 minimum requirements

### Must have
- list members
- search members
- invite one or more members
- assign at least one permission group during invite or after invite
- remove member (or mark inactive if deletion is not allowed)

### Good to have
- joined date
- last active time
- pending invitation status
- member detail modal/drawer

### Not required for first pass
- advanced SCIM/SAML provisioning
- bulk CSV import
- audit-history timeline
- per-project overrides from the members page itself

---

# B. Permission Groups

## User outcome
An organization owner/admin can:

- view permission groups,
- create a new group,
- inspect what a group grants,
- inspect which members belong to a group,
- add/remove members from a group,
- understand whether a group operates at org scope, project scope, or both.

## V1 page shape

### Header area
- Title: **Permission Groups**
- Short description: explains that groups are reusable bundles of access rights
- Primary action button: **Create permission group**

### Search/filter bar
- search permission groups by name

### Group list
Each row should show:
- group name
- optional badge for scope or plan/type if relevant
- member count
- action buttons or row actions:
  - **Permissions**
  - **Members**
  - overflow menu

This matches the reference pattern well and is a good V1 direction.

### Permissions modal / drawer
This should allow inspection of a group’s grants.

For V1, it is acceptable if editing is limited or partially disabled, as long as the model is visible.

Permission display should be grouped by scope:

#### Organization permissions
Examples:
- manage organization settings
- invite members
- remove members
- manage permission groups
- manage organization-level integrations

#### Project permissions
Examples:
- create project
- read project
- update project
- delete project
- manage project access
- manage project configuration

Later AGChain-specific permissions can extend this with domain areas like:
- datasets.read / datasets.write
- prompts.read / prompts.write
- scorers.read / scorers.write
- tools.read / tools.write
- runs.read / runs.execute
- results.read / results.export

### Members modal / drawer
This should show:
- searchable list of members in the group
- ability to add/remove members
- clear empty state if the group has no members

### Create group flow
At minimum:
- group name
- optional description
- optional initial permission template or starter grants

For V1, custom editable permission matrices may be simplified.

## V1 minimum requirements

### Must have
- list groups
- create group
- inspect group permissions
- inspect group members
- add/remove members from group

### Good to have
- edit group name/description
- delete/archive group (with safety checks)
- predefined system groups like Owners / Admins / Viewers

### Not required for first pass
- nested groups
- conditional policies
- resource-tag-based grants
- approval workflows

---

## Recommended scope model for V1

Because AGChain is introducing hierarchy, the product should avoid muddy permissions in the first pass.

## Suggested V1 rule set

### Organization Members
Represents identity and membership in the organization.

### Permission Groups
Are created and managed at the **organization scope**.

### Project access in V1
Project-level access should be **derived through organization-managed groups** or a simple membership mapping model, rather than inventing a full custom ACL editor immediately.

That means:
- users belong to organization
- users may belong to one or more permission groups
- permission groups may grant org-level permissions
- permission groups may also grant project-level access patterns

This creates a coherent foundation without forcing the first pass to solve every edge case.

---

## UX principles

## 1. Scope must be obvious everywhere
Every page and modal should clearly indicate whether the user is editing:
- organization-level settings,
- project-level settings,
- user-level settings.

Do not make the user infer scope from implementation details.

## 2. Reusable list/detail pattern
Members and Permission Groups should use a shared structural pattern:
- title + description
- search/filter bar
- list/table
- row actions
- modal/drawer for create/manage/inspect

This keeps settings implementation fast and cohesive.

## 3. Empty states must be treated seriously
Because AGChain is still early, empty states will be common.

Examples:
- no members beyond the initial owner
- no permission groups yet
- no members in a group
- no projects yet

These states should not feel broken. They should explain what exists and what the next action is.

## 4. Disabled/edit-locked states are acceptable if explicit
If some permission editing is not yet available, the UI may expose a read-only view with explicit wording such as:

- editable in a later release,
- restricted to certain deployments,
- requires a higher plan or internal flag,
- not yet enabled in this environment.

This is much better than hiding structure the product clearly intends to support.

## 5. Avoid overbuilding V1
Do not try to build the full IAM platform on the first pass.
The first pass should prove:
- hierarchy,
- stable navigation,
- members,
- permission groups,
- sane admin flows.

That is enough.

---

## Recommended information architecture for AGChain Settings V1

Below is a pragmatic V1 IA that communicates intent without requiring all pages to be functional immediately.

## Settings

### Project
- General
- Members *(can be later if org members lands first, but reserve the slot now)*
- Access *(future)*
- Providers *(future)*
- Advanced *(future)*

### Organization
- Members **(functional in V1)**
- Permission Groups **(functional in V1)**
- API Keys *(placeholder or future)*
- Service Tokens *(placeholder or future)*
- AI Providers *(placeholder or future)*
- Environments *(placeholder or future)*
- Logging / Data Plane *(placeholder or future)*

### User
- Personal Settings *(placeholder or future)*
- Credentials *(placeholder or future)*
- Defaults *(placeholder or future)*

### Strong recommendation
Even when a section is still placeholder-only, render it as a deliberate placeholder inside the real settings shell rather than leaving the entire settings area as a generic unfinished page.

That preserves the architecture and lowers future migration cost.

---

## Data / domain concepts to align early

Even without finalized backend references, implementation planning should align around a few core entities.

## Core entities

### Organization
- id
- name
- slug
- created_at

### User
- id
- email
- display_name
- avatar_url
- status

### OrganizationMembership
Represents that a user belongs to an organization.

Suggested fields:
- id
- organization_id
- user_id
- membership_status (`active`, `invited`, `suspended`, `removed`)
- joined_at
- invited_at
- last_active_at

### PermissionGroup
Represents a named reusable access bundle.

Suggested fields:
- id
- organization_id
- name
- slug
- description
- is_system_group
- is_default
- created_at
- updated_at
- archived_at (optional)

### PermissionGroupMembership
Maps users into groups.

Suggested fields:
- id
- permission_group_id
- user_id
- created_at

### PermissionGrant
Represents the grants assigned to a group.

Suggested conceptual fields:
- id
- permission_group_id
- scope_type (`organization`, `project`)
- resource_type
- action
- effect (`allow`)
- constraints (optional, future)

For V1, the actual backend storage can vary. The important thing is to keep the UI and implementation plan oriented around these concepts.

---

## Suggested permission vocabulary for V1

To keep the system legible, start with a constrained permission set.

## Organization-level permissions
- `organization.settings.manage`
- `organization.members.read`
- `organization.members.invite`
- `organization.members.remove`
- `organization.permission_groups.read`
- `organization.permission_groups.manage`

## Project-level permissions
- `project.create`
- `project.read`
- `project.update`
- `project.delete`
- `project.access.manage`

## AGChain domain permissions for later expansion
- `datasets.read`
- `datasets.write`
- `prompts.read`
- `prompts.write`
- `scorers.read`
- `scorers.write`
- `tools.read`
- `tools.write`
- `runs.read`
- `runs.execute`
- `results.read`
- `results.export`
- `observability.read`
- `settings.read`
- `settings.manage`

The implementation plan does not need to fully wire every future permission now, but using a structured permission vocabulary early will prevent messy retrofits.

---

## Suggested implementation phases

# Phase 0 — Design alignment / planning

Deliverables:
- confirm hierarchy model
- confirm V1 scope
- confirm settings IA
- confirm V1 entities and interaction patterns
- confirm whether project-level Members lands in V1 or is reserved for V2

Output:
- formal implementation plan drafted from this note

# Phase 1 — Real settings shell

Deliverables:
- replace placeholder settings page with real layout
- add settings search input
- add grouped navigation by scope
- wire route structure for settings sections
- support deliberate placeholders for non-implemented sections

Success criteria:
- settings no longer feels like a stub
- members and permission groups have stable homes
- future sections can slot in without redesign

# Phase 2 — Organization Members

Deliverables:
- list organization members
- search/filter
- invite modal
- assign groups during or after invite
- remove member / deactivate member flow

Success criteria:
- owner/admin can manage org membership end-to-end in UI

# Phase 3 — Permission Groups

Deliverables:
- group list
- create group flow
- permissions inspection modal
- members modal
- add/remove group membership

Success criteria:
- owner/admin can manage reusable access groups end-to-end in UI

# Phase 4 — Stabilization / follow-on

Deliverables:
- loading states / empty states / error states
- polish around disabled states
- navigation consistency
- telemetry / audit events
- test coverage

Optional next:
- project members
- project access editor
- personal settings
- service tokens / provider settings

---

## Routing and shell recommendations

Because AGChain already has a defined frontend shell and platform-api convention, the Settings work should respect existing app patterns.

## Route direction
Use nested settings routes rather than one giant page.

Example shape:
- `/app/agchain/settings`
- `/app/agchain/settings/organization/members`
- `/app/agchain/settings/organization/permission-groups`
- `/app/agchain/settings/project/general`
- `/app/agchain/settings/user/profile`

The exact paths may vary, but the URL should reflect scope.

### Important recommendation
Do not bury organization and project settings behind ambiguous tabs on a single page if the router can cleanly express scope.
A routable settings shell will scale better.

---

## Frontend component recommendations

The UI should be implemented using reusable admin components rather than one-off page logic.

## Suggested component families

### Settings shell
- `AgchainSettingsPage`
- `AgchainSettingsNav`
- `AgchainSettingsSectionLayout`
- `AgchainSettingsSearch`

### Members
- `AgchainOrganizationMembersPage`
- `OrganizationMembersTable`
- `InviteOrganizationMembersModal`
- `OrganizationMemberActionsMenu`
- `OrganizationMemberDetailsDrawer` *(optional)*

### Permission groups
- `AgchainPermissionGroupsPage`
- `PermissionGroupsTable`
- `CreatePermissionGroupModal`
- `PermissionGroupPermissionsModal`
- `PermissionGroupMembersModal`
- `PermissionGroupActionsMenu`

### Shared
- search input
- empty state component
- loading state component
- inline callout / info banner component
- confirmation dialog component

This makes later settings sections easier to build by following the same pattern.

---

## Backend/API planning guidance

Backend references are not currently available here, so the implementation plan should treat the API layer as a design target rather than assume existing routes.

## Recommended API shape for V1

### Organization Members
- `GET /agchain/settings/organizations/{org_slug}/members`
- `POST /agchain/settings/organizations/{org_slug}/members/invitations`
- `PATCH /agchain/settings/organizations/{org_slug}/members/{member_id}`
- `DELETE /agchain/settings/organizations/{org_slug}/members/{member_id}`

### Permission Groups
- `GET /agchain/settings/organizations/{org_slug}/permission-groups`
- `POST /agchain/settings/organizations/{org_slug}/permission-groups`
- `GET /agchain/settings/organizations/{org_slug}/permission-groups/{group_id}`
- `PATCH /agchain/settings/organizations/{org_slug}/permission-groups/{group_id}`
- `DELETE /agchain/settings/organizations/{org_slug}/permission-groups/{group_id}` or archive
- `GET /agchain/settings/organizations/{org_slug}/permission-groups/{group_id}/members`
- `POST /agchain/settings/organizations/{org_slug}/permission-groups/{group_id}/members`
- `DELETE /agchain/settings/organizations/{org_slug}/permission-groups/{group_id}/members/{user_id}`
- `GET /agchain/settings/organizations/{org_slug}/permission-groups/{group_id}/permissions`
- `PUT /agchain/settings/organizations/{org_slug}/permission-groups/{group_id}/permissions`

These routes are only directional suggestions. The implementation plan can adapt them to existing platform conventions.

### Important platform constraint
AGChain web code should continue to talk through the platform API layer rather than introducing direct browser CRUD against underlying storage tables.

---

## Loading, error, and empty state requirements

These pages are admin surfaces, so operational clarity matters.

## Loading
- skeletons or stable loading rows
- button disabled states while submitting
- modal submit pending state

## Error
- section-level error callout for load failure
- inline validation in modals
- explicit conflict messages for duplicate emails or group names
- recoverable retry actions where appropriate

## Empty state
- no members beyond owner
- no permission groups
- no members in selected group
- no matching search results

Each empty state should explain what exists and what action the user can take next.

---

## Authorization guidance

Because this page manages access control, the UI itself needs access-sensitive behavior.

## Suggested V1 authorization behavior

### Owners / admins
Can:
- invite members
- remove members
- create groups
- edit groups
- manage group membership
- inspect permissions

### Non-admin users
Can:
- view only what policy allows
- usually should not see destructive or admin-only actions

### UX rule
Hide or disable actions based on capability, but do not make the page structurally inconsistent.
The layout should remain stable even if certain buttons are unavailable.

---

## Telemetry / audit recommendations

Since this is settings and access management, auditability matters.

At minimum, capture events for:
- member invited
- member removed
- member group assignment changed
- permission group created
- permission group updated
- permission group membership changed

Do not log sensitive raw payloads unnecessarily. Prefer safe metadata such as:
- org slug/id
- group id/slug
- actor role
- counts of members affected
- success/failure status

Avoid logging confidential invitation tokens or credential values.

---

## Test planning guidance

The implementation plan should include tests from the start, because settings/admin surfaces often appear simple but regress easily.

## Frontend tests
Should cover:
- settings shell renders grouped navigation
- settings search filters nav items if implemented
- members page renders list / empty state / error state
- invite modal validation and submit behavior
- permission groups page renders groups / empty state
- permissions modal opens correctly
- members modal opens and supports add/remove flows
- action visibility changes based on capability

## Backend/API tests
Should cover:
- list members
- invite member validation
- duplicate invite handling
- remove member protections (for example, last owner edge case if applicable)
- create group
- duplicate group name handling
- add/remove member from group
- list group permissions
- permission mutation validation

## Edge cases worth locking early
- cannot remove the last effective owner
- duplicate email invite
- duplicate permission group name in same organization
- user already in group
- user removed from group not currently in group
- permissions inspection for empty/custom group

---

## Explicit non-goals for V1

To keep the work bounded, the first implementation plan should explicitly not include:

- full enterprise IAM redesign
- SSO/SCIM provisioning
- advanced policy engine
- resource-level condition builders
- nested permission inheritance editor
- cross-org membership federation
- full audit center
- full settings completion for every future section

The goal is to establish the shell and land two foundational, credible settings features.

---

## Suggested acceptance criteria for V1

The implementation should be considered successful when all of the following are true:

### Settings shell
- AGChain Settings is no longer a placeholder page.
- The page visibly communicates **organization**, **project**, and **user** scopes.
- The settings shell supports grouped navigation and section rendering.
- Non-implemented sections can still appear as deliberate placeholders.

### Organization Members
- An authorized user can view and search organization members.
- An authorized user can invite members.
- An authorized user can assign at least one permission group.
- An authorized user can remove or deactivate a member.
- Empty, loading, and error states are implemented.

### Permission Groups
- An authorized user can view permission groups.
- An authorized user can create a permission group.
- An authorized user can inspect group permissions.
- An authorized user can inspect and manage group members.
- Empty, loading, and error states are implemented.

### Architectural intent
- The UI makes the org → project → user hierarchy feel real.
- The implementation leaves a clean path for future settings sections.
- The work reduces ambiguity around AGChain’s multi-scope design direction.

---

## Recommended instructions for whoever drafts the formal implementation plan

The next planner should use this note to produce a more exact implementation plan with:

1. **File-level frontend plan**
   - routes
   - pages
   - shared components
   - hooks
   - API client helpers
   - tests

2. **Backend/API plan**
   - route proposals
   - request/response contracts
   - auth/authorization checks
   - persistence model and migrations if needed
   - audit/telemetry

3. **Phased execution order**
   - settings shell first
   - members second
   - permission groups third
   - stabilization fourth

4. **Locked non-goals**
   - keep V1 bounded
   - no permission-system overreach

5. **Before vs after product statement**
   - before: settings is placeholder-only and hierarchy remains mostly implicit
   - after: settings becomes the visible home of AGChain’s org/project/user model, with real member and permission-group administration

---

## Final recommendation

This is the right first settings investment.

Not because Members and Permission Groups are flashy, but because they do the harder strategic job:
- they make the hierarchy real,
- they make administration real,
- they make future scoped features easier,
- and they stop Settings from remaining an architectural dead zone.

If the team executes this cleanly, later work on project access, providers, service tokens, environments, logging, and personal credentials will slot into an already-legible system rather than being bolted onto a placeholder.
