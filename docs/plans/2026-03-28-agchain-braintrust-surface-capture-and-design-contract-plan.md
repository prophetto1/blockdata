# AGChain Braintrust Surface Capture and Design Contract Implementation Plan

**Goal:** Create a deterministic, capture-first design contract package for the AGChain product-facing surfaces that should borrow Braintrust-style UI directly or near-directly: `Overview`, `Datasets`, `Prompts`, `Scorers`, `Parameters`, `Tools`, and `Settings`. The output of this batch is not placeholder UI. The output is a measured reference package plus per-surface design contracts that later implementation plans can execute against without re-interpreting screenshots from memory.

**Architecture:** Reuse the existing BlockData superuser capture tool at `/app/superuser/design-layout-captures` as the primary reference-capture path, backed by the existing local Node capture server in [capture-server.mjs](E:/writing-system/scripts/capture-server.mjs) and the granular Playwright measurement seam in [measure-layout.mjs](E:/writing-system/docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs). Captures are stored under [docs/design-layouts](E:/writing-system/docs/design-layouts) and become the canonical visual/layout evidence. Per-surface AGChain design contracts are written into `web-docs/specs/agchain-surfaces/` and lock what is borrowed identically from Braintrust, what is only structurally borrowed, and what remains AGChain-owned.

**Tech Stack:** Existing React + TypeScript AGChain shell and pages under `web/src`, existing superuser capture page, existing local Node capture server, Playwright measurement scripts, markdown design specs in `web-docs/specs`.
**Status:** Draft
**Author:** Codex for jwchu
**Date:** 2026-03-28

## Manifest

### Platform API

No platform API changes are part of this batch.

- No new `services/platform-api` endpoints.
- No modified `services/platform-api` endpoints.
- No platform-api routes are required for execution because the existing capture workflow is intentionally local and filesystem-backed.

The only runtime seam consumed by this batch is the existing local capture server on `localhost:4488`; that seam is locked in the `Frozen Capture Seam Contract` section below and is not a platform-api contract.

### Observability

No OpenTelemetry or structured-log changes are part of this batch.

Justification:

- This batch creates design-contract artifacts, not new browser-to-platform runtime behavior.
- Capture evidence is produced by existing artifact outputs: `report.json`, `viewport.png`, and `full-page.png`.
- Any future implementation plan that adds or changes runtime behavior must declare its own observability surface separately.

### Database Migrations

No database migrations are part of this batch.

### Edge Functions

No Supabase Edge Function changes are part of this batch.

### Frontend Surface Area

#### Existing frontend/runtime seams consumed without contract changes

- [DesignLayoutCaptures.tsx](E:/writing-system/web/src/pages/superuser/DesignLayoutCaptures.tsx)
- [router.tsx](E:/writing-system/web/src/router.tsx)
- [AdminLeftNav.tsx](E:/writing-system/web/src/components/admin/AdminLeftNav.tsx)
- [capture-server.mjs](E:/writing-system/scripts/capture-server.mjs)
- [measure-layout.mjs](E:/writing-system/docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs)
- [run-layout-capture.mjs](E:/writing-system/docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/run-layout-capture.mjs)
- [AgchainShellLayout.tsx](E:/writing-system/web/src/components/layout/AgchainShellLayout.tsx)
- [AgchainLeftNav.tsx](E:/writing-system/web/src/components/agchain/AgchainLeftNav.tsx)

#### Existing AGChain target pages that this batch must inspect and classify

- [AgchainBenchmarksPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainBenchmarksPage.tsx)
- [AgchainRunsPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainRunsPage.tsx)
- [AgchainResultsPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainResultsPage.tsx)
- [AgchainObservabilityPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainObservabilityPage.tsx)
- [AgchainModelsPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainModelsPage.tsx)
- [AgchainSectionPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainSectionPage.tsx)

#### New files to create in this batch

