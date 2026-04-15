# Frontend Foundation Audit Report

## Summary

| Metric | Value |
|---|---|
| Shell regions | 4 |
| Token sources | 4 |
| Component roles | 4 |
| Page patterns | 5 |
| Conflict bundles | 4 |
| Quick wins | 1 |
| Clean areas | 3 |
| Sampling mode | sampled |

## Scope

- Repo: `writing-system/web`
- Audit date: 2026-04-14
- Captures reviewed: none
- Token files reviewed: `web/src/lib/styleTokens.ts`, `web/src/lib/toolbar-contract.ts`, `web/src/theme.css`, `web/src/tailwind.css`
- Major directories: web/src/components/admin, web/src/components/layout, web/src/components/superuser, web/src/components/flows, web/src/components/blocks, web/src/hooks, web/src/hooks/query, web/src/lib, web/src/pages/superuser
- Exclusions: web/src/pages/agchain, web/src/pages/marketing, services/platform-api
- Surface area: 37 shell, 12 token, 301 shared components, 227 pages
- Sampling: sampled -- Audit centered on the admin/superuser shell and the state/loading patterns driving reported regressions. FlowWorkbench and BlockViewerGridRDG were sampled as comparison points for existing persistence approaches instead of exhaustively auditing every route.

## Shell Ownership Map

| Region | Owner File(s) | Runtime Role | State Owner | Clarity |
|---|---|---|---|---|
| top-band | web/src/components/layout/AdminShellTopBand.tsx, web/src/components/layout/AdminShellLayout.tsx | Shared admin and superuser top chrome with nav toggle and shell framing. | web/src/components/layout/AdminShellLayout.tsx | clear |
| primary-left-rail | web/src/components/layout/AdminShellLayout.tsx, web/src/components/shell/LeftRailShadcn.tsx | Primary admin and superuser navigation rail with persisted width and open/closed state. | web/src/components/layout/AdminShellLayout.tsx | clear |
| secondary-left-rail | web/src/components/admin/AdminLeftNav.tsx | Secondary navigation rail placeholder for admin and superuser subsections. | -- | clear |
| superuser-inner-page-frame | web/src/components/superuser/ControlTowerV2PageFrame.tsx, web/src/components/common/WorkbenchPage.tsx | Page-local header, padding, and action framing inside the shared admin shell. | -- | conflicting |

### Shell Notes

- **top-band:** Top-band height and nav-open state are centralized in the shell layout.
- **primary-left-rail:** Shell width and visibility persist through localStorage keys owned by AdminShellLayout.
- **secondary-left-rail:** The secondary rail exists structurally but `getSecondaryNav()` currently returns no items.
- **superuser-inner-page-frame:** Superuser home uses the dense local frame while Coordination Runtime uses WorkbenchPage, so inner framing and loading posture differ by route.

## Navigation and Rail Structure

### Primary Navigation
web/src/components/admin/AdminLeftNav.tsx, web/src/components/layout/AdminShellLayout.tsx, web/src/router.tsx

### Secondary Navigation
None identified.

### Route Mapping
Superuser routes are lazy-loaded children of AdminShellLayout under `/app/superuser`. The homepage mounts `SuperuserControlTower`, with dedicated detail routes for readiness, coordination runtime, plan tracker, and demo surfaces.

### Breadcrumb Conventions
Most superuser pages use `useShellHeaderTitle` to populate shell breadcrumbs, but the integrated control tower hides the shared header and renders its own local page frame instead.

### Action Placement
Primary actions live inside page-local headers or panel toolbars rather than in the shared shell. Control tower cards also expose drill actions inline.

- [evidence] web/src/router.tsx:431-449
- [evidence] web/src/components/admin/AdminLeftNav.tsx:41-101
- [evidence] web/src/pages/superuser/SuperuserControlTower.tsx:298-353
- [evidence] web/src/pages/superuser/CoordinationRuntime.tsx:487-594

## Token and Theme Inventory

