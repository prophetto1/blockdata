# AGChain Settings Shell Final Closeout Remediation Plan

**Goal:** Revise the prior closeout artifact after verified findings showed the batch is not actually ready for archival closeout. Keep the routed settings shell and shipped settings surfaces as the base, but correct the remaining product and implementation defects before final closeout:

1. remove project-level `Members` and `Access` settings drift from the visible IA
2. enforce the intended rule that an organization member may belong to at most one permission group
3. bring the invite flow and surrounding settings surfaces back into line with the screenshot-guided interaction model

**Architecture:** The routed settings shell, organization members surface, permission-groups surface, backend settings API, and initial settings migrations are already landed. This plan is now a targeted remediation-closeout plan, not a “browser smoke only” closeout. The corrective work stays scoped to the verified findings and their mechanical cascades across frontend UI, backend contracts, domain logic, schema constraints, tests, and final verification.

**Tech Stack:** React, TypeScript, React Router, Vitest, FastAPI, pytest, Supabase Postgres migrations, OpenTelemetry.

**Status:** Draft  
**Date:** 2026-04-03

## Reviewed Inputs

- Historical implementation plan:
  - `docs/plans/feature-settings-org-level, project-level separation/2026-04-01-agchain-settings-shell-members-permission-groups-implementation-plan.md`
- Prior closeout successor:
  - `docs/plans/feature-settings-org-level, project-level separation/2026-04-03-agchain-settings-shell-reconciled-closeout-plan.md`
- Reference note and screenshots:
  - `docs/plans/feature-settings-org-level, project-level separation/agchain-settings-reference-note.md`
  - `docs/plans/feature-settings-org-level, project-level separation/image.png`
  - `docs/plans/feature-settings-org-level, project-level separation/image copy.png`
  - `docs/plans/feature-settings-org-level, project-level separation/image copy 2.png`
  - `docs/plans/feature-settings-org-level, project-level separation/image copy 3.png`
- Frontend runtime reviewed:
  - `web/src/router.tsx`
  - `web/src/components/layout/AgchainShellLayout.tsx`
  - `web/src/components/agchain/settings/AgchainSettingsNav.tsx`
  - `web/src/pages/agchain/AgchainSettingsPage.tsx`
  - `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx`
- `web/src/components/agchain/settings/InviteOrganizationMembersModal.tsx`
- `web/src/components/agchain/settings/PermissionGroupMembersModal.tsx`
- `web/src/components/agchain/settings/OrganizationMembersTable.tsx`
- `web/src/hooks/agchain/useAgchainPermissionGroups.ts`
- `web/src/lib/agchainSettings.ts`
- Backend runtime reviewed:
  - `services/platform-api/app/api/routes/agchain_settings.py`
  - `services/platform-api/app/domain/agchain/organization_members.py`
  - `services/platform-api/app/domain/agchain/permission_groups.py`
  - `services/platform-api/app/domain/agchain/organization_access.py`
  - `services/platform-api/app/main.py`
- Database migrations reviewed:
  - `supabase/migrations/20260402170000_agchain_settings_permission_groups_and_invites_schema.sql`
  - `supabase/migrations/20260402171000_agchain_settings_owners_backfill.sql`
- Verification commands previously run:
  - `cd services/platform-api && pytest -q tests/test_agchain_workspaces.py tests/test_agchain_settings.py`
  - `cd web && npx vitest run src/components/agchain/AgchainOrganizationSwitcher.test.tsx src/components/agchain/settings/AgchainSettingsNav.test.tsx src/pages/agchain/AgchainSettingsPage.test.tsx src/components/agchain/AgchainBenchmarkNav.test.tsx src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx src/components/layout/AgchainShellLayout.test.tsx src/pages/agchain/AgchainBenchmarksPage.test.tsx src/pages/agchain/settings/AgchainOrganizationMembersPage.test.tsx src/components/agchain/settings/InviteOrganizationMembersModal.test.tsx src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx src/components/agchain/settings/CreatePermissionGroupModal.test.tsx src/components/agchain/settings/PermissionGroupPermissionsModal.test.tsx src/components/agchain/settings/PermissionGroupMembersModal.test.tsx`
  - `cd web && npm run build`

## Takeover Decision

This plan is a **targeted plan revision** under `addressing-evaluation-findings`, informed by `comprehensive-systematic-debugging`.

