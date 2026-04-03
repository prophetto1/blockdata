# 2026-04-02 AGChain Page Composition Correction Implementation Plan

**Goal:** Correct AGChain's frontend page architecture by removing visual-authority page generators, extracting AGChain-wide non-visual scope/workspace state handling, rebuilding the real settings surfaces around page-owned layouts, and enforcing the corrected model so future AGChain pages do not regress to wrapper-driven composition.

**Architecture:** Introduce an AGChain-wide `useAgchainScopeState()` hook that resolves `bootstrapping`, `error`, `no-organization`, `no-project`, and `ready` without dictating page markup. Replace the current settings wrapper and project placeholder wrapper with small reusable primitives plus honest placeholder scaffolds. Rebuild `Organization / Members` closer to the reference image, port `Organization / Permission Groups` to the same corrected model, migrate in-scope mounted AGChain placeholder pages away from `AgchainSectionPage`, and adopt the shared scope-state hook across key mounted AGChain pages (`Overview`, `Projects`, `Datasets`, `Tools`, `Benchmark Definition`) while preserving page-owned composition. Retain `AgchainSectionPage` only as a temporary deprecated compatibility seam for explicit out-of-scope AGChain pages until a follow-on cleanup batch removes the remaining dependents.

**Tech Stack:** React 19, TypeScript 5.9, React Router 7, Tailwind 4, Vitest 4, ESLint 9.

**Status:** Draft
**Date:** 2026-04-02

## Source of truth

This plan is derived from:

- the AGChain settings implementation plan at `docs/plans/feature-settings-org-level, project-level separation/2026-04-01-agchain-settings-shell-members-permission-groups-implementation-plan.md`
- the AGChain visual reference image at `docs/plans/feature-settings-org-level, project-level separation/image.png`
- the current AGChain router, page, and component implementation under `web/src/pages/agchain/**` and `web/src/components/agchain/**`
- the current AGChain shell and workspace-focus hooks
- the current frontend test and lint setup in `web/package.json` and `web/eslint.config.js`
- the user direction in this session to make the correction AGChain-scoped, not Blockdata-scoped

## Verified current state

### Settings wrapper problem

- `web/src/components/agchain/settings/AgchainSettingsSectionLayout.tsx` currently bundles three concerns:
  - AGChain scope/workspace gating
  - page chrome
  - visual page composition
- The component API (`scope`, `title`, `description`, `toolbar`, `headerAction`, `children`) hardcodes a page model of:
  - header slab
  - toolbar slab
  - content slab
- That makes the component a page generator rather than a neutral primitive.

### Mounted settings surfaces currently affected

- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx` uses `AgchainSettingsSectionLayout`.
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx` uses `AgchainSettingsSectionLayout`.
- `web/src/components/agchain/settings/AgchainSettingsPlaceholderPage.tsx` uses `AgchainSettingsSectionLayout` for the mounted limited settings routes:
  - `/app/agchain/settings/organization/api-keys`
  - `/app/agchain/settings/organization/ai-providers`
  - `/app/agchain/settings/project/general`
  - `/app/agchain/settings/project/members`
  - `/app/agchain/settings/project/access`
  - `/app/agchain/settings/personal/preferences`
  - `/app/agchain/settings/personal/credentials`

### Project placeholder generator problem

- `web/src/pages/agchain/AgchainSectionPage.tsx` is the second AGChain page generator.
- It combines:
  - AGChain project-focus gating
  - placeholder page chrome
  - a fixed "hero card + bullet cards" composition
- Mounted AGChain placeholder routes currently depending on it:
  - `web/src/pages/agchain/AgchainPromptsPage.tsx`
  - `web/src/pages/agchain/AgchainScorersPage.tsx`
  - `web/src/pages/agchain/AgchainParametersPage.tsx`
  - `web/src/pages/agchain/AgchainRunsPage.tsx`
  - `web/src/pages/agchain/AgchainResultsPage.tsx`
  - `web/src/pages/agchain/AgchainObservabilityPage.tsx`