| Source | File(s) | Semantic | Raw Values | Light | Dark | Drift Notes |
|---|---|---|---|---|---|---|
| Global shell and layout tokens | web/src/lib/styleTokens.ts | yes | yes | partial | partial | The file mixes semantic shell tokens with raw grid color hex values, so some UI layers consume semantic CSS vars while others still read hard-coded palette values. |
| Theme variable layers | web/src/theme.css, web/src/tailwind.css | yes | no | full | full | These files define the semantic CSS-variable surface that the shell and newer superuser components are expected to use. |
| Toolbar interaction contract | web/src/lib/toolbar-contract.ts | yes | no | full | full | Interaction styling is centralized here and reused cleanly by the integrated control tower frame. |
| AG Grid and editor-specific theme layers | web/src/lib/agGridTheme.ts, web/src/lib/codemirrorTheme.ts, web/src/hooks/useMonacoTheme.ts | yes | yes | partial | partial | Specialized surfaces keep their own theme adapters, which increases drift risk when page components bypass shared semantic tokens. |

## Component Contract Inventory

| Role | Canonical Candidate(s) | Competing | Owner File(s) | State Coverage |
|---|---|---|---|---|
| admin-shell-layout | web/src/components/layout/AdminShellLayout.tsx | -- | web/src/components/layout/AdminShellLayout.tsx | default, nav-collapsed, secondary-rail-present, secondary-rail-absent |
| superuser-page-frame | web/src/components/superuser/ControlTowerV2PageFrame.tsx | web/src/components/common/WorkbenchPage.tsx | web/src/pages/superuser/SuperuserControlTower.tsx, web/src/pages/superuser/CoordinationRuntime.tsx | default, header-actions, dense-operator-layout, no-header |
| operator-plane-card | web/src/components/superuser/PlatformPlaneCardV2.tsx | web/src/components/superuser/PlatformPlaneCard.tsx | web/src/pages/superuser/SuperuserControlTower.tsx | default, selected, drill-link, tone-healthy, tone-watch, tone-alert, tone-muted |
| operational-readiness-check-surface | web/src/components/superuser/OperationalReadinessCheckGrid.tsx | -- | web/src/pages/superuser/SuperuserOperationalReadiness.tsx, web/src/pages/superuser/SuperuserControlTower.tsx | default, warn, fail, detail-loading, detail-error, verify-in-flight, backend-action |

## Page Pattern Inventory

| Pattern | Strongest Example | Competing Examples | Structure Notes |
|---|---|---|---|
| operator-homepage | web/src/pages/superuser/SuperuserControlTower.tsx | -- | Five dense plane cards at the top, with only the browser-state plane pulling down detailed readiness content on demand. |
| operator-detail-runtime | web/src/pages/superuser/CoordinationRuntime.tsx | web/src/pages/superuser/CoordinationRuntimeMock.tsx | Standalone runtime workspace with status header, identity table, inspector, discussion queue, and live event stream. |
| dedicated-readiness-audit-page | web/src/pages/superuser/SuperuserOperationalReadiness.tsx | web/src/pages/superuser/SuperuserControlTower.tsx | Dedicated page reusing the readiness grid, bootstrap panel, recovery panel, and refresh action. |
| stateful-workbench | web/src/components/flows/FlowWorkbench.tsx | -- | Multi-pane workbench with persisted pane layout, persisted virtual folders, selected-doc handoff, and nested preview loading states. |
| grid-review-surface | web/src/components/blocks/BlockViewerGridRDG.tsx | -- | High-state grid surface with many persisted view preferences, stable row selection, and local restoration of grid settings. |

## State-Presentation Inventory

### Loading

Loading is mostly page-local and all-or-nothing. `CoordinationRuntime` waits for status, identities, and discussions before rendering the live panel, while `useOperationalReadiness` owns its own `loading` and `refreshing` booleans and reruns bootstrap probes on mount and refresh.

### Empty

Empty states are mostly inline text inside each panel, such as no identities, no discussions, or no recent events.

### Error

Errors are presented through page-local components and strings: `ErrorAlert` on the runtime page, bootstrap/recovery panels on readiness surfaces, and inline error messages on detail grids.

### Success

Success is shown through counts, timestamps, and status chips instead of dedicated success surfaces.

### Permission

Permission is handled at the route level through `SuperuserGuard`, while readiness bootstrap diagnostics separately surface missing or rejected auth states.

### Async / Polling

Long-running async behavior is split between manual refresh handlers and an SSE stream hook with reconnect logic, but the live stream is mounted only after the initial runtime page bootstrap completes.