Why:

- the current runtime is materially present, but the prior closeout conclusion was too lenient
- verified findings show that the shipped implementation still diverges from the intended product contract
- those divergences are specific and fixable; they do not require scrapping the routed settings shell or the page-owned settings composition model

## Evaluation Cross-Check

- Verified accurate findings: `3`
- Verified inaccurate findings: `1`
- Partially accurate findings: `0`

## Findings Tracker

| # | Severity | Finding | Verification | Scope of Fix | Disposition |
| --- | --- | --- | --- | --- | --- |
| 1 | High | `Project / Members` and `Project / Access` remain visible even though member and permission administration is organization-level only | Verified in `AgchainSettingsNav.tsx` and inherited route taxonomy | Plan route contract, nav, router/tests, closeout expectations | Fixed in this revision |
| 2 | Critical | invite and membership semantics allow multi-group assignment even though each organization member must belong to only one group | Verified in `InviteOrganizationMembersModal.tsx`, `agchain_settings.py`, `organization_members.py`, `permission_groups.py`, and the current migration schema | frontend modal, API shapes, domain logic, migrations, tests, plan contracts | Fixed in this revision |
| 3 | Medium | screenshot-guided interaction model was not followed closely enough in the invite flow and surrounding admin surfaces | Verified against `agchain-settings-reference-note.md` and the screenshot set | UI composition requirements, modal contract, smoke checklist, tests | Fixed in this revision |
| 4 | Low | prior closeout artifact said the unrelated `web` build blocker still existed | Contradicted by fresh `npm run build` success | plan text only | Disagreed with evidence |

## Approved Contract Summary

The corrected implementation contract is now:

- `/app/agchain/settings` still redirects to `/app/agchain/settings/organization/members`
- organization-level membership and permission administration live only under `Organization`
- `Project / Members` and `Project / Access` do not remain visible placeholder slots in the final settings IA for this batch
- organization members may belong to **zero or one** permission group, never more than one
- pending invites may be created in bulk, but each invite row carries its own single `permission_group_id`
- permission-group membership management must reassign a member into the selected group instead of creating parallel group memberships
- invite and group-management UI must follow the screenshot-guided interaction model more closely: list-first pages, compact modals, low clutter, and no checkbox matrix implying multi-group assignment
- benchmark definition remains the real project-scoped settings surface with page-local benchmark navigation

## Compliance Verdict

**Verdict:** `Non-Compliant`

**Why:**

1. The current settings IA still exposes project-level `Members` and `Access` placeholders that contradict the intended organization-only membership and permission model.
2. The current invite and membership implementation models members as multi-group assignable.
3. The current invite flow visually reinforces that wrong model through a checkbox-based group matrix instead of a per-user single-group flow.

The batch cannot be closed until those defects are remediated and re-verified.

## Manifest Audit

### Platform API

`Non-Compliant`

- the route family is present, but `POST /member-invitations` still accepts plural batch-level `permission_group_ids`
- current group-membership mutation semantics allow additive multi-group membership instead of single-group reassignment

### Observability

`Compliant with carry-forward edits`

- the existing settings counters, histograms, and spans are present
- remediation may keep the same telemetry family names, but invite/add-member attributes must continue to avoid leaking PII while reflecting the corrected request model

### Database Migrations

`Non-Compliant`

- the current schema allows many-to-many `organization_member -> permission_group`
- the current invite-assignment table also allows multiple group assignments per invite
- a corrective migration is required to enforce the corrected one-group-per-member and one-group-per-invite rule

### Edge Functions

`Compliant`

- no edge-function work is required for this correction

### Frontend Surface Area

`Non-Compliant`

- the routed shell exists, but the current nav taxonomy still carries project-level membership/access drift
- the current invite modal uses checkbox-based multi-select and batch-global assignment
- the current group-members modal supports additive assignment rather than reassignment semantics

### Verification Evidence

`Insufficient for closeout`

- current targeted suites and build prove the shipped implementation is internally consistent with its existing contract
- they do **not** prove compliance with the corrected product contract
- new failing-then-passing verification is required after remediation

## Root Cause Findings

