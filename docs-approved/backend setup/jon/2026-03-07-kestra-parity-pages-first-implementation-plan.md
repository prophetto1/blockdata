# Kestra Frontend Parity Pages-First Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the BlockData flow and operations pages to match Kestra's frontend as closely as practical, using Kestra screenshots, live Docker instance behavior, and the Kestra codebase as the visual and interaction source of truth.

**Architecture:** This phase is page-first. We prioritize route structure, page layout, tab structure, filters, tables, and empty states so the product surface stops drifting from Kestra. We keep data wiring thin and reuse the current app shell, existing React pages, and current Supabase edges only where needed to keep pages alive. We do not redesign. We copy parity-first now and defer selective BlockData customization until after the Kestra-like SQL/runtime contract is in place.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Ark UI, local shadcn/ui primitives, existing app shell in `web/src`, Kestra screenshots in `docs-approved/backend setup/Screenshots`, live Kestra Docker instance documented in `docs-approved/backend setup/kestra-access.md`.

---

## Ground Rules

1. Kestra is the default spec for page structure, labels, filter layout, empty states, and action placement.
2. Do not simplify a page because the current BlockData backend is incomplete. Build the page shell first, then wire data selectively.
3. Do not create a second design language. Keep the existing app shell, but make the page internals feel as close to Kestra as possible.
4. All deviations from Kestra must be deliberate and documented in the task notes or follow-up contract doc.
5. This phase is frontend-only. No backend or migration edits happen in this plan.

---

## Phase Summary

This plan builds the visible Kestra-like surfaces in this order:

1. Route and navigation parity
2. Flows list parity
3. Flow detail parity
4. Global executions and logs pages
5. Secondary page shells: Tests, Assets, Namespaces, Plugins, Blueprints, Tenant, Instance
6. Visual verification against screenshots

The point of this phase is to stop UI drift now and create a stable target for the later Kestra-identical SQL/runtime phase.

---

### Task 1: Create the Kestra parity route inventory and screenshot map

**Files:**
- Create: `docs/plans/2026-03-07-kestra-page-parity-inventory.md`
- Read: `docs-approved/backend setup/Screenshots/*`
- Read: `web/src/router.tsx`
- Read: `web/src/components/shell/nav-config.ts`

**Step 1: Create a page inventory doc**

List every Kestra page or route we intend to mirror in this frontend pass:

- `/app/flows`
- `/app/flows/:flowId/:tab?`
- `/app/executions`
- `/app/logs`
- `/app/tests`
- `/app/assets`
- `/app/namespaces`
- `/app/plugins`
- `/app/blueprints`
- `/app/tenant`
- `/app/instance`

For each route, map:

- the reference screenshot
- the existing BlockData page or missing page
- whether the page is full parity, shell parity, or deferred

**Step 2: Verify the current route inventory**

Run: `rg -n "/app/flows|/app/executions|/app/logs|/app/tests|/app/assets|/app/namespaces|/app/plugins|/app/blueprints|/app/tenant|/app/instance" web/src`

Expected:

- current flows routes found
- most Kestra routes missing or partial

**Step 3: Commit**

```bash
git add docs/plans/2026-03-07-kestra-page-parity-inventory.md
git commit -m "docs: add Kestra page parity inventory"
```

---

### Task 2: Add top-level parity routes and nav entries

**Files:**
- Modify: `web/src/router.tsx`
- Modify: `web/src/components/shell/nav-config.ts`
- Test: `web/src/components/shell/LeftRailShadcn.test.tsx`

**Step 1: Write failing nav/route tests**

Add assertions that the app can expose the new top-level parity routes:

- Executions
- Logs
- Tests
- Assets
- Namespaces
- Plugins
- Blueprints
- Tenant
- Instance

**Step 2: Run tests to verify failure**

Run: `npm.cmd run test -- web/src/components/shell/LeftRailShadcn.test.tsx`

Expected:

- failing assertions for missing nav items or route handling

**Step 3: Add the route shells**

Create lightweight page components under `web/src/pages/kestra/` for each missing route and register them in `web/src/router.tsx`.

Create:

- `web/src/pages/kestra/ExecutionsPage.tsx`
- `web/src/pages/kestra/LogsPage.tsx`
- `web/src/pages/kestra/TestsPage.tsx`
- `web/src/pages/kestra/AssetsPage.tsx`
- `web/src/pages/kestra/NamespacesPage.tsx`
- `web/src/pages/kestra/PluginsPage.tsx`
- `web/src/pages/kestra/BlueprintsPage.tsx`
- `web/src/pages/kestra/TenantPage.tsx`
- `web/src/pages/kestra/InstancePage.tsx`

Each page should:

- render a real page header
- use a Kestra-like table/list shell
- use a truthful "not yet wired" empty state where data is missing

**Step 4: Update the left rail**

Extend `web/src/components/shell/nav-config.ts` so the top-level navigation reflects the parity surface.

**Step 5: Run tests**

Run: `npm.cmd run test -- web/src/components/shell/LeftRailShadcn.test.tsx`

Expected:

- passing nav tests

**Step 6: Commit**

```bash
git add web/src/router.tsx web/src/components/shell/nav-config.ts web/src/pages/kestra web/src/components/shell/LeftRailShadcn.test.tsx
git commit -m "feat: add Kestra parity route shells and nav items"
```

---

### Task 3: Replace the synthetic Flows list with a Kestra-like list page

**Files:**
- Modify: `web/src/pages/FlowsList.tsx`
- Create: `web/src/pages/flows/flows.api.ts`
- Create: `web/src/pages/flows/flows.types.ts`
- Test: `web/src/pages/flows/FlowsList.test.tsx`

**Step 1: Write failing tests**

Test for:

- Kestra-like table headers
- search box placement
- filter/action toolbar presence
- row rendering using real flow records instead of synthetic "mock" badges

**Step 2: Run tests to verify failure**

Run: `npm.cmd run test -- web/src/pages/flows/FlowsList.test.tsx`

Expected:

- failure because no dedicated API/types layer exists and current page still uses synthetic flow rows

**Step 3: Introduce a dedicated flows page adapter**

Create `flows.types.ts` and `flows.api.ts` so `FlowsList.tsx` stops embedding synthetic mapping logic.

For now, the adapter may read the current `flows` edge function or current Supabase tables, but it must expose a parity-oriented shape:

- `flowId`
- `namespace`
- `labels`
- `lastExecutionDate`
- `lastExecutionStatus`
- `executionStatistics`

Missing fields should return empty values, not fake data.

**Step 4: Rebuild the list layout**

Update `FlowsList.tsx` to match the Kestra list shape:

- top action row
- filter/search row
- clear filters affordance
- table with Kestra-like columns

Do not keep the `mock` badge.

**Step 5: Run tests**

Run: `npm.cmd run test -- web/src/pages/flows/FlowsList.test.tsx`

Expected:

- passing parity-shell tests

**Step 6: Commit**

```bash
git add web/src/pages/FlowsList.tsx web/src/pages/flows/flows.api.ts web/src/pages/flows/flows.types.ts web/src/pages/flows/FlowsList.test.tsx
git commit -m "feat(flows): rebuild list page toward Kestra parity"
```

---

### Task 4: Rework Flow detail into a parity-first page shell

**Files:**
- Modify: `web/src/pages/FlowDetail.tsx`
- Modify: `web/src/components/flows/FlowWorkbench.tsx`
- Modify: `web/src/components/flows/tabs/ExecutionsTab.tsx`
- Modify: `web/src/components/flows/tabs/LogsTab.tsx`
- Modify: `web/src/components/flows/tabs/MetricsTab.tsx`
- Modify: `web/src/components/flows/tabs/TriggersTab.tsx`
- Modify: `web/src/components/flows/tabs/DependenciesTab.tsx`
- Modify: `web/src/components/flows/tabs/ConcurrencyTab.tsx`
- Modify: `web/src/components/flows/tabs/RevisionsTab.tsx`
- Modify: `web/src/components/flows/tabs/AuditLogsTab.tsx`
- Test: `web/src/pages/FlowDetail.test.tsx`

**Step 1: Write failing tests**

Cover:

- header actions placement
- tab order matching Kestra
- overview shell structure
- per-tab empty state language
- edit page keeping the multi-pane workbench

**Step 2: Run tests to verify failure**

Run: `npm.cmd run test -- web/src/pages/FlowDetail.test.tsx`

Expected:

- failure because there is no parity-focused test coverage and several tabs remain placeholders

**Step 3: Rebuild the page chrome before data details**