- [evidence] web/src/pages/superuser/CoordinationRuntime.tsx:493-590
- [evidence] web/src/hooks/useOperationalReadiness.ts:108-265
- [evidence] web/src/hooks/useCoordinationStream.ts:67-174
- [evidence] web/src/components/flows/FlowWorkbench.tsx:619-680
- [evidence] web/src/router.tsx:431-449
- [evidence] web/src/lib/platformApiDiagnostics.ts:112-201

## Accessibility and Mode-Consistency Notes

- Primary navigation and runtime selection controls do use semantic state attributes such as `aria-current` and `aria-pressed`, which gives the shell a usable baseline. Evidence: `web/src/components/admin/AdminLeftNav.tsx:137-153`, `web/src/pages/superuser/CoordinationRuntime.tsx:237-245`.
- Several operator surfaces still rely heavily on color-and-count combinations to communicate health. They include text labels, but the distinction between healthy/watch/alert is still visually dominant and could use a stronger non-color hierarchy. Evidence: `web/src/pages/superuser/CoordinationRuntime.tsx:19-33`, `web/src/components/superuser/PlatformPlaneCardV2.tsx`.

## Quick Wins

| Bundle | Role | Est. Files | Recommended Direction |
|---|---|---|---|
| volatile-selection-keys | How runtime inspector selection survives refreshes and live updates | 3 | Switch runtime selection to a stable domain key such as `host + lease_identity` or `host + session_agent_id`, and persist the selected inspector target at the page composition layer so it only clears when the entity actually disappears. |

## Conflict Bundles

### Bundle: superuser-data-orchestration

**Role under dispute:** Canonical fetch and cache contract for superuser runtime and readiness data

**Effort level:** moderate (~8 files)

**Competing implementations:**
1. **React Query superuser family** (web/src/hooks/query/useOperationalReadinessSnapshotQuery.ts, web/src/hooks/query/useCoordinationStatusQuery.ts, web/src/hooks/query/useCoordinationIdentitiesQuery.ts, web/src/hooks/query/useCoordinationDiscussionsQuery.ts, web/src/lib/queryKeys/superuserKeys.ts) -- Shared cache keys, staleTime policy, and a route-independent query family for superuser surfaces.
2. **Local hook and page orchestration** (web/src/hooks/useOperationalReadiness.ts, web/src/pages/superuser/CoordinationRuntime.tsx) -- Self-contained page bootstrap, refresh, and mutation orchestration without depending on a shared query layer.

**Evidence:**
- [evidence] web/src/hooks/query/useOperationalReadinessSnapshotQuery.ts:1-39
- [evidence] web/src/hooks/query/useCoordinationStatusQuery.ts:1-16
- [evidence] web/src/hooks/query/useCoordinationIdentitiesQuery.ts:1-19
- [evidence] web/src/hooks/query/useCoordinationDiscussionsQuery.ts:1-23
- [evidence] web/src/lib/queryKeys/superuserKeys.ts:29-37
- [evidence] web/src/hooks/useOperationalReadiness.ts:141-265
- [evidence] web/src/pages/superuser/CoordinationRuntime.tsx:501-531

**Why no single contract exists:** The repo already has a query-key namespace and dedicated React Query hooks, but the live readiness and coordination pages bypass them. As a result, cache policy, reuse, refresh behavior, and page remount costs differ by surface.

**Recommended direction:** Make the React Query family plus `superuserKeys` the single read contract for readiness and coordination summaries. Keep page-level hooks only for mutations and SSE, and let pages render partial cached data before detail fetches complete.

**Discussion questions:**
1. Should readiness bootstrap diagnostics be folded into the main cached readiness query, or kept as a smaller preflight query that hydrates the main snapshot query?
2. Which superuser surfaces are allowed to block on a full multi-request bootstrap, and which must render from cached summary data first?

### Bundle: volatile-selection-keys

**Role under dispute:** How runtime inspector selection survives refreshes and live updates

**Effort level:** quick-win (~3 files)

**Competing implementations:**
1. **Volatile runtime row identity** (web/src/pages/superuser/CoordinationRuntime.tsx) -- Uniqueness for rendered identity rows by combining host, identity, revision, timestamps, and index.
2. **Stable context-keyed persistence** (web/src/components/layout/AdminShellLayout.tsx, web/src/components/flows/FlowWorkbench.tsx, web/src/components/blocks/BlockViewerGridRDG.tsx) -- Preferences and selections keyed to stable route or project context so state survives remounts and refreshes.

