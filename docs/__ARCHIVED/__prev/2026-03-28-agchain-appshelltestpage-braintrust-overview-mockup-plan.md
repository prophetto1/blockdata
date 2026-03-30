# AGChain `appshelltestpage` Braintrust Overview Mockup Implementation Plan

**Goal:** Create a new authenticated AGChain page at `/app/agchain/appshelltestpage` that reproduces the dark Braintrust project overview shell and visible page composition as closely as practical from the captured JSON measurements and screenshots, so the result can be judged side-by-side as a design proposal.

**Architecture:** Add one new direct AGChain route that bypasses `AgchainShellLayout` entirely and mounts a self-contained mockup page with its own dedicated shell components, static menu data, and static overview content. This page is a reference mockup only; it must not alter the current AGChain shared shell, current AGChain left-rail menus, or any production AGChain page visuals.

**Tech Stack:** React + TypeScript, React Router, Tailwind CSS, Vitest.

**Status:** Draft
**Date:** 2026-03-28

---

## Manifest

### Platform API

No platform API changes. This page is a static frontend mockup and does not create, modify, or consume any new backend runtime seam.

### Observability

No observability changes. This is a design-reference page with static content, no new owned runtime flow, and no new browser-to-backend contract that would require tracing, metrics, or structured logs.

### Database Migrations

No database migrations. The page stores no new state and introduces no new data model.

### Edge Functions

No edge function changes. The mockup does not call Supabase edge functions or add any external integration path.

### Frontend Surface Area

**Mount point:** New authenticated direct route at `/app/agchain/appshelltestpage`, mounted as a sibling of the current AGChain shell route tree so it does not inherit `AgchainShellLayout`.

**New pages:** `1`

| Page | File | Purpose |
|------|------|---------|
| `AgchainAppShellTestPage` | `web/src/pages/agchain/AgchainAppShellTestPage.tsx` | Self-contained Braintrust overview mockup page |

**New components:** `4`

| Component | File | Purpose |
|-----------|------|---------|
| `BraintrustOverviewMockShell` | `web/src/components/agchain/mockup/BraintrustOverviewMockShell.tsx` | Root shell frame, layout geometry, and region composition |
| `BraintrustOverviewMockRail` | `web/src/components/agchain/mockup/BraintrustOverviewMockRail.tsx` | Braintrust-style primary left rail with static menu groups and items |
| `BraintrustOverviewMockHeader` | `web/src/components/agchain/mockup/BraintrustOverviewMockHeader.tsx` | Content-region top header with project title and actions |
| `BraintrustOverviewMockCanvas` | `web/src/components/agchain/mockup/BraintrustOverviewMockCanvas.tsx` | Overview-page content surface, onboarding panel, footer, and floating CTA |

**New static data modules:** `1`

| File | Purpose |
|------|---------|
| `web/src/components/agchain/mockup/braintrustOverviewMockData.ts` | Visible Braintrust menu labels, header labels, CTA labels, and static content copy used by the mockup |

**Modified files:** `1`

| File | What changes |
|------|--------------|
| `web/src/router.tsx` | Add direct authenticated route for `/app/agchain/appshelltestpage` that lazy-loads the mockup page outside `AgchainShellLayout` |

**New test files:** `1`

| File | What changes |
|------|--------------|
| `web/src/pages/agchain/AgchainAppShellTestPage.test.tsx` | Verify the page renders the Braintrust-style shell, visible menu labels, header actions, and overview surfaces without depending on `AgchainShellLayout` |

**New hooks:** `0`

**New services:** `0`

**Modified hooks:** `0`

**Modified services:** `0`

**Not modified:**

| File | Why |
|------|-----|
| `web/src/components/layout/AgchainShellLayout.tsx` | The mockup must not affect the current shared AGChain shell |
| `web/src/components/agchain/AgchainLeftNav.tsx` | The current AGChain rail menu must remain unchanged |
| `web/src/components/shell/LeftRailShadcn.tsx` | The mockup uses dedicated reference components, not the shared left rail |
| `web/src/components/shell/TopCommandBar.tsx` | The mockup uses a dedicated Braintrust-style header, not the shared top command bar |
| Existing AGChain page files under `web/src/pages/agchain/` | The mockup is a proposal page and must not retrofit current AGChain surfaces |