Create `8` new spec files under `web-docs/specs/agchain-surfaces/`:

- `reference-matrix.md`
- `overview.md`
- `datasets.md`
- `prompts.md`
- `scorers.md`
- `parameters.md`
- `tools.md`
- `settings.md`

This batch also creates new capture artifact directories under [docs/design-layouts](E:/writing-system/docs/design-layouts) as required by the capture tooling. Directory names are derived by the existing slug logic in [measure-layout.mjs](E:/writing-system/docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs); they are not hand-authored.

## Locked Product Decisions

1. This is a capture-and-design-contract batch, not a runtime implementation batch.
2. The existing superuser capture UI at `/app/superuser/design-layout-captures` remains the primary capture path; no new capture tool is introduced.
3. The only valid fallback is the existing Playwright wrapper around [measure-layout.mjs](E:/writing-system/docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs); no alternate measurement script is introduced.
4. All new design contracts live under `web-docs/specs/agchain-surfaces/`.
5. `Overview`, `Datasets`, `Prompts`, and `Settings` are exact or near-exact Braintrust borrowing candidates.
6. `Scorers`, `Parameters`, and `Tools` remain structural-borrow surfaces only.
7. The Settings surface must preserve the requested `Project / Organization / Personal` second-rail split.

## Locked Platform API Surface

### New platform API endpoints: `0`

### Existing platform API endpoints modified: `0`

### Existing platform API endpoints reused as-is: `0`

This batch intentionally does not add or change `services/platform-api` routes. The local capture runner is not reclassified as platform-api.

## Locked Observability Surface

### New traces: `0`

### New metrics: `0`

### New structured logs: `0`

Reason:

- this batch creates reference captures and markdown contracts only,
- the required evidence surface is the capture artifact contract under [docs/design-layouts](E:/writing-system/docs/design-layouts),
- any later surface implementation plan must declare its own runtime observability contract.

## Locked Inventory Counts

### Runtime code

- Modified existing frontend/runtime files: `0`
- New frontend/runtime files: `0`
- Modified platform-api files: `0`
- Modified database migrations: `0`
- Modified edge-function files: `0`

### Design-contract artifacts

- New spec docs: `8`
- Required AGChain baseline capture pages: `5`
- Required capture matrix docs: `1` (included in the `8` spec docs total)
- Optional Braintrust/live reference capture directories: `0-7` depending on source reachability

## Locked File Inventory

### New files

- `web-docs/specs/agchain-surfaces/reference-matrix.md`
- `web-docs/specs/agchain-surfaces/overview.md`
- `web-docs/specs/agchain-surfaces/datasets.md`
- `web-docs/specs/agchain-surfaces/prompts.md`
- `web-docs/specs/agchain-surfaces/scorers.md`
- `web-docs/specs/agchain-surfaces/parameters.md`
- `web-docs/specs/agchain-surfaces/tools.md`
- `web-docs/specs/agchain-surfaces/settings.md`

### Modified existing files

- None

### Read-only consumed seams