- Additional out-of-scope AGChain pages still importing it today:
  - `web/src/pages/agchain/AgchainBuildPage.tsx`
  - `web/src/pages/agchain/AgchainArtifactsPage.tsx`
  - `web/src/pages/agchain/AgchainDashboardPage.tsx`
- Those additional imports mean `AgchainSectionPage.tsx` cannot be deleted in this batch without widening scope beyond the locked page set.

### Repeated inline AGChain scope-state logic

- Several mounted AGChain pages already own their layout but repeat nearly identical `bootstrapping` / `error` / `no-organization` / `no-project` logic inline:
  - `web/src/pages/agchain/AgchainProjectsPage.tsx`
  - `web/src/pages/agchain/AgchainOverviewPage.tsx`
  - `web/src/pages/agchain/AgchainDatasetsPage.tsx`
  - `web/src/pages/agchain/AgchainToolsPage.tsx`
  - `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- These pages are not suffering from the exact same wrapper problem, but they do need the same AGChain-wide non-visual scope-state correction.

### Existing AGChain framing worth preserving

- `web/src/pages/agchain/AgchainPageFrame.tsx` is only outer shell framing (`min-h-full`, `bg-background`, `px-4`) and is not the main problem.
- `web/src/components/layout/AgchainShellLayout.tsx` already owns AGChain shell and rail composition and should remain authoritative for shell-level framing.
- `useAgchainProjectFocus` and `useAgchainWorkspaceContext` remain the real AGChain workspace authorities and should not be bypassed.

### Current enforcement capability

- `web/eslint.config.js` already uses ESLint 9 flat config and already applies `no-restricted-imports` in targeted cases.
- Vitest is already used for AGChain page behavior tests and is suitable for adding an AGChain architecture test that prevents deprecated wrapper imports from reappearing.

## Pre-implementation contract

No major product, route, shell, or architecture decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

## Locked product decisions

1. AGChain page visual authority moves to page-owned layouts. No new full-page visual wrapper may be introduced to replace the current one.
2. Reusable AGChain abstractions in this batch are limited to:
   - non-visual scope/workspace state resolution
   - small page primitives
   - explicit placeholder scaffolds
3. `AgchainSettingsSectionLayout` does not survive as a real-page visual authority.
4. `AgchainSectionPage` does not survive as the default placeholder route generator for in-scope mounted AGChain routes.
5. `AgchainPageFrame` remains the outer AGChain page frame.
6. `useAgchainProjectFocus` and `useAgchainWorkspaceContext` remain the source-of-truth hooks; the new AGChain scope hook composes them rather than replacing them.
7. `Organization / Members` is the first real page to be visually corrected toward the reference image in this batch.
8. `Organization / Permission Groups` is ported to the corrected pattern in the same batch.
9. Mounted limited settings routes remain visible, but they use an explicit placeholder scaffold rather than the former real-page wrapper.
10. Mounted AGChain placeholder routes (`Prompts`, `Scorers`, `Parameters`, `Runs`, `Results`, `Observability`) are migrated off `AgchainSectionPage`.
11. `Overview`, `Projects`, `Datasets`, `Tools`, and `Benchmark Definition` adopt the AGChain-wide scope-state hook in this batch while keeping page-owned composition.
12. `Models` is out of scope for visual correction in this batch because it already owns its layout and does not currently use the page-generator pattern.
13. `Dataset Create`, `Dataset Detail`, and `Dataset Version Draft` are out of scope for this batch beyond future follow-on adoption of the shared scope-state hook.
14. Unmounted AGChain files such as `AgchainBuildPage.tsx`, `AgchainArtifactsPage.tsx`, and `AgchainDashboardPage.tsx` are out of scope for this corrective batch.
15. Because those explicit out-of-scope pages still import `AgchainSectionPage`, the file remains temporarily as a deprecated compatibility seam in this batch.
16. No newly mounted AGChain page and no in-scope page in this batch may import `AgchainSectionPage`.
17. Blockdata is out of scope. This plan is AGChain-only.
18. Enforcement is part of the implementation, not follow-up work. Future AGChain pages must default to the corrected model through lint and architecture tests.

## Architecture

### AGChain-wide scope-state model

Add an AGChain-wide hook:

`useAgchainScopeState(requirement: 'none' | 'organization' | 'project')`

Locked output shape:

```ts
type AgchainScopeState =
  | { kind: 'bootstrapping' }
  | { kind: 'error'; reload: () => Promise<void> }
  | { kind: 'no-organization' }
  | {
      kind: 'no-project';
      selectedOrganization: /* current workspace-selected organization */;
    }
  | {
      kind: 'ready';
      selectedOrganization: /* current workspace-selected organization */;
      focusedProject: /* current focused project */;
    };