---

## Pre-Implementation Contract

No major product, routing, or design-source decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. **Mockup-only page.** `appshelltestpage` is a design proposal artifact, not a rollout of a new shared shell. It must not alter the visuals or menus of the current AGChain shell.
2. **Bypass the shared AGChain shell.** The page must not mount through `AgchainShellLayout` and must not reuse `AgchainLeftNav`, `LeftRailShadcn`, or `TopCommandBar`.
3. **Direct route only.** The page is accessible by direct URL at `/app/agchain/appshelltestpage` and is not added to the current AGChain left-rail navigation.
4. **Braintrust is the visual source of truth.** Visible shell geometry, typography, spacing, menu density, surface hierarchy, and page composition are dictated by the Braintrust overview captures and screenshots, not by current AGChain shell conventions.
5. **Dark mode only.** The first implementation reproduces the dark Braintrust overview page only. Light-mode parity is out of scope.
6. **Static content and menus.** Visible labels, menu groups, action labels, and overview copy are intentionally hard-coded from the reference so the page can be compared one-to-one. No data fetching or AGChain behavior wiring is required.
7. **Overview page only.** This implementation reproduces the Braintrust overview page, not the settings page and not the secondary-rail shell variant.
8. **Behavior is intentionally thin.** Controls may have hover/focus states and inert buttons, but no API wiring, project actions, or menu navigation behavior beyond render-level fidelity is required.

### Design Source Contract

Primary visual sources:

- `E:\writing-system\braintrust-dev-app-org-level-p-project-level--2026-03-28T19-15-11-189Z.json`
- Dark Braintrust overview screenshot captured in this session

Reference-only secondary sources:

- `E:\writing-system\braintrust-dev-app-org-level-p-project-level-configuration-general--2026-03-28T19-24-58-950Z.json`
- Braintrust settings screenshots captured in this session

The secondary sources may inform future shell work but must not expand the scope of this mockup beyond the overview page.

### Literal Reference Contract

The mockup must use the following exact visible strings unless a string is decorative-only or icon-only.

#### Primary left rail

- Org selector: `org-level`
- Project section label: `Project`
- Project action text: `View all`
- Project switcher label: `project-level`
- Rail items in exact order:
  - `Overview`
  - `Logs`
  - `Topics`
  - `Monitor`
  - `Review`
  - `Playgrounds`
  - `Experiments`
  - `Datasets`
  - `Prompts`
  - `Scorers`
  - `Parameters`
  - `Tools`
  - `SQL sandbox`
  - `Settings`
- Lower usage card:
  - `Starter plan usage`
  - `Logs`
  - `0 of 1 GB`
  - `Scorers`
  - `0 of 10,000`

#### Content header

- Title: `project-level`
- Header link: `Explore plans`
- Project id label: `PROJECT ID`
- Project id value: `2ff03403-3654-48da-882a-2383709ea66d`
- Right-side actions:
  - `Configure project`
  - `Setup AI providers`

#### Main overview content

- Section label: `Project overview`
- Prompt heading: `Ask Loop`
- Prompt placeholder: `Ask questions about this project, @ for context, / for commands`
- Warning control: `No org-level provider`
- Main panel heading: `Configure this project`
- Main panel supporting copy: `Get started with observability and evaluation for this AI project`
- Left card:
  - `Observability`
  - `Trace your AI app interactions`
  - `Trace user interactions for monitoring, real-time scoring, and review. Annotate logs data and use it as the source for evaluations in Braintrust.`
  - `Setup tracing`
- Right card:
  - `Evaluation`
  - `Measure and iterate on performance`
  - `Add your dataset or prompt, or create an experiment to get started.`
  - `Upload data`
  - `Add your prompt`
  - `Create experiment`