1. The earlier plan locked a future-facing taxonomy that preserved `Project / Members` and `Project / Access` as visible placeholders, and the runtime nav followed that taxonomy instead of the narrower organization-only product intent.
2. The invite contract was modeled as one batch of emails plus one shared `permission_group_ids` array, which collapses all invitees into the same assignment model and makes per-person assignment impossible.
3. The backing schema and domain logic were modeled as many-to-many membership, so the UI drift is not cosmetic; it reflects the current persistence and mutation semantics.
4. The screenshot reference was treated as inspiration rather than as an interaction constraint, especially in the invite flow.

## Current Verified Status

### Shipped and retained

1. Routed settings-shell redirect is live.
2. Grouped settings rail is live.
3. Organization members page is live.
4. Permission groups page is live.
5. Benchmark-definition compatibility seam is intact.
6. Backend settings route family, access helpers, and initial migrations exist.
7. The current targeted backend suite passes.
8. The current targeted frontend suite passes.
9. `cd web && npm run build` passes.

### Open defects that block closeout

1. Wrong visible settings IA for membership/access scope.
2. Wrong invite cardinality model.
3. Wrong persisted group-membership cardinality model.
4. Wrong group-members mutation semantics.
5. Invite modal interaction model still drifts from the screenshot guide.

## Pre-Implementation Contract

This remediation stays scoped to the verified findings above and their mechanical cascades only. Do not reopen the page-owned composition correction, do not reintroduce the obsolete wrapper model, and do not widen into unrelated AGChain settings work outside the verified findings.

## Locked Decisions

1. This is no longer a smoke-only closeout pass. It is a corrective closeout pass.
2. Organization member and permission administration are organization-level only in this batch.
3. `Project / Members` and `Project / Access` do not remain as visible placeholders in the corrected settings IA.
4. A member may have at most one permission group assignment.
5. A pending invite may carry at most one permission-group assignment.
6. Bulk invite remains allowed, but assignment is per invitee row.
7. Group-management flows may reassign a member into a new group, but may not create parallel group memberships.
8. Existing owners safeguards remain mandatory: no repair may allow the last active owner to lose owner status.
9. The page-owned settings composition model remains correct and must stay.
10. Build success supersedes the old note about an unrelated build blocker.

## Corrective Tasks

### Task 1: Correct the visible settings IA to match organization-only membership and permission scope

**Files in scope:**

- `web/src/components/agchain/settings/AgchainSettingsNav.tsx`
- `web/src/router.tsx`
- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/agchain/settings/AgchainSettingsNav.test.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.test.tsx`
- any router or shell tests that assert the old placeholder taxonomy

**Required changes:**

1. Remove `Project / Members` from the visible settings navigation for this batch.
2. Remove `Project / Access` from the visible settings navigation for this batch.
3. Update any related route expectations and tests so the routed settings shell still exposes only the intended scope model.
4. Preserve `Project / Benchmark Definition` as the real project-scoped settings surface.

**Expected result:** the settings shell communicates scope honestly instead of reserving misleading access-management placeholders.

### Task 2: Replace the multi-group invite contract with per-invite single-group bulk assignment

**Files in scope:**

- `web/src/components/agchain/settings/InviteOrganizationMembersModal.tsx`
- `web/src/components/agchain/settings/InviteOrganizationMembersModal.test.tsx`
- `web/src/hooks/agchain/useAgchainOrganizationMembers.ts`
- `web/src/lib/agchainSettings.ts`
- `services/platform-api/app/api/routes/agchain_settings.py`
- `services/platform-api/app/domain/agchain/organization_members.py`
- `services/platform-api/tests/test_agchain_settings.py`

**Locked API correction:**

- replace the request shape

```json
{
  "invites": [
    {
      "email": "person@example.com",
      "permission_group_id": "uuid"
    }
  ]
}
```

- replace result payload fields that currently imply plural assignment with a singular `permission_group_id`

**Required behavior:**

1. Bulk invite remains supported.
2. Each invitee row chooses exactly one permission group.
3. The UI must not imply that one group selection applies globally to the entire batch.
4. Validation fails if any invite row is missing an email or permission group.

**Expected result:** each invitee is independently assignable during a single bulk invite session.

### Task 3: Enforce one-group-per-member and one-group-per-invite in persistence and mutation logic

**Files in scope:**

- `services/platform-api/app/domain/agchain/organization_members.py`
- `services/platform-api/app/domain/agchain/permission_groups.py`
- `services/platform-api/tests/test_agchain_settings.py`
- new corrective migration under `supabase/migrations/`
- `web/src/hooks/agchain/useAgchainPermissionGroups.ts`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx`