Update `FlowDetail.tsx` so the visual framing is closer to Kestra:

- breadcrumb/title area
- right-side action buttons
- tab row behavior
- consistent content framing across tabs

Keep the current route shape for now if needed, but remove visual drift.

**Step 4: Upgrade each tab to parity shell**

For every tab, ensure:

- table layout or empty state matches the screenshot family
- toolbar/filter row is present where Kestra uses it
- copy is neutral and operational, not marketing filler

Specifically remove the "Enterprise Edition" marketing-style treatment from `AuditLogsTab.tsx` and replace it with a clear parity placeholder.

**Step 5: Keep the editor, but make it feel like Kestra's edit surface**

In `FlowWorkbench.tsx`:

- keep the current pane model
- align visible labels, action placement, and sub-tab framing with the edit screenshots
- do not redesign the editor around BlockData-specific ideas yet

**Step 6: Run tests**

Run: `npm.cmd run test -- web/src/pages/FlowDetail.test.tsx`

Expected:

- passing page-shell tests

**Step 7: Commit**

```bash
git add web/src/pages/FlowDetail.tsx web/src/components/flows web/src/pages/FlowDetail.test.tsx
git commit -m "feat(flows): move detail page and tabs toward Kestra parity"
```

---

### Task 5: Build global Executions and Logs pages

**Files:**
- Create: `web/src/pages/kestra/ExecutionsPage.tsx`
- Create: `web/src/pages/kestra/LogsPage.tsx`
- Create: `web/src/pages/kestra/runtime-pages.api.ts`
- Create: `web/src/pages/kestra/runtime-pages.types.ts`
- Test: `web/src/pages/kestra/ExecutionsPage.test.tsx`
- Test: `web/src/pages/kestra/LogsPage.test.tsx`

**Step 1: Write failing tests**

Assert each page renders:

- Kestra-like toolbar
- table headers
- empty-state messaging when no runtime data exists

**Step 2: Run tests to verify failure**

Run: `npm.cmd run test -- web/src/pages/kestra/ExecutionsPage.test.tsx web/src/pages/kestra/LogsPage.test.tsx`

Expected:

- failure because these pages are shells or missing

**Step 3: Create shared runtime page adapters**

Introduce `runtime-pages.api.ts` and `runtime-pages.types.ts` to isolate the frontend from the evolving runtime schema.

Adapters should return parity-oriented read models even if current backend fields are partial.

**Step 4: Build the pages**

Make these pages visually close to Kestra's standalone Executions and Logs pages:

- filter/search strip
- summary or chart shell
- main results table

**Step 5: Run tests**

Run: `npm.cmd run test -- web/src/pages/kestra/ExecutionsPage.test.tsx web/src/pages/kestra/LogsPage.test.tsx`

Expected:

- passing page tests

**Step 6: Commit**

```bash
git add web/src/pages/kestra/ExecutionsPage.tsx web/src/pages/kestra/LogsPage.tsx web/src/pages/kestra/runtime-pages.api.ts web/src/pages/kestra/runtime-pages.types.ts web/src/pages/kestra/ExecutionsPage.test.tsx web/src/pages/kestra/LogsPage.test.tsx
git commit -m "feat(runtime): add Kestra-style executions and logs pages"
```

---

### Task 6: Build parity shells for secondary Kestra pages

**Files:**
- Modify: `web/src/pages/kestra/TestsPage.tsx`
- Modify: `web/src/pages/kestra/AssetsPage.tsx`
- Modify: `web/src/pages/kestra/NamespacesPage.tsx`
- Modify: `web/src/pages/kestra/PluginsPage.tsx`
- Modify: `web/src/pages/kestra/BlueprintsPage.tsx`
- Modify: `web/src/pages/kestra/TenantPage.tsx`
- Modify: `web/src/pages/kestra/InstancePage.tsx`
- Test: `web/src/pages/kestra/KestraShellPages.test.tsx`

**Step 1: Write failing tests**

Test that each page:

- renders a page title matching the nav label
- uses consistent parity shell framing
- avoids generic placeholder-card sprawl

**Step 2: Run tests to verify failure**

Run: `npm.cmd run test -- web/src/pages/kestra/KestraShellPages.test.tsx`

Expected:

- failure because these shells are not yet standardized

**Step 3: Implement consistent secondary-page shells**