- Lower connector CTA: `AI in your app`
- Floating CTA: `Loop agent`

#### Footer region

- Brand wordmark: `Braintrust`
- Footer links in exact order:
  - `Home`
  - `Docs`
  - `Customers`
  - `Blog`
  - `Pricing`
  - `Contact sales`
  - `Discord`
  - `Newsletter`
  - `Changelog`
  - `Status`
  - `Trust center`
  - `Legal`

### Dimension Contract

Use the overview capture and screenshot as the geometry baseline.

#### Geometry

| Element | Value | Contract |
|---------|-------|----------|
| Viewport | `1920 x 945` | Desktop reference baseline for the mockup |
| App frame | `x=0, y=0, w=1920, h=945` | Full page frame |
| Primary rail | `x=0, y=0, w=224, h=945` | Fixed width, full height |
| Content header | `x=224, y=0, w=1696, h=44` | Starts after Rail 1, never full-width |
| Main canvas | `x=224, y=0, w=1696, h=945` | Occupies content region under the header |
| Rail item row box | `208 x 28` with `8px` inset from rail edge | Match dense Braintrust navigation rhythm |
| Header action row | Right-aligned inside the 44px header band | `Configure project` and `Setup AI providers` sit on the header baseline |
| Floating CTA | `119 x 32` anchored near bottom-right | Position and size should read like the reference screenshot |

#### Token Contract

| Token | Value | Usage |
|-------|-------|-------|
| Page background | `rgb(0, 0, 0)` | Whole page background |
| Rail/background surface | `rgb(14, 14, 15)` | Primary rail and dark panels |
| Default border | `rgb(38, 38, 42)` | Header dividers, panel borders, shell separators |
| Secondary border | `rgb(25, 25, 28)` | Inner emphasized panel edge where needed |
| Foreground text | `rgb(237, 237, 237)` | Default body and heading color |
| Accent treatment | Muted violet/indigo surfaces plus a brighter blue-violet floating CTA | Match the screenshot’s central setup cards and Loop CTA; do not invent unrelated accent hues |

#### Typography Contract

| Role | Value | Evidence |
|------|-------|----------|
| Main panel heading | `18px / 28px / 600` | `Configure this project` |
| Setup card heading | `16px / 24px / 600` | `Observability`, `Evaluation`, `AI in your app` |
| Section heading | `14px / 20px / 600` | `Project overview`, `Ask Loop` |
| Body copy | `14px / 20px / 400` | Supporting panel copy |
| Org/project labels | `14px / 20px / 500` | `org-level`, `project-level` |
| Rail nav items | `13px / 19.5px / 500` | `Overview` through `Settings` |
| Warning control text | `12.5px / 18.75px / 400` | `No org-level provider` |
| Small support/body text | `12px / 16px / 400` | Card supporting lines |
| Footer links | `12px / 16px / 500` | Footer navigation row |
| Micro labels | `10px / 13.33px / 500` and `10px / 13.33px / 400` | `PROJECT ID`, usage values |

Fine-grained padding and gap values may be tuned only when the screenshot and the numeric capture leave no direct answer. The implementation may not improvise new layout rhythms that materially diverge from the reference.

### Visual Content Contract

The page must visibly reproduce these Braintrust overview elements:

1. Primary left rail with:
   - org selector row
   - project label block
   - full visible menu set from the screenshot
   - starter plan usage card near the lower-left corner
2. Content-region top header with:
   - page title area
   - project ID text
   - right-aligned action buttons
3. Main overview content area with:
   - `Project overview` label row
   - `Ask Loop` prompt surface
   - large bordered onboarding/configuration panel
   - two central setup cards and the lower CTA connector block
4. Lower content/footer treatment with:
   - Braintrust wordmark/footer links region
   - bottom-right Loop agent floating CTA

The implementation is allowed to simplify icon glyph fidelity, but it is not allowed to simplify, rename, omit, or reorder the drafted visible labels above.

### Frozen Seam Contract

