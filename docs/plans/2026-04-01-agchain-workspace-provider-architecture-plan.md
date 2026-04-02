# AGChain Workspace Provider Architecture Plan

**Goal:** Replace the split-brain workspace state architecture with a single shared React context provider so that sidebar and page components always share one source of truth for organization/project selection, eliminating the correctness failure where project-scoped pages hard-block on `focusedProject === null` during initial hydration or event-sync race conditions.

**Architecture:** Mount one `AgchainWorkspaceProvider` in `AgchainShellLayout` above `<Outlet />`. Move all workspace state ownership into the provider. Convert the existing `useAgchainWorkspaceContext` and `useAgchainProjectFocus` hooks into thin adapters that consume the provider context instead of creating independent state. Introduce an explicit status model (`bootstrapping | no-organization | no-project | ready | error`) so pages render based on status, not null checks. Pull `AgchainProjectsPage` into the shared model. Remove window custom events as the within-tab synchronization mechanism. Keep localStorage as write-through persistence only.

**Tech Stack:** React, TypeScript, Vitest, React Testing Library.

**Status:** Draft
**Author:** jon
**Date:** 2026-04-01

---

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

---

## Manifest

### Platform API

No platform API changes. This plan is a pure frontend state architecture fix. All existing backend endpoints are consumed as-is.

### Observability

No observability changes. The backend request patterns are unchanged. The only measurable improvement is fewer redundant workspace fetches (currently N per page load, reduced to 1), which will show as reduced request volume on existing endpoint metrics.

### Database Migrations

No migrations. No schema changes.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

**New files: 4**

| File | Purpose |
|------|---------|
| `web/src/contexts/AgchainWorkspaceContext.tsx` | Provider component, React context, `useAgchainWorkspace` consumer hook, status type exports |
| `web/src/lib/agchainWorkspaceReconciliation.ts` | Pure `reconcileWorkspaceSelection()` function, `AgchainWorkspaceStatus` type, input/output types |
| `web/src/lib/agchainWorkspaceReconciliation.test.ts` | Unit tests for the reconciliation function (all status transitions, stale localStorage, edge cases) |
| `web/src/contexts/AgchainWorkspaceContext.test.tsx` | Integration tests for the provider (bootstrap, org switch, project switch, error recovery) |

**Modified files: 13**

| File | What changes |
|------|--------------|
| `web/src/components/layout/AgchainShellLayout.tsx` | Wrap `<Outlet />` subtree in `<AgchainWorkspaceProvider>` |
| `web/src/hooks/agchain/useAgchainWorkspaceContext.ts` | Replace state-creating hook body with thin adapter that reads from provider context |
| `web/src/hooks/agchain/useAgchainProjectFocus.ts` | Replace workspace-context dependency with provider context adapter; add `status` to return type |
| `web/src/lib/agchainProjectFocus.ts` | Fix dead code bug (line 89-91: unreachable broadcast); remove event dispatch from `setStoredAgchainWorkspaceFocus`; keep localStorage read/write utilities |
| `web/src/pages/agchain/AgchainToolsPage.tsx` | Replace `if (!focusedProject)` hard-block with status-based rendering |
| `web/src/pages/agchain/AgchainDatasetsPage.tsx` | Replace `if (!focusedProject)` hard-block with status-based rendering |
| `web/src/pages/agchain/AgchainBenchmarksPage.tsx` | Replace `if (!loading && !hasProjectFocus)` with status-based rendering |
| `web/src/pages/agchain/AgchainOverviewPage.tsx` | Replace `if (!loading && !focusedProject)` with status-based rendering |
| `web/src/pages/agchain/AgchainSettingsPage.tsx` | Replace `if (!loading && !focusedProject)` with status-based rendering |
| `web/src/pages/agchain/AgchainSectionPage.tsx` | Replace `if (!loading && !focusedProject)` with status-based rendering |
| `web/src/pages/agchain/AgchainProjectsPage.tsx` | Replace independent `fetchAgchainProjects()` with provider's org-scoped project list; call provider actions after create |
| `web/src/router.tsx` | Update `AgchainIndexRedirect` to use status-based rendering instead of `loading` + null check |
| `web/src/components/agchain/AgchainWorkspaceSync.test.tsx` | Wrap test harness in `<AgchainWorkspaceProvider>` |

**Unchanged files (adapter chain preserves their API):**

| File | Why unchanged |
|------|---------------|
| `web/src/hooks/agchain/useAgchainTools.ts` | Consumes `useAgchainProjectFocus` — adapter returns same shape |
| `web/src/hooks/agchain/useAgchainDatasets.ts` | Same |
| `web/src/hooks/agchain/useAgchainDatasetDetail.ts` | Same |
| `web/src/hooks/agchain/useAgchainDatasetDraft.ts` | Same |
| `web/src/hooks/agchain/useAgchainBenchmarkSteps.ts` | Same — benchmark slug stays route-driven |
| `web/src/components/agchain/AgchainProjectSwitcher.tsx` | Consumes `useAgchainProjectFocus` — adapter returns same shape |
| `web/src/components/agchain/AgchainOrganizationSwitcher.tsx` | Consumes `useAgchainWorkspaceContext` — adapter returns same shape |