**Evidence:**
- [evidence] web/src/pages/superuser/CoordinationRuntime.tsx:74-81
- [evidence] web/src/pages/superuser/CoordinationRuntime.tsx:533-552
- [evidence] web/src/components/layout/AdminShellLayout.tsx:10-29
- [evidence] web/src/components/flows/FlowWorkbench.tsx:257-466
- [evidence] web/src/components/blocks/BlockViewerGridRDG.tsx:109-315

**Why no single contract exists:** The runtime page keys selection off volatile transport fields like revision and row index, while other complex surfaces persist state using stable storage keys tied to durable context. That makes runtime inspector state reset even when the user is still looking at the same logical identity.

**Recommended direction:** Switch runtime selection to a stable domain key such as `host + lease_identity` or `host + session_agent_id`, and persist the selected inspector target at the page composition layer so it only clears when the entity actually disappears.

**Discussion questions:**
1. Which field is the canonical stable identity for a runtime row: `lease_identity`, `session_agent_id`, or a composite of both?
2. Should inspector selection persist in session storage, the URL, or a route-scoped store?

### Bundle: persistence-ownership-scatter

**Role under dispute:** Where client-only operator state should live and persist

**Effort level:** architectural (~12 files)

**Competing implementations:**
1. **Page-local localStorage readers and writers** (web/src/components/layout/AdminShellLayout.tsx, web/src/components/flows/FlowWorkbench.tsx, web/src/components/blocks/BlockViewerGridRDG.tsx) -- Immediate persistence of UI preferences and workspace layout without shared abstractions.
2. **Ephemeral page-local React state** (web/src/pages/superuser/SuperuserControlTower.tsx, web/src/pages/superuser/CoordinationRuntime.tsx, web/src/hooks/useOperationalReadiness.ts) -- Simple local control for expanded panels, browser-state cards, selections, and detail state, but resets on remount.
3. **Unused central superuser UI slice** (web/src/stores/useSuperuserControlTowerStore.ts, web/src/components/superuser/ControlTowerStateQueryPanel.tsx, web/src/components/superuser/PlatformPlanesStrip.tsx) -- A centralized store for selected plane, collapsed groups, and panel visibility that the integrated live page no longer uses.

**Evidence:**
- [evidence] web/src/components/layout/AdminShellLayout.tsx:10-29
- [evidence] web/src/components/flows/FlowWorkbench.tsx:605-617
- [evidence] web/src/components/flows/FlowWorkbench.tsx:1371-1391
- [evidence] web/src/components/blocks/BlockViewerGridRDG.tsx:754-870
- [evidence] web/src/pages/superuser/SuperuserControlTower.tsx:304-351
- [evidence] web/src/pages/superuser/CoordinationRuntime.tsx:417-419
- [evidence] web/src/hooks/useOperationalReadiness.ts:108-117
- [evidence] web/src/stores/useSuperuserControlTowerStore.ts:1-92
- [evidence] web/src/components/superuser/ControlTowerStateQueryPanel.tsx:1-149

**Why no single contract exists:** The repo persists some UI state aggressively, leaves other state ephemeral, and still carries an older centralized store that is no longer the live path. Users therefore get different persistence behavior across pages even when the mental model is similar.

**Recommended direction:** Choose a thin shared policy for operator UI state at the composition layer: which state is session-scoped, which is cross-session, and which should reset. Then either remove the unused superuser slice or intentionally reinstate it behind that policy instead of mixing all three models.

**Discussion questions:**
1. Which categories of operator state must persist only for the current session, and which should survive browser restarts?
2. Is Zustand still the intended home for superuser UI state, or should a smaller route-scoped persistence utility replace it?

### Bundle: superuser-page-frame-and-loading-contract

**Role under dispute:** How superuser pages should frame content and stage async loading

**Effort level:** architectural (~9 files)

**Competing implementations:**
1. **Integrated control-tower dense frame** (web/src/pages/superuser/SuperuserControlTower.tsx, web/src/components/superuser/ControlTowerV2PageFrame.tsx) -- Card-first operator homepage with pull-down detail and explicit drill links.
2. **Workbench-style runtime page** (web/src/pages/superuser/CoordinationRuntime.tsx) -- Standalone workspace with identity list, inspector, discussion queue, and live stream.
3. **Dedicated readiness audit page** (web/src/pages/superuser/SuperuserOperationalReadiness.tsx) -- Full-page readiness detail surface with refresh and recovery controls.