- `web/src/pages/superuser/DesignLayoutCaptures.tsx`
- `web/src/router.tsx`
- `web/src/components/admin/AdminLeftNav.tsx`
- `scripts/capture-server.mjs`
- `docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs`
- `docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/run-layout-capture.mjs`
- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/agchain/AgchainLeftNav.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainModelsPage.tsx`
- `web/src/pages/agchain/AgchainRunsPage.tsx`
- `web/src/pages/agchain/AgchainResultsPage.tsx`
- `web/src/pages/agchain/AgchainObservabilityPage.tsx`
- `web/src/pages/agchain/AgchainSectionPage.tsx`

## Pre-Implementation Contract

This batch is a **design-contract batch**, not the surface implementation batch.

Completion means:

- every target surface has a measured reference package or an explicitly documented reason why only screenshot-level reference was available,
- every target surface has a written contract in `web-docs/specs/agchain-surfaces/`,
- every contract names what Braintrust elements are borrowed identically, what Inspect substrate assumptions exist under the hood, and what AGChain semantic differences remain.

Completion does **not** mean:

- the AGChain router is rewritten,
- the AGChain nav is rewritten,
- datasets/prompts/scorers/parameters/tools pages are implemented,
- AGChain API/data contracts are implemented.

Those are later execution plans, and they must consume these contracts rather than redefining them.

## Locked Surface Inventory

### Current mounted AGChain routes

| Route | Current file | Current state |
|------|------|--------|
| `/app/agchain/benchmarks` | [AgchainBenchmarksPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainBenchmarksPage.tsx) | Live table/workbench surface |
| `/app/agchain/models` | [AgchainModelsPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainModelsPage.tsx) | Live table surface |
| `/app/agchain/runs` | [AgchainRunsPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainRunsPage.tsx) | Placeholder section page |
| `/app/agchain/results` | [AgchainResultsPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainResultsPage.tsx) | Placeholder section page |
| `/app/agchain/observability` | [AgchainObservabilityPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainObservabilityPage.tsx) | Placeholder section page |

### Target AGChain product-facing surfaces this batch must define

| Surface | Target route family to design for | Current status |
|------|------|--------|
| Overview | `/app/agchain/overview` | No mounted route yet |
| Datasets | `/app/agchain/datasets` | No mounted route yet |
| Prompts | `/app/agchain/prompts` | No mounted route yet |
| Scorers | `/app/agchain/scorers` | No mounted route yet |
| Parameters | `/app/agchain/parameters` | No mounted route yet |
| Tools | `/app/agchain/tools` | No mounted route yet |
| Settings | `/app/agchain/settings/*` with second-rail sections `project`, `organization`, `personal` | Current `/app/agchain/settings` redirects to benchmarks |

## Locked Borrow Policy

### Exact or near-exact Braintrust borrowing allowed

- `Overview`
- `Datasets`
- `Prompts`
- `Settings` shell and second-rail information architecture

For these surfaces, the future implementation should preserve Braintrust-like page structure, density, panel hierarchy, and control placement unless an AGChain-specific object or runtime rule forces a change.

### Structural borrowing only

- `Scorers`
- `Parameters`
- `Tools`

For these surfaces, the future implementation may borrow Braintrust layout rhythm, table/detail structure, and side-panel patterns, but it must not inherit Braintrust semantics where AGChain is intentionally richer:

- scorer semantics tied to benchmark truth and judge/candidate separation,
- parameter semantics tied to runtime profiles, context-delivery policy, and benchmark config,
- tool semantics tied to sandbox/runtime policy rather than observability-only affordances.

## Frozen Capture Seam Contract

### Primary capture path

The primary capture path for this batch is the existing superuser page:

- route: `/app/superuser/design-layout-captures`
- page: [DesignLayoutCaptures.tsx](E:/writing-system/web/src/pages/superuser/DesignLayoutCaptures.tsx)
- local runner: [capture-server.mjs](E:/writing-system/scripts/capture-server.mjs)

Required startup contract:

```bash
cd web && npm run dev
npm run capture-server
```

The capture server remains on `http://localhost:4488` unless explicitly overridden by `CAPTURE_SERVER_PORT`.

### Fallback capture path

If the superuser page cannot be used for a capture because of auth, local-only, or worker-automation constraints, the assigned worker must run the existing wrapper script directly:

```bash
node docs/jon/skills/design-1-layouts-spec-with-playwright/scripts/run-layout-capture.mjs --url <target-url> --width 1920 --height 1080 --theme light
```

This fallback is valid only because it uses the same underlying measurement seam as the superuser page.

### Required artifact contract

Every accepted capture in this batch must produce the standard measurement outputs under [docs/design-layouts](E:/writing-system/docs/design-layouts):

- top-level `report.json`
- per-theme `report.json`
- `viewport.png`
- `full-page.png`

The canonical output directory shape is:

```text
docs/design-layouts/<slug>/<viewport>/
docs/design-layouts/<slug>/<viewport>/report.json
docs/design-layouts/<slug>/<viewport>/<theme>/report.json
docs/design-layouts/<slug>/<viewport>/<theme>/viewport.png
docs/design-layouts/<slug>/<viewport>/<theme>/full-page.png
```

Manual screenshots alone are not sufficient evidence for a page that is reachable by Playwright. If a live/measurable reference is unavailable, the relevant spec must state that explicitly and name the fallback source.

## Locked Reference Source Rules

Use these sources in order:

1. A measurable live page captured through the existing capture seam.
2. A measurable local/staging reproduction captured through the same seam.
3. User-supplied static screenshots or manually saved reference images, only when no measurable live page is available.
4. Braintrust documentation text as support for object semantics, not as layout authority.

Every surface spec must state which of these source types it used.

## Locked Spec Template For Every Surface

Each file under `web-docs/specs/agchain-surfaces/` must contain:

- `Feature`
- `Borrow level`
- `Primary reference capture(s)` with capture slug(s) or fallback source
- `Inspect substrate dependency`
- `AGChain target route`
- `Current AGChain implementation status`
- `Layout contract`
- `Visible component inventory`
- `State matrix`
- `Actions and controls`
- `Data/object vocabulary shown on the page`
- `AGChain semantic deviations from Braintrust`
- `Verification capture contract`

## Explicit Risks Accepted In This Plan

- Some Braintrust internal app pages may not be accessible to the current toolchain without auth or may only exist as prior screenshots. The specs must record that instead of pretending a measured reference existed.
- The current AGChain shell is left-rail only; the requested Settings surface requires a second rail split by `Project`, `Organization`, and `Personal`. The spec must lock whether that second rail lives inside the page frame or changes the shell.
- Braintrust visual parity must not accidentally flatten AGChain-specific runtime semantics for `Scorers`, `Parameters`, or `Tools`.
- Existing AGChain mounted surfaces are incomplete and mixed-quality. The capture-first process must treat them as implementation targets to replace, not as canonical design references.

## Locked Acceptance Contract

This batch is complete only when all of the following are true:

1. `web-docs/specs/agchain-surfaces/reference-matrix.md` exists and maps all seven target surfaces to:
   - borrow level,
   - reference source type,
   - target AGChain route,
   - current implementation status.
2. Each of the seven surface spec files exists and names at least one reference capture slug or an explicit fallback source.
3. Every spec includes a `Verification capture contract` section that requires the future implementation to be captured again through the existing measurement seam.
4. The plan does not invent a new capture tool or a new design-artifact directory outside the existing capture system.
5. The plan preserves the user-requested settings partitioning: `Project`, `Organization`, `Personal`.

## Completion Criteria

- `8` spec files exist under `web-docs/specs/agchain-surfaces/`.
- The specs explicitly cover: `Overview`, `Datasets`, `Prompts`, `Scorers`, `Parameters`, `Tools`, `Settings`.
- The primary capture path is the existing superuser capture UI and local capture server.
- The fallback path is the existing Playwright wrapper around `measure-layout.mjs`.
- No platform-api, database, edge-function, or observability work is left implicit inside this batch.

## Task 1: Create the spec directory and the surface reference matrix

**File(s):**

- `web-docs/specs/agchain-surfaces/reference-matrix.md`

**Step 1:** Create `web-docs/specs/agchain-surfaces/`.
**Step 2:** Write `reference-matrix.md` with one row each for `Overview`, `Datasets`, `Prompts`, `Scorers`, `Parameters`, `Tools`, and `Settings`.
**Step 3:** Include columns for `Borrow level`, `Reference source type`, `Inspect substrate dependency`, `Target AGChain route`, `Current implementation status`, and `Baseline capture slug`.

**Test command:**

```bash
rg -n "^\| (Overview|Datasets|Prompts|Scorers|Parameters|Tools|Settings) \|" E:\writing-system\web-docs\specs\agchain-surfaces\reference-matrix.md
```

**Expected output:** seven table rows, one for each target surface.

**Commit:** `git commit -m "docs: seed agchain surface reference matrix"`

## Task 2: Write the shared surface-spec skeletons

**File(s):**

- `web-docs/specs/agchain-surfaces/overview.md`
- `web-docs/specs/agchain-surfaces/datasets.md`
- `web-docs/specs/agchain-surfaces/prompts.md`
- `web-docs/specs/agchain-surfaces/scorers.md`
- `web-docs/specs/agchain-surfaces/parameters.md`
- `web-docs/specs/agchain-surfaces/tools.md`
- `web-docs/specs/agchain-surfaces/settings.md`

**Step 1:** Create all seven spec files.
**Step 2:** Seed each file with the locked template headings from this plan.
**Step 3:** Make sure every file includes `Inspect substrate dependency` and `Verification capture contract`.

**Test command:**

```bash
@(Get-ChildItem -Path E:\writing-system\web-docs\specs\agchain-surfaces -Filter *.md | Where-Object { $_.Name -ne 'reference-matrix.md' -and (Select-String -Path $_.FullName -Pattern 'Inspect substrate dependency' -Quiet) }).Count
@(Get-ChildItem -Path E:\writing-system\web-docs\specs\agchain-surfaces -Filter *.md | Where-Object { $_.Name -ne 'reference-matrix.md' -and (Select-String -Path $_.FullName -Pattern 'Verification capture contract' -Quiet) }).Count
```

**Expected output:** both commands return `7`.

**Commit:** `git commit -m "docs: seed agchain surface spec skeletons"`

## Task 3: Capture the current AGChain mounted baseline pages

**File(s):**

- `web-docs/specs/agchain-surfaces/reference-matrix.md`

**Step 1:** Start the web app with `cd web && npm run dev`.
**Step 2:** Start the capture runner with `npm run capture-server`.
**Step 3:** Capture `/app/agchain/benchmarks` at `1920x1080` `light`.
**Step 4:** Capture `/app/agchain/models` at `1920x1080` `light`.
**Step 5:** Capture `/app/agchain/runs`, `/app/agchain/results`, and `/app/agchain/observability` at `1920x1080` `light`.
**Step 6:** Record all resulting baseline slugs in `reference-matrix.md`.
**Step 7:** Note in `reference-matrix.md` that `Runs`, `Results`, and `Observability` currently share [AgchainSectionPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainSectionPage.tsx).

**Test command:**

```bash
Test-Path E:\writing-system\docs\design-layouts\localhost-app-agchain-benchmarks\1920x1080\light\report.json
Test-Path E:\writing-system\docs\design-layouts\localhost-app-agchain-models\1920x1080\light\report.json
Test-Path E:\writing-system\docs\design-layouts\localhost-app-agchain-runs\1920x1080\light\report.json
Test-Path E:\writing-system\docs\design-layouts\localhost-app-agchain-results\1920x1080\light\report.json
Test-Path E:\writing-system\docs\design-layouts\localhost-app-agchain-observability\1920x1080\light\report.json
```

**Expected output:** all five commands return `True`.

**Commit:** `git commit -m "docs: capture agchain mounted baseline pages"`

## Task 4: Write the `Overview` surface contract

**File(s):**

- `web-docs/specs/agchain-surfaces/overview.md`
- `web-docs/specs/agchain-surfaces/reference-matrix.md`

**Step 1:** Record the best available reference source for `Overview` using the locked source-order rules.
**Step 2:** Fill `Borrow level`, `Inspect substrate dependency`, `AGChain target route`, and `Current AGChain implementation status`.
**Step 3:** Write the `Layout contract`, `Visible component inventory`, and `Verification capture contract`.

**Test command:**

```bash
rg -n "Borrow level|Inspect substrate dependency|Layout contract|Verification capture contract" E:\writing-system\web-docs\specs\agchain-surfaces\overview.md
```

**Expected output:** all four headings are present.

**Commit:** `git commit -m "docs: lock overview surface contract"`

## Task 5: Write the `Datasets` surface contract

**File(s):**

- `web-docs/specs/agchain-surfaces/datasets.md`
- `web-docs/specs/agchain-surfaces/reference-matrix.md`

**Step 1:** Record the best available reference source for `Datasets`.
**Step 2:** Fill `Borrow level`, `Inspect substrate dependency`, and `AGChain target route`.
**Step 3:** Write `Layout contract`, `State matrix`, `Data/object vocabulary shown on the page`, and `Verification capture contract`.
**Step 4:** Explicitly state that AGChain dataset source breadth can exceed Braintrust even if the borrowed visual pattern is near-exact.

**Test command:**

```bash
rg -n "Inspect substrate dependency|State matrix|Data/object vocabulary shown on the page|Verification capture contract" E:\writing-system\web-docs\specs\agchain-surfaces\datasets.md
```

**Expected output:** all four headings are present.

**Commit:** `git commit -m "docs: lock datasets surface contract"`

## Task 6: Write the `Prompts` surface contract

**File(s):**

- `web-docs/specs/agchain-surfaces/prompts.md`
- `web-docs/specs/agchain-surfaces/reference-matrix.md`

**Step 1:** Record the best available reference source for `Prompts`.
**Step 2:** Fill `Borrow level`, `Inspect substrate dependency`, and `AGChain target route`.
**Step 3:** Write `Layout contract`, `Visible component inventory`, `Actions and controls`, and `Verification capture contract`.

**Test command:**

```bash
rg -n "Inspect substrate dependency|Visible component inventory|Actions and controls|Verification capture contract" E:\writing-system\web-docs\specs\agchain-surfaces\prompts.md
```

**Expected output:** all four headings are present.

**Commit:** `git commit -m "docs: lock prompts surface contract"`

## Task 7: Write the `Scorers` surface contract

**File(s):**

- `web-docs/specs/agchain-surfaces/scorers.md`
- `web-docs/specs/agchain-surfaces/reference-matrix.md`

**Step 1:** Record the best available reference source for `Scorers`.
**Step 2:** Fill `Borrow level`, `Inspect substrate dependency`, and `AGChain target route`.
**Step 3:** Write `State matrix`, `Actions and controls`, `AGChain semantic deviations from Braintrust`, and `Verification capture contract`.

**Test command:**

```bash
rg -n "Inspect substrate dependency|State matrix|AGChain semantic deviations from Braintrust|Verification capture contract" E:\writing-system\web-docs\specs\agchain-surfaces\scorers.md
```

**Expected output:** all four headings are present.

**Commit:** `git commit -m "docs: lock scorers surface contract"`

## Task 8: Write the `Parameters` surface contract

**File(s):**

- `web-docs/specs/agchain-surfaces/parameters.md`
- `web-docs/specs/agchain-surfaces/reference-matrix.md`

**Step 1:** Record the best available reference source for `Parameters`.
**Step 2:** Fill `Borrow level`, `Inspect substrate dependency`, and `AGChain target route`.
**Step 3:** Write `State matrix`, `Actions and controls`, `AGChain semantic deviations from Braintrust`, and `Verification capture contract`.

**Test command:**

```bash
rg -n "Inspect substrate dependency|State matrix|AGChain semantic deviations from Braintrust|Verification capture contract" E:\writing-system\web-docs\specs\agchain-surfaces\parameters.md
```

**Expected output:** all four headings are present.

**Commit:** `git commit -m "docs: lock parameters surface contract"`

## Task 9: Write the `Tools` surface contract

**File(s):**

- `web-docs/specs/agchain-surfaces/tools.md`
- `web-docs/specs/agchain-surfaces/reference-matrix.md`

**Step 1:** Record the best available reference source for `Tools`.
**Step 2:** Fill `Borrow level`, `Inspect substrate dependency`, and `AGChain target route`.
**Step 3:** Write `State matrix`, `Actions and controls`, `AGChain semantic deviations from Braintrust`, and `Verification capture contract`.

**Test command:**

```bash
rg -n "Inspect substrate dependency|State matrix|AGChain semantic deviations from Braintrust|Verification capture contract" E:\writing-system\web-docs\specs\agchain-surfaces\tools.md
```

**Expected output:** all four headings are present.

**Commit:** `git commit -m "docs: lock tools surface contract"`

## Task 10: Write the `Settings` surface contract and second-rail decision

**File(s):**

- `web-docs/specs/agchain-surfaces/settings.md`
- `web-docs/specs/agchain-surfaces/reference-matrix.md`

**Step 1:** Record the best available reference source for `Settings`.
**Step 2:** Fill `Borrow level`, `Inspect substrate dependency`, and `AGChain target route`.
**Step 3:** Add a `Second-rail contract` section that preserves `Project`, `Organization`, and `Personal`.
**Step 4:** Write `State matrix`, `Actions and controls`, `AGChain semantic deviations from Braintrust`, and `Verification capture contract`.
**Step 5:** Update `reference-matrix.md` so the `Settings` row records `Borrow level = Exact or near-exact`.

**Test command:**

```bash
rg -n "Second-rail contract|Inspect substrate dependency|Verification capture contract" E:\writing-system\web-docs\specs\agchain-surfaces\settings.md
rg -n "^\| Settings \| Exact or near-exact" E:\writing-system\web-docs\specs\agchain-surfaces\reference-matrix.md
```

**Expected output:** the first command finds all three headings; the second command finds the `Settings` matrix row.

**Commit:** `git commit -m "docs: lock settings surface contract and second rail"`

## Task 11: Add implementation-handoff sections and run the final contract cross-check

**File(s):**

- `web-docs/specs/agchain-surfaces/reference-matrix.md`
- `web-docs/specs/agchain-surfaces/overview.md`
- `web-docs/specs/agchain-surfaces/datasets.md`
- `web-docs/specs/agchain-surfaces/prompts.md`
- `web-docs/specs/agchain-surfaces/scorers.md`
- `web-docs/specs/agchain-surfaces/parameters.md`
- `web-docs/specs/agchain-surfaces/tools.md`
- `web-docs/specs/agchain-surfaces/settings.md`

**Step 1:** Add `Implementation handoff` to all seven surface spec files.
**Step 2:** Make sure each file names likely AGChain files to replace or heavily modify, whether a new route is needed, whether nav changes are needed, and whether later work will require platform-api/data contracts.
**Step 3:** Cross-check that all seven rows in `reference-matrix.md` match the seven surface files.
**Step 4:** Cross-check that all seven files include `Inspect substrate dependency` and `Verification capture contract`.

**Test command:**

```bash
@(Get-ChildItem -Path E:\writing-system\web-docs\specs\agchain-surfaces -File).Count
rg -l "Implementation handoff" E:\writing-system\web-docs\specs\agchain-surfaces
@(Get-ChildItem -Path E:\writing-system\web-docs\specs\agchain-surfaces -Filter *.md | Where-Object { $_.Name -ne 'reference-matrix.md' -and (Select-String -Path $_.FullName -Pattern 'Inspect substrate dependency' -Quiet) }).Count
```

**Expected output:** the first command returns `8`; the `rg -l "Implementation handoff"` command lists the seven surface spec files; the final count command returns `7`.

**Commit:** `git commit -m "docs: finish agchain surface contracts and handoff sections"`