**Unchanged test files (they mock hooks at module level, bypassing the context):**
All existing page tests that use `vi.mock('@/hooks/agchain/useAgchainProjectFocus', ...)` continue to work without changes because the mock replaces the entire hook module.

---

## Locked Product Decisions

1. The provider mounts in `AgchainShellLayout`, wrapping the `<Outlet />` subtree. All AGChain pages share one provider instance.
2. Status is authoritative over null checks. Pages render loading skeleton during `bootstrapping`, appropriate empty states for `no-organization` and `no-project`, failure UI for `error`, and main content for `ready`.
3. Adapters preserve existing hook return shapes. The first pass changes plumbing, not faucets. Consumer-facing APIs (`useAgchainWorkspaceContext`, `useAgchainProjectFocus`) keep their current return types with one additive field (`status`).
4. `ProjectsPage` shows projects for the currently selected organization (from the provider's org-scoped list), not all organizations. Users switch orgs via the sidebar org switcher.
5. localStorage is write-through persistence only. The provider is the authority within a tab. localStorage is read during bootstrap hydration and written on every selection change.
6. Window custom events (`AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT`, `AGCHAIN_PROJECT_LIST_CHANGED_EVENT`) are removed as the within-tab synchronization mechanism. Cross-tab sync via `storage` event is explicitly deferred — not in scope for this plan.
7. Benchmark identity stays route-driven. The provider owns organization/project workspace state. The router/URL owns benchmark slug. `useAgchainBenchmarkSteps` composes both. The provider does not become a giant AGChain app-state container.
8. Selection reconciliation is a pure, testable function. The startup/recovery logic for resolving stale localStorage against live backend data is isolated in `reconcileWorkspaceSelection()` with exhaustive unit tests. It is not scattered through effects.

---

## Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. Navigate to `/app/agchain/tools` with cleared localStorage — page shows loading skeleton during bootstrap, then transitions to either "Choose a project" (if no projects exist) or the tools table (if a project resolves).
2. Navigate to `/app/agchain/tools` with stale localStorage pointing to a deleted project — provider detects the mismatch during reconciliation, falls back to first available project or transitions to `no-project`, and the page renders the correct state without split-brain.
3. Select a project in the sidebar switcher — Tools, Datasets, Overview, Settings, and Section pages immediately reflect the selection without page reload and without independent backend fetches.
4. Navigate from Tools to Datasets — both pages show the same focused project (no split-brain).
5. Refresh the browser on any project-scoped page — the last focused project is restored from localStorage hydration.
6. Navigate to `/app/agchain/projects` — the page shows all projects in the currently selected org (from the provider) and indicates which one is focused.
7. Create a new project on the projects page — the provider state updates, the sidebar switcher shows the new project, and the user is navigated to overview without manual refresh.
8. `AgchainOrganizationSwitcher` and `AgchainProjectSwitcher` in the sidebar read from the same provider instance as the page content. There is exactly one workspace state instance per tab.
9. No AGChain route under the shell creates its own workspace state instance. Adapters over the provider are fine. Parallel ownership is not.
10. All existing tests pass without modification except `AgchainWorkspaceSync.test.tsx` (which gets a provider wrapper).

---

## Locked Provider Contract

### Status type

```typescript
type AgchainWorkspaceStatus = 'bootstrapping' | 'no-organization' | 'no-project' | 'ready' | 'error';
```

### Provider context value

```typescript
type AgchainWorkspaceContextValue = {
  // Status layer — authoritative, determines UI behavior
  status: AgchainWorkspaceStatus;
  error: string | null;

  // Collections layer — the full org-scoped lists
  organizations: AgchainOrganizationRow[];
  projects: AgchainProjectRow[];

  // Selection layer — resolved from reconciliation
  selectedOrganization: AgchainOrganizationRow | null;
  selectedOrganizationId: string | null;
  selectedProject: AgchainProjectRow | null;
  selectedProjectId: string | null;

  // Actions — fetch actions return Promise<void>, local-only mutations return void
  setSelectedOrganizationId: (organizationId: string | null) => Promise<void>;
  setSelectedProjectId: (projectId: string | null, projectSlug?: string | null) => void;
  reloadAndSelect: (
    preferredProjectId?: string | null,
    preferredProjectSlug?: string | null,
  ) => Promise<void>;
  reload: () => Promise<void>;
};
```

### Reconciliation function signature

```typescript
type ReconciliationInput = {
  organizations: AgchainOrganizationRow[];
  projects: AgchainProjectRow[];
  preferredOrgId: string | null;
  preferredProjectId: string | null;
  preferredProjectSlug: string | null;
  fetchError: string | null;
};

type ReconciliationResult = {
  status: AgchainWorkspaceStatus;
  selectedOrganizationId: string | null;
  selectedProjectId: string | null;
  error: string | null;
};

function reconcileWorkspaceSelection(input: ReconciliationInput): ReconciliationResult;
```

---

## Locked Hydration Sequence

The provider bootstrap follows this exact order:

1. Provider mounts. Status = `bootstrapping`. All collections empty, all selections null.
2. Read `preferredOrgId` from localStorage.
3. Fetch organizations from `GET /agchain/organizations`.
4. If fetch fails → status = `error`, stop.
5. If no organizations returned → status = `no-organization`, stop.
6. Resolve org: if `preferredOrgId` exists in the returned list, use it; otherwise use first org.
7. Fetch projects from `GET /agchain/projects?organization_id={resolvedOrgId}`.
8. Read `preferredProjectId` and `preferredProjectSlug` from localStorage **now** (after fetch, not at start — this picks up any mid-bootstrap writes from URL-driven focus on OverviewPage).
9. Call `reconcileWorkspaceSelection()` with fetched data + latest localStorage values.
10. Set provider state atomically from reconciliation result.
11. Write resolved selection back to localStorage (persistence).
12. Status transitions to `ready`, `no-project`, or `error` based on reconciliation.

**On organization change** (user selects different org in sidebar):
1. Set new org ID in state.
2. Set status to `bootstrapping` (projects need reload).
3. Fetch projects for new org.
4. Reconcile project selection (preferring first project in new org).
5. Write to localStorage.
6. Transition to `ready` or `no-project`.

**On project change** (user selects different project in sidebar):
1. Set new project ID and slug in state.
2. Status remains `ready` (no re-fetch needed).
3. Write to localStorage.

**On `reloadAndSelect(preferredProjectId, preferredProjectSlug)`** (after project creation or external mutation):
1. Set status to `bootstrapping`.
2. Re-fetch orgs and projects for current org.
3. Reconcile with the preferred values (not localStorage — the caller provides them).
4. Transition atomically. No transient null between select and reload.

---

## Locked URL-Driven Slug Focus Contract

`AgchainOverviewPage` reads `?project=slug` from the URL and calls `setFocusedProjectSlug(slug)`. This is the only URL-driven focus path. It must work in three distinct cases:

**Case 1: Slug selection while provider is bootstrapping.**
The adapter calls `setSelectedProjectId(null, slug)` because projects are not loaded yet and slug cannot be resolved to an ID. The adapter also writes the slug to localStorage via `writeStoredAgchainWorkspaceFocus`. The provider's bootstrap reads localStorage *after* fetches complete (hydration step 8), picks up the written slug, and reconciles against the loaded project list. If the slug matches a project in the resolved org, that project is selected. If not, the provider falls back to the first project.

**Case 2: Slug selection after provider is already `ready`.**
The adapter resolves the slug against the provider's loaded `projects` list (by `project_slug` or `primary_benchmark_slug`). If a match is found, it calls `setSelectedProjectId(match.project_id, match.project_slug)`. Direct and immediate — no localStorage round-trip needed.

**Case 3: Slug does not belong to any project in the current org.**
The slug resolves to no match. The adapter calls `setSelectedProjectId(null, slug)`. The provider ignores a null project ID when status is already `ready` — the current selection is unchanged. The URL param is effectively a no-op. This is intentional: cross-org slug resolution is out of scope for this plan.

---

## Locked UI State Behavior

| Provider status | Page renders | Sidebar renders |
|----------------|--------------|-----------------|
| `bootstrapping` | Loading skeleton (spinner or pulse placeholder) — NOT "Choose a project" | Switchers show stored label or "Loading..." |
| `no-organization` | Organization-level onboarding/selection prompt | Org switcher shows empty state |
| `no-project` | "Choose a project" empty state with link to project registry | Project switcher shows "Select AGChain project" |
| `ready` | Main page content | Switchers show selected org + project |
| `error` | Error message with retry action | Switchers show error indicator + retry |

**Behavioral rule:** While provider status is `bootstrapping`, no page may render the "Choose a project" empty state. That state is reserved exclusively for `no-project`.

---

## Locked Migration Rule

Once the provider lands, no AGChain route under the shell may create its own workspace state instance. The two existing hooks (`useAgchainWorkspaceContext`, `useAgchainProjectFocus`) remain temporarily as adapters over provider state. They preserve the exact same return shapes so that downstream hooks and components continue to work without changes.

Adapters are fine. Parallel ownership is not.

---

## Locked Async Correctness Rule

All async provider flows must be latest-request-wins.

The following actions are async and may overlap:
- initial bootstrap
- `setSelectedOrganizationId`
- `reload`
- `reloadAndSelect`

The provider must prevent stale in-flight responses from overwriting newer state.

Accepted implementation patterns:
- monotonic request sequence / request token guard, or
- `AbortController` cancellation, or
- equivalent latest-request-wins mechanism

Minimum correctness rule:
- only the most recent async request may commit provider state
- only the most recent async request may write resolved selection back to localStorage
- stale responses must be ignored silently

---

## Locked Inventory Counts

### Frontend

- New files: 4 (provider, reconciliation, 2 test files)
- Modified files: 13 (layout, 2 hooks, 1 lib, 7 pages, router, 1 test)
- Unchanged consumer files verified: 7 hooks/components

### Tests

- New test files: 2 (`agchainWorkspaceReconciliation.test.ts`, `AgchainWorkspaceContext.test.tsx`)
- Modified test files: 1 (`AgchainWorkspaceSync.test.tsx`)
- Unchanged test files: all existing page tests that mock `useAgchainProjectFocus` at module level

---

## Locked File Inventory

### New files

- `web/src/contexts/AgchainWorkspaceContext.tsx`
- `web/src/lib/agchainWorkspaceReconciliation.ts`
- `web/src/lib/agchainWorkspaceReconciliation.test.ts`
- `web/src/contexts/AgchainWorkspaceContext.test.tsx`

### Modified files

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/hooks/agchain/useAgchainWorkspaceContext.ts`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/lib/agchainProjectFocus.ts`
- `web/src/pages/agchain/AgchainToolsPage.tsx`
- `web/src/pages/agchain/AgchainDatasetsPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.tsx`
- `web/src/pages/agchain/AgchainSectionPage.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/router.tsx`
- `web/src/components/agchain/AgchainWorkspaceSync.test.tsx`

---

## Explicit Risks Accepted In This Plan

1. **ProjectsPage will show org-scoped projects only.** The current page shows all-org projects. After this refactor it shows the selected org's projects. This is the correct model since the org switcher is always visible in the sidebar, but it is a minor behavioral change.
2. **Adapters add a thin indirection layer.** `useAgchainWorkspaceContext` and `useAgchainProjectFocus` become wrappers over the provider. This is intentional blast-radius containment. Future work can inline them if the indirection becomes a maintenance burden.
3. **The `status` field on `useAgchainProjectFocus` is additive.** Existing test mocks that don't return `status` will get `undefined`. Page code uses `status` checks before null-based fallbacks, so `undefined` status falls through to the null checks correctly. No existing test mock needs to add `status`.
4. **Page-level status rendering is under-tested by existing tests.** Existing page tests mock the hook at module level and never exercise the real status model. The provider integration tests (Task 4) cover the status transitions, and the reconciliation unit tests (Task 2) cover the pure logic, but there is no test that verifies a real page component renders a skeleton for `bootstrapping` vs. an empty state for `no-project`. This is accepted for this plan because the page changes are small (one guard clause each) and visually verifiable. A follow-up plan can add status-aware page integration tests if regressions appear.
5. **Cross-tab sync is a known limitation at rollout.** If a user has two tabs open and switches project in one, the other tab will not update until refreshed. This must be communicated in rollout notes. A `storage` event listener on the provider can be added as a follow-up.

---

## Completion Criteria

The work is complete only when all of the following are true:

1. The provider exists in `AgchainShellLayout` and is the single source of workspace state.
2. Both adapter hooks (`useAgchainWorkspaceContext`, `useAgchainProjectFocus`) consume the provider context, not independent state.
3. All 6 pages + 1 redirect render based on `status`, not null checks.
4. `AgchainProjectsPage` reads from the provider's org-scoped project list.
5. No window custom events are dispatched for within-tab synchronization.
6. The reconciliation function has unit tests covering: normal boot, stale org, stale project, empty orgs, empty projects, fetch error, slug-based recovery.
7. The provider has integration tests covering: bootstrap flow, org switch, project switch, error recovery.
8. All existing tests pass (`npm test -- --run` in `web/`).
9. TypeScript build passes (`npx tsc -b --noEmit` in `web/`).
10. The locked inventory counts match the actual set of created and modified files.

---

## Implementation Tasks

### Phase 1: Foundation

#### Task 1: Write the reconciliation function and types

**File(s):** `web/src/lib/agchainWorkspaceReconciliation.ts`

**Step 1:** Create the file with type exports: `AgchainWorkspaceStatus`, `ReconciliationInput`, `ReconciliationResult`.

**Step 2:** Implement `reconcileWorkspaceSelection()` as a pure function:
- If `fetchError` → return `{ status: 'error', selectedOrganizationId: null, selectedProjectId: null, error: fetchError }`
- If no organizations → return `{ status: 'no-organization', ... }`
- Resolve org: prefer `preferredOrgId` if it exists in the list, else first org
- If no projects → return `{ status: 'no-project', selectedOrganizationId: resolvedOrgId, selectedProjectId: null, ... }`
- Resolve project: prefer `preferredProjectId` by exact ID match, then `preferredProjectSlug` by slug or `primary_benchmark_slug` match, then fall back to first project
- Return `{ status: 'ready', selectedOrganizationId: resolvedOrgId, selectedProjectId: resolvedProject.project_id, error: null }`

**Step 3:** Export `resolveSelectedProject` as a named helper (extracted from current `useAgchainWorkspaceContext.ts` lines 21-43) so the provider and adapters can share it.

**Commit:** `feat: add pure workspace reconciliation function with status model`

---

#### Task 2: Write reconciliation unit tests

**File(s):** `web/src/lib/agchainWorkspaceReconciliation.test.ts`

**Step 1:** Write tests for every status transition:
- `fetchError` present → `error`
- Empty organizations → `no-organization`
- Valid org, empty projects → `no-project`
- Valid org, valid projects, stored IDs match → `ready` with exact match
- Valid org, valid projects, stored org ID is stale → falls back to first org
- Valid org, valid projects, stored project ID is stale → falls back to first project
- Valid org, valid projects, stored project slug matches `primary_benchmark_slug` → resolves correctly
- Valid org, valid projects, no stored IDs → defaults to first org + first project

**Step 2:** Run tests.

**Test command:** `cd web && npx vitest run src/lib/agchainWorkspaceReconciliation.test.ts`
**Expected output:** All tests pass.

**Commit:** `test: add reconciliation function unit tests for all status transitions`

---

#### Task 3: Write the provider and context

**File(s):** `web/src/contexts/AgchainWorkspaceContext.tsx`

**Step 1:** Create the React context with `createContext<AgchainWorkspaceContextValue | null>(null)`.

**Step 2:** Create `useAgchainWorkspace()` consumer hook that throws if used outside the provider (following the `AuthContext` pattern at `web/src/auth/AuthContext.tsx`).

**Step 3:** Implement `AgchainWorkspaceProvider` component:
- Internal state: `status`, `organizations`, `projects`, `selectedOrganizationId`, `selectedProjectId`, `error`
- Implement a latest-request-wins guard for all async provider flows (`bootstrap`, `setSelectedOrganizationId`, `reload`, `reloadAndSelect`). Use a monotonic request token (`useRef<number>`) incremented at the start of every async flow. Before committing state, check that the token matches the current ref value. If stale, discard silently.
- Bootstrap effect: follows the locked hydration sequence exactly and commits state only if its request token is still current.
- `setSelectedOrganizationId` action: async (`Promise<void>`). Sets status to `bootstrapping`, fetches projects for the new org, reconciles, persists, and commits only if its request token is still current. Resolves only after the final provider state is committed (or silently if superseded).
- `setSelectedProjectId` action: synchronous (`void`). Updates selection directly (no re-fetch), persists to localStorage. When status is `ready` and `projectId` is null, the action is a no-op (preserves current selection — see URL slug contract Case 3).
- `reloadAndSelect` action: async (`Promise<void>`). Re-fetches orgs and projects, reconciles with caller-provided preferred values (not localStorage), commits provider state atomically, and resolves only after the final state is committed. Used after project creation to avoid transient null between select and reload.
- `reload` action: async (`Promise<void>`). Re-runs the full bootstrap sequence using localStorage preferences and resolves only after the final state is committed.
- Derived values: `selectedOrganization` and `selectedProject` computed via `useMemo` from IDs + collections

**Step 4:** Export `AgchainWorkspaceProvider`, `useAgchainWorkspace`, `AgchainWorkspaceStatus` type.

**Commit:** `feat: add AgchainWorkspaceProvider with reconciliation-based bootstrap`

---

#### Task 4: Write provider integration tests

**File(s):** `web/src/contexts/AgchainWorkspaceContext.test.tsx`

**Step 1:** Mock `fetchAgchainOrganizations` and `fetchAgchainProjects` at module level (same pattern as `AgchainWorkspaceSync.test.tsx`).

**Step 2:** Write a `ProviderProbe` test component that reads `useAgchainWorkspace()` and renders status, org, and project.

**Step 3:** Write tests:
- Bootstrap with valid org + project → status transitions from `bootstrapping` to `ready`
- Bootstrap with no orgs → status = `no-organization`
- Bootstrap with org but no projects → status = `no-project`
- Bootstrap with fetch error → status = `error`
- Org switch → projects reload, status transitions through `bootstrapping` to `ready`
- Project switch → immediate update, no re-fetch
- Stale localStorage → falls back correctly
- Rapid org switch (two switches before first completes) → only the second org's result commits, first is discarded (stale-request guard)

**Test command:** `cd web && npx vitest run src/contexts/AgchainWorkspaceContext.test.tsx`
**Expected output:** All tests pass.

**Commit:** `test: add provider integration tests for bootstrap and selection flows`

---

#### Task 5: Mount the provider in AgchainShellLayout

**File(s):** `web/src/components/layout/AgchainShellLayout.tsx`

**Step 1:** Import `AgchainWorkspaceProvider` from `@/contexts/AgchainWorkspaceContext`.

**Step 2:** Wrap the existing JSX tree (everything inside the root `<div>`) with `<AgchainWorkspaceProvider>`. The provider must wrap both the sidebar (which contains the switchers) and the `<main>` (which contains `<Outlet />`), so all consumers share one instance.

**Step 3:** Run TypeScript check.

**Test command:** `cd web && npx tsc -b --noEmit`
**Expected output:** No errors.

**Commit:** `feat: mount AgchainWorkspaceProvider in AgchainShellLayout`

---

#### Task 6: Convert useAgchainWorkspaceContext to adapter

**File(s):** `web/src/hooks/agchain/useAgchainWorkspaceContext.ts`

**Step 1:** Replace the entire hook body. Remove all `useState`, `useCallback`, `useEffect`, and `useMemo` calls. Remove the `resolveSelectedProject` helper (now lives in the reconciliation module).

**Step 2:** Import `useAgchainWorkspace` from `@/contexts/AgchainWorkspaceContext`.

**Step 3:** The adapter calls `useAgchainWorkspace()` and returns an object matching the current return shape exactly:
```typescript
export function useAgchainWorkspaceContext() {
  const ctx = useAgchainWorkspace();
  return {
    organizations: ctx.organizations,
    projects: ctx.projects,
    loading: ctx.status === 'bootstrapping',
    error: ctx.error,
    selectedOrganizationId: ctx.selectedOrganizationId,
    selectedOrganization: ctx.selectedOrganization,
    selectedProjectId: ctx.selectedProjectId,
    selectedProject: ctx.selectedProject,
    setSelectedOrganizationId: ctx.setSelectedOrganizationId,
    setSelectedProjectId: ctx.setSelectedProjectId,
    reload: ctx.reload,
  };
}
```

**Step 4:** Remove imports of `fetchAgchainOrganizations`, `fetchAgchainProjects`, `AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT`, `AGCHAIN_PROJECT_LIST_CHANGED_EVENT`, `readStoredAgchainOrganizationFocusId`, `readStoredAgchainProjectFocusId`, `readStoredAgchainProjectFocusSlug`, `setStoredAgchainWorkspaceFocus`, `writeStoredAgchainWorkspaceFocus`.

**Step 5:** Run TypeScript check.

**Test command:** `cd web && npx tsc -b --noEmit`
**Expected output:** No errors.

**Commit:** `refactor: convert useAgchainWorkspaceContext to thin provider adapter`

---

#### Task 7: Convert useAgchainProjectFocus to adapter

**File(s):** `web/src/hooks/agchain/useAgchainProjectFocus.ts`

**Step 1:** Replace the hook body. Import `useAgchainWorkspace` from `@/contexts/AgchainWorkspaceContext`.

**Step 2:** The adapter reads from the provider and returns the current shape plus `status`:
```typescript
export function useAgchainProjectFocus() {
  const ctx = useAgchainWorkspace();
  // ... transform projects to AgchainFocusedProjectRow (keep toFocusedProjectRow helper)
  // ... derive focusedProject, focusedProjectSlug, items

  const setFocusedProjectSlug = useCallback((slug: string | null) => {
    if (!slug) {
      ctx.setSelectedProjectId(null);
      return;
    }
    // Case 2 (ready): resolve slug against loaded projects
    const match = ctx.projects.find(
      (p) => p.project_slug === slug || p.primary_benchmark_slug === slug,
    );
    if (match) {
      ctx.setSelectedProjectId(match.project_id, match.project_slug);
      return;
    }
    // Case 1 (bootstrapping): write slug to localStorage for reconciliation pickup
    // Case 3 (ready, no match): no-op on provider state — slug is unknown in current org
    if (ctx.status === 'bootstrapping') {
      writeStoredAgchainWorkspaceFocus({
        focusedProjectSlug: slug,
      });
    }
  }, [ctx]);

  return {
    items,
    loading: ctx.status === 'bootstrapping',
    error: ctx.error,
    status: ctx.status,              // NEW additive field
    focusedProjectSlug,
    focusedProject,
    setFocusedProjectSlug,
    reload: ctx.reload,
  };
}
```

**Step 3:** Keep the `toFocusedProjectRow` helper and `AgchainFocusedProjectRow` type export. Keep the `AGCHAIN_PROJECT_FOCUS_STORAGE_KEY` re-export (used by `AgchainBenchmarkWorkbenchPage`).

**Step 4:** Remove dependency on `useAgchainWorkspaceContext` — replace with `useAgchainWorkspace` directly.

**Step 5:** Remove the `pendingLegacySlug` state and its effect. The provider handles slug persistence via localStorage write-through, so legacy slug recovery is handled by the reconciliation function during bootstrap.

**Step 6:** Run TypeScript check.

**Test command:** `cd web && npx tsc -b --noEmit`
**Expected output:** No errors.

**Commit:** `refactor: convert useAgchainProjectFocus to provider adapter with status field`

---

#### Task 8: Fix dead code and simplify agchainProjectFocus.ts

**File(s):** `web/src/lib/agchainProjectFocus.ts`

**Step 1:** Fix the dead code bug on lines 89-91. `setStoredAgchainProjectFocusSlug` has `return` before `broadcastAgchainProjectFocusChanged(slug)`. Either remove the unreachable broadcast or remove the early return. Since events are being removed as the primary sync mechanism, remove the broadcast.

**Step 2:** Remove `broadcastAgchainProjectFocusChanged` function (no longer called within-tab).

**Step 3:** Remove `broadcastAgchainProjectListChanged` function (no longer called within-tab).

**Step 4:** Remove `setStoredAgchainWorkspaceFocus` function (the provider calls `writeStoredAgchainWorkspaceFocus` directly).

**Step 5:** Remove `AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT` and `AGCHAIN_PROJECT_LIST_CHANGED_EVENT` constants.

**Step 6:** Keep: `readStoredAgchainOrganizationFocusId`, `readStoredAgchainProjectFocusId`, `readStoredAgchainProjectFocusSlug`, `writeStoredAgchainWorkspaceFocus`, `writeStoredAgchainProjectFocusSlug`, `AGCHAIN_PROJECT_FOCUS_STORAGE_KEY`, `AGCHAIN_PROJECT_FOCUS_ID_STORAGE_KEY`, `AGCHAIN_ORGANIZATION_FOCUS_STORAGE_KEY`, `AgchainProjectFocusDetail` type.

**Step 7:** Verify no remaining imports of removed exports across the codebase.

**Test command:** `cd web && npx tsc -b --noEmit`
**Expected output:** No errors.

**Commit:** `fix: remove dead code and event broadcasts from agchainProjectFocus`

---

#### Task 9: Validate switchers and run full test suite

**Step 1:** Run the workspace sync test first — this is the earliest validation that the unchanged switcher components work correctly with the provider:

**Test command:** `cd web && npx vitest run src/components/agchain/AgchainWorkspaceSync.test.tsx`
**Expected output:** If it passes, the "unchanged switchers" assumption is confirmed. If it fails because components now require the provider wrapper, proceed to Task 16 immediately (add provider wrapper to this test), then return here.

**Step 2:** Run all web tests.

**Test command:** `cd web && npx vitest run`
**Expected output:** All tests pass. No regressions.

**Step 3:** Run TypeScript check.

**Test command:** `cd web && npx tsc -b --noEmit`
**Expected output:** No errors.

**Step 4:** If any test failures beyond the workspace sync test, diagnose and fix before proceeding to Phase 2.

**Commit:** Only if fixes were needed: `fix: resolve test regressions from provider migration`

---

### Phase 2: Status-Based Rendering

#### Task 10: Update AgchainIndexRedirect in router.tsx

**File(s):** `web/src/router.tsx`

**Step 1:** In the `AgchainIndexRedirect` component (lines 94-106), replace the existing `loading` + null check with full status routing:
```tsx
const { focusedProject, status } = useAgchainProjectFocus();

if (status === 'bootstrapping') {
  return <div className="flex min-h-full items-center justify-center bg-background px-6 py-12 text-sm text-muted-foreground">Loading AGChain project context...</div>;
}

if (status === 'ready' && focusedProject) {
  return <Navigate to="/app/agchain/overview" replace />;
}

// no-organization, no-project, and error all land on the projects registry surface
return <Navigate to="/app/agchain/projects" replace />;
```

**Commit:** `refactor: use status-based rendering in AgchainIndexRedirect`

---

#### Task 11: Update AgchainToolsPage

**File(s):** `web/src/pages/agchain/AgchainToolsPage.tsx`

**Step 1:** The page gets `focusedProject` from `useAgchainTools()` which internally uses `useAgchainProjectFocus()`. Import `useAgchainProjectFocus` directly for `status`, or thread `status` through `useAgchainTools`.

Preferred approach: import `useAgchainProjectFocus` alongside `useAgchainTools` for the status check:
```tsx
const { status } = useAgchainProjectFocus();
```

**Step 2:** Replace the existing null-based guard (line 107) with the full provider status contract:
- `bootstrapping` → loading skeleton
- `error` → retryable workspace error state (with `reload` from provider)
- `no-organization` → organization onboarding/selection prompt
- `no-project` or `!focusedProject` → existing "Choose a project" empty state
- `ready` → main page content

**Commit:** `refactor: status-based rendering in AgchainToolsPage`

---

#### Task 12: Update AgchainDatasetsPage

**File(s):** `web/src/pages/agchain/AgchainDatasetsPage.tsx`

**Step 1:** Destructure `status` and `reload` alongside `focusedProject` from `useAgchainProjectFocus()` (already imported on line 7).

**Step 2:** Replace the existing null-based guard (line 34) with the full provider status contract:
- `bootstrapping` → loading skeleton
- `error` → retryable workspace error state (with `reload`)
- `no-organization` → organization onboarding/selection prompt
- `no-project` or `!focusedProject` → existing "Choose a project" empty state
- `ready` → main page content

**Commit:** `refactor: status-based rendering in AgchainDatasetsPage`

---

#### Task 13: Update AgchainBenchmarksPage

**File(s):** `web/src/pages/agchain/AgchainBenchmarksPage.tsx`

**Step 1:** The page uses `useAgchainBenchmarkSteps()` which exposes `focusedProject` and `loading`. Add `status` — either thread it through the benchmark hook or import `useAgchainProjectFocus` directly.

Preferred: import `useAgchainProjectFocus` for status only:
```tsx
const { status } = useAgchainProjectFocus();
```

**Step 2:** Replace the existing guard (line 56) with the full provider status contract:
- `bootstrapping` → loading skeleton
- `error` → retryable workspace error state (with `reload`)
- `no-organization` → organization onboarding/selection prompt
- `no-project` or `!hasProjectFocus` → existing "Choose a project" empty state
- `ready` → main page content

**Commit:** `refactor: status-based rendering in AgchainBenchmarksPage`

---

#### Task 14: Update AgchainOverviewPage, AgchainSettingsPage, and AgchainSectionPage

**File(s):**
- `web/src/pages/agchain/AgchainOverviewPage.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.tsx`
- `web/src/pages/agchain/AgchainSectionPage.tsx`

All three follow the same pattern: `if (!loading && !focusedProject)`.

**Step 1:** In each file, destructure `status` and `reload` from `useAgchainProjectFocus()`.

**Step 2:** Replace the existing guard in each file with the full provider status contract:
- `bootstrapping` → loading skeleton
- `error` → retryable workspace error state (with `reload`)
- `no-organization` → organization onboarding/selection prompt
- `no-project` or `!focusedProject` → existing "Choose a project" empty state
- `ready` → main page content

**Step 3:** In `AgchainOverviewPage`, keep the existing URL-driven focus effect (`useEffect` on `requestedProjectSlug`). The adapter's `setFocusedProjectSlug` writes to localStorage during bootstrap and resolves directly when ready (see Locked URL-Driven Slug Focus Contract).

**Commit:** `refactor: status-based rendering in Overview, Settings, and Section pages`

---

### Phase 3: Unify ProjectsPage

#### Task 15: Refactor AgchainProjectsPage to use provider

**File(s):** `web/src/pages/agchain/AgchainProjectsPage.tsx`

**Step 1:** Import `useAgchainWorkspace` from `@/contexts/AgchainWorkspaceContext` (or use `useAgchainWorkspaceContext` adapter — either works).

**Step 2:** Remove the local `useEffect` that calls `fetchAgchainProjects()` directly (lines 30-56). Remove the local `items`, `loading`, `error` state.

**Step 3:** Read `projects`, `status`, `error`, `selectedProjectId` from the provider:
```tsx
const { projects, status, error, selectedProjectId, reloadAndSelect } = useAgchainWorkspace();
```

**Step 4:** `AgchainProjectsPage` must explicitly render:
- `bootstrapping` → loading state in the table body
- `error` → retryable failure state (with `reload`)
- `no-organization` → organization onboarding/selection prompt (no project table shown)
- `ready` / `no-project` → project table with `projects` rows (table may be empty for `no-project`)

**Step 5:** In `handleCreateProject`, after successful API call:
- Call `await reloadAndSelect(result.project_id, result.project_slug)` — this re-fetches the project list (which now includes the new project), then selects it atomically. No transient null between select and reload.
- Navigate to overview after `reloadAndSelect` completes.

**Step 6:** Remove imports of `broadcastAgchainProjectListChanged`, `setStoredAgchainWorkspaceFocus` from `agchainProjectFocus`. The provider handles persistence.

**Step 7:** Optionally: highlight the currently focused project in the table (using `selectedProjectId` from provider).

**Commit:** `refactor: unify AgchainProjectsPage with workspace provider`

---

### Phase 4: Cleanup and Verification

#### Task 16: Update AgchainWorkspaceSync.test.tsx

**File(s):** `web/src/components/agchain/AgchainWorkspaceSync.test.tsx`

**Step 1:** Import `AgchainWorkspaceProvider` from `@/contexts/AgchainWorkspaceContext`.

**Step 2:** Wrap the test render with the provider:
```tsx
render(
  <MemoryRouter>
    <AgchainWorkspaceProvider>
      <AgchainOrganizationSwitcher />
      <AgchainProjectSwitcher />
      <FocusProbe />
    </AgchainWorkspaceProvider>
  </MemoryRouter>,
);
```

**Step 3:** The test mocks `fetchAgchainOrganizations` and `fetchAgchainProjects` at module level — these mocks are consumed by the provider. The test logic should remain the same: verify that org switching updates the project switcher and focus probe.

**Test command:** `cd web && npx vitest run src/components/agchain/AgchainWorkspaceSync.test.tsx`
**Expected output:** Test passes.

**Commit:** `test: wrap AgchainWorkspaceSync test with provider`

---

#### Task 17: Verify no remaining direct event usage

**Step 1:** Search the codebase for any remaining references to `AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT` or `AGCHAIN_PROJECT_LIST_CHANGED_EVENT`:
```
grep -r "AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT\|AGCHAIN_PROJECT_LIST_CHANGED_EVENT" web/src/
```

**Step 2:** Search for any remaining references to `broadcastAgchainProjectFocusChanged` or `broadcastAgchainProjectListChanged`:
```
grep -r "broadcastAgchain" web/src/
```

**Step 3:** If any references remain, remove them or update the imports.

**Commit:** Only if cleanup was needed: `chore: remove remaining event broadcast references`

---

#### Task 18: Final verification

**Step 1:** Run full TypeScript check.

**Test command:** `cd web && npx tsc -b --noEmit`
**Expected output:** No errors.

**Step 2:** Run full test suite.

**Test command:** `cd web && npx vitest run`
**Expected output:** All tests pass.

**Step 3:** Verify inventory counts match:
- New files: 4
- Modified files: 13
- No unexpected files created or changed

**Step 4:** Verify the locked acceptance contract by manual walkthrough or by reading the final code state against each acceptance criterion.

**Commit:** Final commit only if late fixes were needed.

---

## Frozen Seam Contract

### Adapter compatibility

The current hook return shapes are frozen for this phase:

**`useAgchainWorkspaceContext()` returns:**
`{ organizations, projects, loading, error, selectedOrganizationId, selectedOrganization, selectedProjectId, selectedProject, setSelectedOrganizationId, setSelectedProjectId, reload }`

**`useAgchainProjectFocus()` returns:**
`{ items, loading, error, focusedProjectSlug, focusedProject, setFocusedProjectSlug, reload }` — plus the new additive `status` field.

Do not change these shapes in this phase. Downstream hooks (`useAgchainTools`, `useAgchainDatasets`, `useAgchainDatasetDetail`, `useAgchainDatasetDraft`, `useAgchainBenchmarkSteps`) and components (`AgchainProjectSwitcher`, `AgchainOrganizationSwitcher`) depend on these exact signatures.

### localStorage keys

The following localStorage keys are preserved:
- `agchain.organizationFocusId`
- `agchain.projectFocusId`
- `agchain.projectFocusSlug`

Users with existing localStorage will have their selections restored by the provider's hydration sequence without manual intervention.

### URL-driven focus

`AgchainOverviewPage` reads `?project=` from the URL and calls `setFocusedProjectSlug`. This path must continue to work. The adapter writes the slug to localStorage, and the provider reads the latest localStorage values during reconciliation (step 8 of the hydration sequence).