**Evidence:**
- [evidence] web/src/pages/superuser/SuperuserControlTower.tsx:304-353
- [evidence] web/src/components/superuser/ControlTowerV2PageFrame.tsx:1-68
- [evidence] web/src/pages/superuser/CoordinationRuntime.tsx:493-590
- [evidence] web/src/pages/superuser/SuperuserOperationalReadiness.tsx:17-102
- [evidence] web/src/hooks/useCoordinationStream.ts:67-174

**Why no single contract exists:** The homepage already advertises a selective, operator-first loading posture, but the standalone runtime page still boots three requests before showing the live panel and the readiness page duplicates the same snapshot hook logic. Frame choice, partial rendering rules, and refresh semantics vary by route.

**Recommended direction:** Standardize superuser operator pages on one headless data/view-model and one async contract: cached summary first, detail panes second, live stream independent of summary fetch, and page frames chosen intentionally rather than by route history.

**Discussion questions:**
1. Should dedicated detail pages and the homepage pull-down share the same headless view-model and cache layer?
2. What is the explicit rule for when a live stream may mount independently of status and detail fetches?

## Clean Areas

### Admin shell chrome persistence

Nav width and nav-open state have a single clear owner in `AdminShellLayout`, and the persistence keys are stable and bounded.

- [evidence] web/src/components/layout/AdminShellLayout.tsx:10-29
- [evidence] web/src/components/layout/AdminShellLayout.tsx:45-88

### Toolbar button contract

Toolbar interaction styling is centralized in `toolbar-contract.ts` and applied cleanly by the integrated control-tower frame instead of being redefined inline.

- [evidence] web/src/lib/toolbar-contract.ts:1-45
- [evidence] web/src/components/superuser/ControlTowerV2PageFrame.tsx:3-44

### Coordination stream isolation

Live stream connection, reconnect backoff, pause handling, and disabled-state handling are isolated in one hook instead of being spread across page components.

- [evidence] web/src/hooks/useCoordinationStream.ts:1-174

## Recommended Directions

1. **superuser-data-orchestration:** Make the React Query family plus `superuserKeys` the single read contract for readiness and coordination summaries. Keep page-level hooks only for mutations and SSE, and let pages render partial cached data before detail fetches complete.
2. **volatile-selection-keys:** Switch runtime selection to a stable domain key such as `host + lease_identity` or `host + session_agent_id`, and persist the selected inspector target at the page composition layer so it only clears when the entity actually disappears.
3. **persistence-ownership-scatter:** Choose a thin shared policy for operator UI state at the composition layer: which state is session-scoped, which is cross-session, and which should reset. Then either remove the unused superuser slice or intentionally reinstate it behind that policy instead of mixing all three models.
4. **superuser-page-frame-and-loading-contract:** Standardize superuser operator pages on one headless data/view-model and one async contract: cached summary first, detail panes second, live stream independent of summary fetch, and page frames chosen intentionally rather than by route history.

## Unresolved Decisions

1. Should readiness bootstrap diagnostics be folded into the main cached readiness query, or kept as a smaller preflight query that hydrates the main snapshot query? *(from: superuser-data-orchestration)*
2. Which superuser surfaces are allowed to block on a full multi-request bootstrap, and which must render from cached summary data first? *(from: superuser-data-orchestration)*
3. Which field is the canonical stable identity for a runtime row: `lease_identity`, `session_agent_id`, or a composite of both? *(from: volatile-selection-keys)*
4. Should inspector selection persist in session storage, the URL, or a route-scoped store? *(from: volatile-selection-keys)*
5. Which categories of operator state must persist only for the current session, and which should survive browser restarts? *(from: persistence-ownership-scatter)*
6. Is Zustand still the intended home for superuser UI state, or should a smaller route-scoped persistence utility replace it? *(from: persistence-ownership-scatter)*
7. Should dedicated detail pages and the homepage pull-down share the same headless view-model and cache layer? *(from: superuser-page-frame-and-loading-contract)*
8. What is the explicit rule for when a live stream may mount independently of status and detail fetches? *(from: superuser-page-frame-and-loading-contract)*

## Suggested Next Artifact

The next artifact should be the canonical frontend foundation contract, derived from this audit and the resolved discussion decisions.