1. `AgchainShellLayout` behavior and visuals are frozen for this work.
2. `AgchainLeftNav` contents and active-state behavior are frozen for this work.
3. No current AGChain route redirects are changed.
4. No existing AGChain page content is refactored to consume the mockup components.
5. The new mockup components are owned only by `appshelltestpage`.

---

## Risks

1. **Overfitting to one screenshot.** Some spacing and internal card geometry will still require visual judgment because the collector is strong on shell bounds but weaker on nested grouping.
2. **Font/token mismatch with current app globals.** If AGChain global typography or colors differ, the mockup page may need local overrides to stay visually close to Braintrust.
3. **Route confusion.** Because the path sits under `/app/agchain/`, it may be mistaken for a production AGChain page unless the plan keeps it out of the existing AGChain nav.

---

## Completion Criteria

1. `/app/agchain/appshelltestpage` renders a self-contained Braintrust-style overview mockup without mounting `AgchainShellLayout`.
2. The page is reachable by direct URL only and does not appear in the current AGChain shell navigation.
3. The visible left rail, top header, overview content frame, footer region, and floating CTA read as a near-identical dark Braintrust overview page in side-by-side comparison.
4. The current AGChain shell routes under `/app/agchain/*` remain visually unchanged.
5. No backend, database, observability, or edge-function files are modified.
6. Targeted Vitest coverage for the new page passes.
7. Frontend build passes with the new route and page included.

---

## Locked Inventory Counts

### Frontend

- New pages: `1`
- New components: `4`
- New static data modules: `1`
- Modified router files: `1`
- New hooks: `0`
- New services: `0`
- New test files: `1`
- Modified current AGChain shell files: `0`

### Locked File Inventory

#### New files

- `web/src/pages/agchain/AgchainAppShellTestPage.tsx`
- `web/src/pages/agchain/AgchainAppShellTestPage.test.tsx`
- `web/src/components/agchain/mockup/BraintrustOverviewMockShell.tsx`
- `web/src/components/agchain/mockup/BraintrustOverviewMockRail.tsx`
- `web/src/components/agchain/mockup/BraintrustOverviewMockHeader.tsx`
- `web/src/components/agchain/mockup/BraintrustOverviewMockCanvas.tsx`
- `web/src/components/agchain/mockup/braintrustOverviewMockData.ts`

#### Modified files

- `web/src/router.tsx`

---

## Task Plan

### Task 1: Create the new file set as renderable stubs

**File(s):**

- `web/src/pages/agchain/AgchainAppShellTestPage.tsx`
- `web/src/pages/agchain/AgchainAppShellTestPage.test.tsx`
- `web/src/components/agchain/mockup/BraintrustOverviewMockShell.tsx`
- `web/src/components/agchain/mockup/BraintrustOverviewMockRail.tsx`
- `web/src/components/agchain/mockup/BraintrustOverviewMockHeader.tsx`
- `web/src/components/agchain/mockup/BraintrustOverviewMockCanvas.tsx`
- `web/src/components/agchain/mockup/braintrustOverviewMockData.ts`

**Step 1:** Create all new files with valid exports so the mockup can compile incrementally.

**Step 2:** In the data module, scaffold the literal content groups that will later hold the drafted Braintrust strings.

**Step 3:** In the page and component stubs, render a minimal mockup marker plus a small subset of the drafted labels so the test file can compile and execute from this point onward.

**Step 4:** Add the test file as a minimal render test against the stub page.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainAppShellTestPage.test.tsx --reporter=verbose`
**Expected output:** The new page test file exists, compiles, and passes against the minimal renderable stubs.
**Commit:** `feat: scaffold appshelltestpage mockup files`

### Task 2: Lock the literal Braintrust reference data

**File(s):** `web/src/components/agchain/mockup/braintrustOverviewMockData.ts`

**Step 1:** Replace the scaffold strings with the full drafted strings from the Literal Reference Contract, preserving exact spelling and order.

**Step 2:** Group the data by rail, header, main canvas, footer, and utility card so the implementation cannot improvise labels during rendering.

**Step 3:** Keep the data local to the mockup page; do not expose it through shared AGChain navigation or shared shell config.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainAppShellTestPage.test.tsx --reporter=verbose`
**Expected output:** The page test can assert against exact drafted labels supplied by the data module.
**Commit:** `feat: lock literal braintrust overview mock data`