Each page should match the screenshot family with:

- title/action framing
- list/table or card layout where Kestra shows one
- concise truthful empty states

These are shell-only pages in this phase. Do not invent backend behavior.

**Step 4: Run tests**

Run: `npm.cmd run test -- web/src/pages/kestra/KestraShellPages.test.tsx`

Expected:

- passing tests

**Step 5: Commit**

```bash
git add web/src/pages/kestra web/src/pages/kestra/KestraShellPages.test.tsx
git commit -m "feat(kestra): add parity shells for secondary pages"
```

---

### Task 7: Add a shared Kestra parity component layer

**Files:**
- Create: `web/src/components/kestra/KestraPageHeader.tsx`
- Create: `web/src/components/kestra/KestraFilterToolbar.tsx`
- Create: `web/src/components/kestra/KestraEmptyState.tsx`
- Create: `web/src/components/kestra/KestraDataTable.tsx`
- Test: `web/src/components/kestra/KestraFilterToolbar.test.tsx`

**Step 1: Write failing tests**

Cover:

- toolbar action rendering
- filter pill rendering
- search box behavior
- consistent empty-state rendering

**Step 2: Run tests to verify failure**

Run: `npm.cmd run test -- web/src/components/kestra/KestraFilterToolbar.test.tsx`

Expected:

- failure because no shared parity component layer exists

**Step 3: Build the shared component set**

Use these components to remove repeated page scaffolding and keep parity behavior consistent.

Do not invent a new design system. These are local parity helpers.

**Step 4: Refactor pages to use the shared layer**

Update the pages from Tasks 2 through 6 to use the shared parity components where helpful.

**Step 5: Run tests**

Run: `npm.cmd run test -- web/src/components/kestra/KestraFilterToolbar.test.tsx`

Expected:

- passing component tests

**Step 6: Commit**

```bash
git add web/src/components/kestra web/src/components/kestra/KestraFilterToolbar.test.tsx web/src/pages/kestra web/src/pages/FlowDetail.tsx web/src/pages/FlowsList.tsx
git commit -m "refactor(kestra): add shared parity page components"
```

---

### Task 8: Verify against the live Kestra surface and screenshots

**Files:**
- Create: `docs/plans/2026-03-07-kestra-page-parity-verification.md`
- Read: `docs-approved/backend setup/kestra-access.md`
- Read: `docs-approved/backend setup/Screenshots/*`

**Step 1: Create a verification checklist**

For every implemented page, compare:

- page title
- top-right actions
- filter/search layout
- table columns
- empty states
- tab order
- overall information density

**Step 2: Run frontend verification**

Run:

```bash
cd web
npm.cmd run test
npm.cmd run build
```

Expected:

- tests pass
- build succeeds

**Step 3: Manual parity review**

Compare the local app pages against:

- screenshots in `docs-approved/backend setup/Screenshots`
- live Kestra instance from `docs-approved/backend setup/kestra-access.md`

Record each page as:

- `match`
- `close`
- `deviates`

**Step 4: Commit**

```bash
git add docs/plans/2026-03-07-kestra-page-parity-verification.md
git commit -m "docs: add Kestra page parity verification checklist"
```

---

## Out Of Scope For This Plan

- rewriting the runtime SQL to match Kestra
- backend migration work
- execution bridge implementation
- Python handler generation
- Arango projection work

Those come next. This plan is about making the frontend stop drifting and giving the later runtime work a stable UI target.

---

## Follow-On Plan Immediately After This One

Once this page-first pass is complete, the next implementation plan should be:

1. Kestra-identical SQL adoption
2. runtime views and RLS
3. execution bridge
4. Python handler generation from Kestra Java handlers
5. Arango projection from canonical Postgres JSONB documents

---

## Definition Of Done

This frontend parity pass is complete when:

1. The left rail exposes the intended Kestra-like page set.
2. `/app/flows` and `/app/flows/:flowId/:tab?` look and behave much closer to Kestra than the current implementation.
3. Standalone executions and logs pages exist.
4. Secondary Kestra pages exist as shell-accurate routes.
5. The page system uses shared parity components instead of ad hoc placeholders.
6. Every implemented page has been checked against screenshots and the live Kestra instance.

Plan complete and saved to `docs/plans/2026-03-07-kestra-parity-pages-first-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