```

Behavior contract:

- `requirement: 'none'` allows AGChain-global pages to render in `ready` or `no-project`.
- `requirement: 'organization'` allows render only when an organization exists; `no-project` is still renderable.
- `requirement: 'project'` allows render only in `ready`.
- `kind: 'no-project'` guarantees a non-null `selectedOrganization`.
- `kind: 'ready'` guarantees non-null `selectedOrganization` and non-null `focusedProject`.
- The hook owns no page markup and no visual hierarchy.

### Small reusable AGChain primitives

Allowed reusable primitives in this batch:

- `AgchainEmptyState`
- `AgchainPageHeader`
- explicit placeholder scaffolds:
  - `AgchainProjectPlaceholderPage`
  - `AgchainSettingsPlaceholderLayout`

Constraints:

- These primitives may help with local structure.
- They must not hardcode a three-slab page grammar.
- They must not decide whether the page has a separate toolbar section, hero section, or body card.

### Real page model

Real pages own their composition:

- `AgchainOrganizationMembersPage.tsx`
- `AgchainPermissionGroupsPage.tsx`
- `AgchainProjectsPage.tsx`
- `AgchainOverviewPage.tsx`
- `AgchainDatasetsPage.tsx`
- `AgchainToolsPage.tsx`
- `AgchainBenchmarksPage.tsx`

Locked rule:

- Scope state may be shared.
- Visual composition may not be shared at the page-generator level.

### Placeholder page model

Placeholder pages remain placeholders, but they use honest naming and an explicit placeholder scaffold.

Project-scoped placeholder pages must use:

- `AgchainProjectPlaceholderPage`

Settings limited routes must use:

- `AgchainSettingsPlaceholderLayout`

Locked rule:

- Placeholder scaffolds are only for explicitly limited or reserved surfaces.
- They are not valid for real destination pages.

### Enforcement model

Enforcement must prevent future regression in AGChain:

- Add targeted `no-restricted-imports` rules in `web/eslint.config.js` so mounted AGChain real pages cannot import deprecated wrapper paths.
- Add a Vitest AGChain architecture test that scans mounted AGChain real pages and fails if they import:
  - `AgchainSettingsSectionLayout`
  - `AgchainSectionPage`
  - placeholder-only scaffolds from non-placeholder pages
- Lock the mounted real-page enforcement list in the test and lint configuration to:
  - `AgchainOrganizationMembersPage.tsx`
  - `AgchainPermissionGroupsPage.tsx`
  - `AgchainProjectsPage.tsx`
  - `AgchainOverviewPage.tsx`
  - `AgchainDatasetsPage.tsx`
  - `AgchainToolsPage.tsx`
  - `AgchainBenchmarksPage.tsx`
- Lock the mounted placeholder-page allowance list in the test and lint configuration to:
  - `AgchainSettingsPlaceholderPage.tsx`
  - `AgchainPromptsPage.tsx`
  - `AgchainScorersPage.tsx`
  - `AgchainParametersPage.tsx`
  - `AgchainRunsPage.tsx`
  - `AgchainResultsPage.tsx`
  - `AgchainObservabilityPage.tsx`
- Lock the temporary `AgchainSectionPage` compatibility allowance list in the test and lint configuration to:
  - `AgchainBuildPage.tsx`
  - `AgchainArtifactsPage.tsx`
  - `AgchainDashboardPage.tsx`
- Any future mounted AGChain page added under `web/src/pages/agchain/**` or `web/src/pages/agchain/settings/**` must be classified in the same change as either:
  - a real page forbidden from importing placeholder-only or deprecated wrapper files
  - an explicit placeholder page allowed to import only placeholder scaffolds

## Locked platform API surface

No platform API changes.

Justification:

- This corrective batch is frontend-only.
- It changes page architecture, state composition, and enforcement, but it does not create a new owned runtime seam.

## Locked observability surface

No observability changes.

Justification:

- The batch does not create or migrate any backend-owned runtime path.
- Existing data fetching behavior remains attached to existing frontend callers and backend endpoints.
- No new OpenTelemetry seam is required for the corrective work itself.

## Database migrations

No database migrations.

## Edge functions

No edge function changes.

## Frontend surface area

### Inventory count summary

- Modified existing pages: `14`
- Modified existing components/layout files: `3`
- Modified existing config files: `1`
- Modified existing test files: `10`
- New hooks: `1`
- New hook test files: `1`
- New components/layout files: `4`
- New architecture test files: `1`
- Deleted existing runtime files: `1`
- Deleted existing test files: `0`

### Mount responsibility

| File | Mount / responsibility |
|------|------------------------|
| `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx` | mounted real settings page for `/app/agchain/settings/organization/members` |
| `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx` | mounted real settings page for `/app/agchain/settings/organization/permission-groups` |
| `web/src/components/agchain/settings/AgchainSettingsPlaceholderPage.tsx` | mounted limited-settings placeholder owner for `/app/agchain/settings/organization/api-keys`, `/app/agchain/settings/organization/ai-providers`, `/app/agchain/settings/project/general`, `/app/agchain/settings/project/members`, `/app/agchain/settings/project/access`, `/app/agchain/settings/personal/preferences`, and `/app/agchain/settings/personal/credentials` |
| `web/src/pages/agchain/AgchainBenchmarksPage.tsx` | mounted real project page for benchmark definition and compatibility redirects |
| `web/src/pages/agchain/AgchainProjectsPage.tsx` | mounted real AGChain projects surface |
| `web/src/pages/agchain/AgchainOverviewPage.tsx` | mounted real AGChain overview surface |
| `web/src/pages/agchain/AgchainDatasetsPage.tsx` | mounted real AGChain datasets surface |
| `web/src/pages/agchain/AgchainToolsPage.tsx` | mounted real AGChain tools surface |
| `web/src/pages/agchain/AgchainPromptsPage.tsx` | mounted project-scoped placeholder route |
| `web/src/pages/agchain/AgchainScorersPage.tsx` | mounted project-scoped placeholder route |
| `web/src/pages/agchain/AgchainParametersPage.tsx` | mounted project-scoped placeholder route |
| `web/src/pages/agchain/AgchainRunsPage.tsx` | mounted project-scoped placeholder route |
| `web/src/pages/agchain/AgchainResultsPage.tsx` | mounted project-scoped placeholder route |
| `web/src/pages/agchain/AgchainObservabilityPage.tsx` | mounted project-scoped placeholder route |

## Locked file inventory

### New files

- `web/src/hooks/agchain/useAgchainScopeState.ts`
- `web/src/hooks/agchain/useAgchainScopeState.test.tsx`
- `web/src/components/agchain/AgchainEmptyState.tsx`
- `web/src/components/agchain/AgchainPageHeader.tsx`
- `web/src/components/agchain/AgchainProjectPlaceholderPage.tsx`
- `web/src/components/agchain/settings/AgchainSettingsPlaceholderLayout.tsx`
- `web/src/pages/agchain/AgchainPageArchitecture.test.ts`

### Deleted files

- `web/src/components/agchain/settings/AgchainSettingsSectionLayout.tsx`

### Modified existing files

- `web/eslint.config.js`
- `web/src/components/agchain/settings/AgchainSettingsPlaceholderPage.tsx`
- `web/src/components/agchain/settings/OrganizationMembersTable.tsx`
- `web/src/components/agchain/settings/PermissionGroupsTable.tsx`
- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.tsx`
- `web/src/pages/agchain/AgchainDatasetsPage.tsx`
- `web/src/pages/agchain/AgchainToolsPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainPromptsPage.tsx`
- `web/src/pages/agchain/AgchainScorersPage.tsx`
- `web/src/pages/agchain/AgchainParametersPage.tsx`
- `web/src/pages/agchain/AgchainRunsPage.tsx`
- `web/src/pages/agchain/AgchainResultsPage.tsx`
- `web/src/pages/agchain/AgchainObservabilityPage.tsx`
- `web/src/pages/agchain/AgchainSectionPage.tsx`
- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.test.tsx`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.test.tsx`
- `web/src/pages/agchain/AgchainDatasetsPage.test.tsx`
- `web/src/pages/agchain/AgchainToolsPage.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx`
- `web/src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx`
- `web/src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx`
- `web/src/pages/agchain/AgchainSectionPage.test.tsx`

## Locked acceptance contract

The implementation is only complete when all of the following are true:

1. No mounted AGChain real page depends on `AgchainSettingsSectionLayout`.
2. No mounted in-scope AGChain placeholder route depends on `AgchainSectionPage`.
3. `useAgchainScopeState()` guarantees `selectedOrganization` in `no-project` and guarantees both `selectedOrganization` and `focusedProject` in `ready`, with tests covering those guarantees.
4. `Organization / Members` renders a single integrated top band that combines page title, ownership context, search, and primary actions; it does not render three separate bordered header, toolbar, and body slabs.
5. `Organization / Members` renders members as dense list-style rows with inline metadata and actions rather than the former generic CRUD table slab.
6. `Organization / Permission Groups` uses the same corrected page-owned settings model and integrated top-band rule instead of the former wrapper-driven three-slab composition.
7. Mounted limited settings routes remain visible and functional, but they render through an explicit placeholder scaffold rather than the former real-page wrapper.
8. Mounted AGChain placeholder routes (`Prompts`, `Scorers`, `Parameters`, `Runs`, `Results`, `Observability`) render through an honest placeholder surface rather than a generic page generator.
9. `Overview`, `Projects`, `Datasets`, `Tools`, and `Benchmark Definition` resolve AGChain workspace state through the shared non-visual scope-state hook.
10. `AgchainPageFrame` remains the only shared outer AGChain page frame in this batch.
11. ESLint and the AGChain architecture test encode the mounted real-page and placeholder-page lists defined in this plan and fail on forbidden imports or unclassified mounted pages.
12. `AgchainSectionPage` remains only as a temporary deprecated compatibility seam for `AgchainBuildPage.tsx`, `AgchainArtifactsPage.tsx`, and `AgchainDashboardPage.tsx`.
13. No new AGChain page adopts `AgchainSectionPage`.
14. The AGChain shell route tree, settings taxonomy, and benchmark compatibility redirects remain unchanged.

## Frozen seam contract

### AGChain shell framing

- `web/src/components/layout/AgchainShellLayout.tsx` remains the shell authority.
- `web/src/pages/agchain/AgchainPageFrame.tsx` remains the outer AGChain content frame.
- This plan does not redesign primary AGChain shell navigation or route ownership.

### Workspace source of truth

- `useAgchainProjectFocus` remains the source of truth for focused project status.
- `useAgchainWorkspaceContext` remains the source of truth for selected organization.
- `useAgchainScopeState()` is an adapter over those authorities, not a replacement state source.

### Route compatibility

- Existing AGChain route paths remain unchanged.
- Existing settings route paths remain unchanged.
- Existing benchmark compatibility redirects remain unchanged.
- Existing AGChain settings rail behavior remains unchanged except where page content composition changes.

### Temporary compatibility seam

- `web/src/pages/agchain/AgchainSectionPage.tsx` remains temporarily as a deprecated compatibility seam.
- In this batch it is allowed only for:
  - `AgchainBuildPage.tsx`
  - `AgchainArtifactsPage.tsx`
  - `AgchainDashboardPage.tsx`
- It is not allowed for any mounted in-scope placeholder route in this plan.
- Its final deletion moves to a follow-on AGChain cleanup batch once the remaining out-of-scope dependents are migrated.

### Mounted-page enforcement boundary

- Mounted real pages in this batch are exactly:
  - `AgchainOrganizationMembersPage.tsx`
  - `AgchainPermissionGroupsPage.tsx`
  - `AgchainProjectsPage.tsx`
  - `AgchainOverviewPage.tsx`
  - `AgchainDatasetsPage.tsx`
  - `AgchainToolsPage.tsx`
  - `AgchainBenchmarksPage.tsx`
- Mounted placeholder pages in this batch are exactly:
  - `AgchainSettingsPlaceholderPage.tsx`
  - `AgchainPromptsPage.tsx`
  - `AgchainScorersPage.tsx`
  - `AgchainParametersPage.tsx`
  - `AgchainRunsPage.tsx`
  - `AgchainResultsPage.tsx`
  - `AgchainObservabilityPage.tsx`
- Future mounted AGChain pages must update the lint and architecture-test classification in the same change that mounts the route.

## Explicit risks accepted in this plan

1. The current page tests are coupled to old wrapper-generated copy and DOM shape.
   - Mitigation: rewrite tests toward visible behavior, ownership copy, actions, and scope-state outcomes rather than wrapper-specific slab DOM.

2. The members page visual correction may require meaningful changes to row density and structure beyond the current table layout.
   - Mitigation: treat the reference image as real visual guidance for `Organization / Members` rather than preserving the current generic CRUD table shape.

3. Mounted placeholder routes may temporarily diverge from real pages in appearance once the page generator is removed.
   - Mitigation: use explicit placeholder scaffolds with honest naming and keep them scoped only to limited pages.

4. AGChain has other deep-detail pages that repeat scope-state logic but are not in the first corrective batch.
   - Mitigation: keep the new AGChain-wide hook generic enough for follow-on adoption and do not allow this batch to widen into Blockdata.

5. `AgchainSectionPage` must remain temporarily because explicit out-of-scope pages still import it.
   - Mitigation: quarantine it as a deprecated compatibility seam, forbid new adopters through lint and architecture tests, and move final deletion to a follow-on cleanup batch.

6. This corrective batch touches multiple mounted AGChain pages and enforcement seams in one pass.
   - Mitigation: execute tasks strictly in order, require each task's targeted verification to pass before moving forward, and stop if the work starts to widen beyond the file inventory locked in this plan.

## Task breakdown

### Task 1: Add the AGChain-wide non-visual scope-state hook and page primitives

**Files:**

- `web/src/hooks/agchain/useAgchainScopeState.ts`
- `web/src/hooks/agchain/useAgchainScopeState.test.tsx`
- `web/src/components/agchain/AgchainEmptyState.tsx`
- `web/src/components/agchain/AgchainPageHeader.tsx`

**Steps:**

1. Implement `useAgchainScopeState(requirement)` as a discriminated-union adapter over `useAgchainProjectFocus` and `useAgchainWorkspaceContext`.
2. Add `AgchainEmptyState` for reusable no-org / no-project / error displays.
3. Add `AgchainPageHeader` for lightweight page-owned header composition.
4. Verify the hook produces the locked `bootstrapping`, `error`, `no-organization`, `no-project`, and `ready` outcomes.

**Test command:** `cd web && npx vitest run src/hooks/agchain/useAgchainScopeState.test.tsx`

**Expected output:** hook tests pass with discriminated state coverage.

**Commit:** `refactor(agchain): add shared scope-state hook and page primitives`

### Task 2: Replace the settings real-page wrapper with an explicit placeholder scaffold and rebuild Organization Members

**Files:**

- `web/src/components/agchain/settings/AgchainSettingsPlaceholderLayout.tsx`
- `web/src/components/agchain/settings/AgchainSettingsPlaceholderPage.tsx`
- `web/src/components/agchain/settings/OrganizationMembersTable.tsx`
- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx`
- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.test.tsx`
- `web/src/components/agchain/settings/AgchainSettingsSectionLayout.tsx` (delete)

**Steps:**

1. Replace the former settings wrapper with an explicit placeholder-only settings scaffold.
2. Update `AgchainSettingsPlaceholderPage` to use the placeholder-only scaffold.
3. Rebuild `Organization / Members` as a page-owned settings surface with a single integrated top band rather than separate bordered header and toolbar slabs.
4. Replace the former generic CRUD table-slab feel with denser member rows that keep metadata and actions inline and closer to the reference image.

**Test command:** `cd web && npx vitest run src/pages/agchain/settings/AgchainOrganizationMembersPage.test.tsx`

**Expected output:** members page tests pass against the corrected page-owned layout behavior.

**Commit:** `refactor(agchain-settings): remove real-page wrapper and rebuild members surface`

### Task 3: Port Permission Groups and Benchmark Definition to the corrected page-owned model

**Files:**

- `web/src/components/agchain/settings/PermissionGroupsTable.tsx`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx`

**Steps:**

1. Port `Organization / Permission Groups` off the former settings wrapper and into the corrected page-owned settings pattern with the same integrated top-band rule used on `Organization / Members`.
2. Apply the shared scope-state hook to `Benchmark Definition` and remove duplicated AGChain gating markup.
3. Preserve benchmark-definition route compatibility and page-local benchmark navigation.

**Test command:** `cd web && npx vitest run src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx src/pages/agchain/AgchainBenchmarksPage.test.tsx`

**Expected output:** permission-groups and benchmark-definition tests pass with the corrected scope-state path.

**Commit:** `refactor(agchain): port permission groups and benchmark definition to corrected page model`

### Task 4: Replace the AGChain project placeholder page-generator and migrate mounted placeholder routes

**Files:**

- `web/src/components/agchain/AgchainProjectPlaceholderPage.tsx`
- `web/src/pages/agchain/AgchainPromptsPage.tsx`
- `web/src/pages/agchain/AgchainScorersPage.tsx`
- `web/src/pages/agchain/AgchainParametersPage.tsx`
- `web/src/pages/agchain/AgchainRunsPage.tsx`
- `web/src/pages/agchain/AgchainResultsPage.tsx`
- `web/src/pages/agchain/AgchainObservabilityPage.tsx`
- `web/src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx`
- `web/src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx`
- `web/src/pages/agchain/AgchainSectionPage.tsx`
- `web/src/pages/agchain/AgchainSectionPage.test.tsx`

**Steps:**

1. Add an honest project placeholder surface component built on the new AGChain scope-state hook and small primitives.
2. Migrate all mounted AGChain placeholder route pages off `AgchainSectionPage`.
3. Retain `AgchainSectionPage` only as a deprecated compatibility shim for `AgchainBuildPage.tsx`, `AgchainArtifactsPage.tsx`, and `AgchainDashboardPage.tsx`.
4. Update placeholder tests so they assert placeholder behavior without preserving the former page-generator contract.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx`

**Expected output:** placeholder route tests pass without any dependency on `AgchainSectionPage` from the in-scope mounted placeholder pages.

**Commit:** `refactor(agchain): replace project placeholder page generator`

### Task 5: Adopt the shared scope-state hook across key mounted real AGChain pages

**Files:**

- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.test.tsx`
- `web/src/pages/agchain/AgchainDatasetsPage.tsx`
- `web/src/pages/agchain/AgchainDatasetsPage.test.tsx`
- `web/src/pages/agchain/AgchainToolsPage.tsx`
- `web/src/pages/agchain/AgchainToolsPage.test.tsx`

**Steps:**

1. Replace repeated AGChain scope gating in the key mounted real pages with `useAgchainScopeState()`.
2. Preserve each page's page-owned layout.
3. Remove duplicated no-org / no-project / error boilerplate where the shared hook and primitives now own the state model.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainProjectsPage.test.tsx src/pages/agchain/AgchainOverviewPage.test.tsx src/pages/agchain/AgchainDatasetsPage.test.tsx src/pages/agchain/AgchainToolsPage.test.tsx`

**Expected output:** the key AGChain real-page tests pass with shared scope-state behavior and preserved page-owned layouts.

**Commit:** `refactor(agchain): adopt shared scope-state hook in key real pages`

### Task 6: Add enforcement and run AGChain corrective verification

**Files:**

- `web/eslint.config.js`
- `web/src/pages/agchain/AgchainPageArchitecture.test.ts`

**Steps:**

1. Add targeted `no-restricted-imports` rules preventing mounted AGChain real pages from importing deprecated wrapper paths and preventing mounted in-scope placeholder pages from importing `AgchainSectionPage`, with an explicit compatibility exception only for `AgchainBuildPage.tsx`, `AgchainArtifactsPage.tsx`, and `AgchainDashboardPage.tsx`.
2. Add an AGChain architecture test that fails if mounted AGChain real pages import placeholder-only scaffolds or deprecated wrapper files, fails if mounted in-scope placeholder pages import `AgchainSectionPage`, and allows the same explicit compatibility exception list.
3. Run the AGChain corrective verification sweep.

**Test commands:**

- `cd web && npx vitest run src/hooks/agchain/useAgchainScopeState.test.tsx src/pages/agchain/AgchainPageArchitecture.test.ts src/pages/agchain/settings/AgchainOrganizationMembersPage.test.tsx src/pages/agchain/settings/AgchainPermissionGroupsPage.test.tsx src/pages/agchain/AgchainBenchmarksPage.test.tsx src/pages/agchain/AgchainProjectsPage.test.tsx src/pages/agchain/AgchainOverviewPage.test.tsx src/pages/agchain/AgchainDatasetsPage.test.tsx src/pages/agchain/AgchainToolsPage.test.tsx src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx`
- `cd web && npx eslint eslint.config.js src/pages/agchain src/components/agchain src/hooks/agchain`
- `cd web && npm run build`

**Expected output:** targeted AGChain tests pass, targeted AGChain lint passes, and the web build succeeds.

**Manual verification:**

1. Open `/app/agchain/settings/organization/members` and verify the page uses one integrated top band instead of separate bordered header and toolbar slabs.
2. Compare the members surface against `docs/plans/feature-settings-org-level, project-level separation/image.png` and confirm the page uses dense row-based composition rather than a generic CRUD table slab.
3. Open `/app/agchain/settings/organization/permission-groups` and confirm it follows the same integrated top-band rule and avoids the former three-slab settings-wrapper composition.
4. Open mounted AGChain placeholder routes (`Prompts`, `Scorers`, `Parameters`, `Runs`, `Results`, `Observability`) and confirm they still render, but no longer use the old project placeholder generator.
5. Open `Overview`, `Projects`, `Datasets`, `Tools`, and `Benchmark Definition` and confirm project/no-project/no-organization handling still works.

**Commit:** `test(agchain): enforce corrected page composition model`

## Completion criteria

The work is complete only when all of the following are true:

1. AGChain has a shared non-visual scope-state model.
2. No mounted AGChain real page relies on a full-page visual wrapper or page generator.
3. `Organization / Members` and `Organization / Permission Groups` use page-owned layouts aligned with the corrected model.
4. Mounted in-scope AGChain placeholder routes use explicit placeholder scaffolds instead of visual-authority page generators.
5. Key mounted real AGChain pages share scope-state handling without losing layout ownership.
6. `AgchainSectionPage` survives only as a temporary deprecated compatibility seam for explicit out-of-scope pages.
7. The AGChain shell, route tree, and benchmark compatibility seams remain intact.
8. Future AGChain pages are protected from regression by lint and architecture tests.