**Required changes:**

1. Add a corrective migration that:
   - reconciles any existing duplicate `agchain_permission_group_memberships` rows per `organization_member_id`
   - reconciles any existing duplicate invite-group assignments per `organization_invite_id`
   - enforces uniqueness so each `organization_member_id` can map to at most one permission group
   - enforces uniqueness so each `organization_invite_id` can map to at most one permission group
2. Update group-membership mutations so adding a member to a group reassigns that member into the selected group instead of layering on a second membership.
3. Preserve the owner-protection rules during reassignment and removal flows.
4. Update the members-list contract and UI rendering so a member shows a single assigned group or “No group assigned,” not an arbitrary list of groups.

**Expected result:** the database, domain layer, and UI all agree on the same zero-or-one group assignment model.

### Task 4: Bring the corrected members and invite surfaces back into line with the screenshot-guided interaction model

**Files in scope:**

- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx`
- `web/src/components/agchain/settings/InviteOrganizationMembersModal.tsx`
- `web/src/components/agchain/settings/OrganizationMembersTable.tsx`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx`
- `web/src/components/agchain/settings/PermissionGroupMembersModal.tsx`
- `web/src/hooks/agchain/useAgchainPermissionGroups.ts`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx`
- related frontend tests

**Required changes:**

1. Keep the list-first page structure from the screenshots and reference note.
2. Replace the current checkbox matrix with a compact row-based invite surface that assigns one group per invitee.
3. Keep the modal focused and low-clutter; avoid large always-visible assignment matrices.
4. Keep permission-group member management clear about reassignment semantics when moving a member into a different group.

**Expected result:** the screens read as deliberate admin tools rather than generic form scaffolds.

### Task 5: Re-verify the corrected contract before any closeout claim

**Required verification:**

- `cd services/platform-api && pytest -q tests/test_agchain_workspaces.py tests/test_agchain_settings.py`
- `cd web && npx vitest run src/components/agchain/AgchainOrganizationSwitcher.test.tsx src/components/agchain/settings/AgchainSettingsNav.test.tsx src/pages/agchain/AgchainSettingsPage.test.tsx src/components/agchain/settings/InviteOrganizationMembersModal.test.tsx src/pages/agchain/settings/AgchainOrganizationMembersPage.test.tsx src/components/agchain/settings/PermissionGroupMembersModal.test.tsx src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx`
- `cd web && npm run build`
- authenticated browser smoke for:
  - `/app/agchain/settings`
  - `/app/agchain/settings/organization/members`
  - `/app/agchain/settings/organization/permission-groups`
  - `/app/agchain/settings/project/benchmark-definition`

**Evidence requirement:** do not restore a compliant/closeout verdict unless the corrected tests, build, and browser smoke are all green.

## Revision Summary

**Evaluation cross-checked:** user-reported implementation findings against the current plan and runtime  
**Artifact revised:** `docs/plans/feature-settings-org-level, project-level separation/2026-04-03-agchain-settings-shell-final-closeout-plan.md`

### Findings Fixed In This Revision

- project-level membership/access placeholder drift is now explicitly treated as a real defect, not a harmless placeholder
- one-group-per-member semantics are now locked into the plan as the required contract
- screenshot-guided invite and admin-surface behavior is now reintroduced as a required remediation target

### Findings Disagreed

- the earlier claim that an unrelated `web` build blocker still existed is rejected based on fresh build success

### Cascading Changes Captured

- invite API contract must change
- member-list response semantics must narrow
- group-members mutation semantics must change
- a corrective migration is required
- verification expectations must be rerun against the corrected contract, not the old one

## Exit Criteria

This batch is fully closed only when all of the following are true:

1. The visible settings IA no longer implies project-level member/access administration in this batch.
2. Bulk invite assigns one permission group per invitee row.
3. The backend and schema enforce zero-or-one permission group per organization member.
4. The owner-protection rules still hold under reassignment and removal flows.
5. The targeted backend suite passes against the corrected contract.
6. The targeted frontend suite passes against the corrected contract.
7. `cd web && npm run build` passes.
8. Authenticated browser smoke confirms the corrected interaction model and scope communication.
9. Only then may this artifact return to true final closeout status.