### Task 3: Build the self-contained Braintrust-style shell and content components

**File(s):**

- `web/src/components/agchain/mockup/BraintrustOverviewMockShell.tsx`
- `web/src/components/agchain/mockup/BraintrustOverviewMockRail.tsx`
- `web/src/components/agchain/mockup/BraintrustOverviewMockHeader.tsx`
- `web/src/components/agchain/mockup/BraintrustOverviewMockCanvas.tsx`

**Step 1:** Implement the fixed shell geometry from the Dimension Contract: 224px rail, 44px header, 1696px content region, and the lower-right floating CTA.

**Step 2:** Implement the rail exactly around the drafted rail strings, including the `Project` / `View all` region and the lower usage card labels.

**Step 3:** Implement the header exactly around the drafted title, project ID label/value, and action buttons.

**Step 4:** Implement the overview canvas exactly around the drafted labels, supporting copy, CTA labels, footer wordmark, and footer link order.

**Step 5:** Apply the locked color and typography contracts from this plan rather than inferring fresh values during implementation.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainAppShellTestPage.test.tsx --reporter=verbose`
**Expected output:** Render test passes and confirms the shell regions and drafted labels are present in the composed mockup.
**Commit:** `feat: build self-contained braintrust overview mock shell`

### Task 4: Mount the page and route it outside `AgchainShellLayout`

**File(s):**

- `web/src/pages/agchain/AgchainAppShellTestPage.tsx`
- `web/src/router.tsx`

**Step 1:** Mount the page component so it renders the dedicated mock shell and nothing from the current AGChain shared shell.

**Step 2:** Add a new authenticated direct route for `/app/agchain/appshelltestpage` as a sibling of the current `AgchainShellLayout` route block, not nested under it.

**Step 3:** Do not add the route to `AgchainLeftNav` or any existing AGChain menu source.

**Test command:** `cd web && npm run build`
**Expected output:** Build succeeds and the new direct route compiles without changing the current AGChain shell tree.
**Commit:** `feat: add direct route for appshelltestpage mockup`

### Task 5: Add runtime isolation assertions and mockup-specific regression coverage

**File(s):** `web/src/pages/agchain/AgchainAppShellTestPage.test.tsx`

**Step 1:** Assert presence of the drafted Braintrust-style strings, including at minimum `Overview`, `Project overview`, `Explore plans`, `Configure project`, and `Loop agent`.

**Step 2:** Assert runtime isolation by checking that the rendered page does not contain the shared AGChain shell test ids:
  - `agchain-platform-rail`
  - `agchain-top-header`
  - `agchain-shell-frame`

**Step 3:** Keep the test scoped to the new page and avoid rewriting existing AGChain shell tests.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainAppShellTestPage.test.tsx --reporter=verbose`
**Expected output:** New page test passes and proves the mockup renders through its dedicated shell, not the shared AGChain shell.
**Commit:** `test: cover appshelltestpage mockup isolation and render contract`

### Task 6: Final verification

**File(s):** none

**Step 1:** Run targeted page coverage.

**Step 2:** Run the frontend build to catch route or import breakage.

**Step 3:** Manually compare `/app/agchain/appshelltestpage` against the Braintrust overview screenshot in a side-by-side browser check before declaring the mockup complete.

**Test commands:**

- `cd web && npx vitest run src/pages/agchain/AgchainAppShellTestPage.test.tsx --reporter=verbose`
- `cd web && npm run build`

**Expected output:** The test passes, the build succeeds, and the page is visually ready for side-by-side judgment without changing current AGChain shell visuals.
**Commit:** `chore: verify braintrust overview mockup page`
