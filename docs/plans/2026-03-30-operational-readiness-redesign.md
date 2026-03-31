# Operational Readiness Page Redesign Implementation Plan

**Goal:** Strip the operational readiness page down to what the backend actually provides. Delete 5 dead components that render nothing. Replace the current card-soup UI with a clean flat table per surface showing status, check name, summary, and remediation. Collapse the bootstrap diagnostics to a single alert line with expandable details. Auto-collapse green surfaces. Stop duplicating information between bootstrap and client panels.

**Architecture:** Pure frontend redesign. The backend endpoint (`GET /admin/runtime/readiness`) is correct and untouched. The backend returns `id`, `category`, `status`, `label`, `summary`, `evidence`, `remediation`, `checked_at` per check. The frontend will render exactly those fields. The aspirational type infrastructure (`cause`, `cause_confidence`, `depends_on`, `blocked_by`, `available_actions`, `verify_after`, `next_if_still_failing`, `actionability`) stays in the types for forward compatibility but the UI stops rendering empty shells for them. The `remediation` field — which the backend already returns but the normalizer buries inside a `next_if_still_failing` fallback — gets promoted to a first-class field on the check type and displayed directly in the table.

**Reference designs:** DigitalOcean status page (auto-collapse green surfaces, clean vertical list), ASP.NET HealthChecks UI (flat table per service group), AWS Builders' Library (summary first, detail on demand).

**Tech Stack:** React, TypeScript, Vitest

**Status:** Draft
**Author:** Jon
**Date:** 2026-03-30

---

## Pre-Implementation Contract

No major product or UI decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The backend endpoint is NOT modified. This is a frontend-only redesign.
2. Delete 3 standalone component files that never render: `OperationalReadinessActionPanel.tsx`, `OperationalReadinessDependencyPanel.tsx`, `OperationalReadinessProbeHistoryPanel.tsx`.
3. The `OperationalReadinessCheckGrid.tsx` is rewritten as a simple flat table. The inline sub-components (`CausePanel`, `VerificationPanel`, `NextStepsPanel`) are removed. Expandable rows are replaced with a simple evidence-expand per check.
4. The `OperationalReadinessBootstrapPanel.tsx` is rewritten: one alert line when degraded, collapsible `<details>` for probe info. Not 6 probe cards as primary content.
5. The `OperationalReadinessClientPanel.tsx` is kept as-is (already collapsible via `<details>`).
6. The `OperationalReadinessSummary.tsx` is simplified: remove the instructional text ("Use this strip for count orientation..."), keep the 4 status counters and timestamp.
7. Green surfaces auto-collapse. Surfaces with warn/fail checks start expanded.
8. `remediation` is added as a direct field on `OperationalReadinessCheck`. The `fallbackNextSteps` hack in the normalizer is removed.
9. The aspirational type fields stay in the type definition for forward compatibility. They are not deleted. The UI simply does not build empty shells for them.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. When platform-api is down, the page shows one alert line ("Platform API at /platform-api returned 500") with a Retry button and a collapsible details section. Not 6 full-width probe cards.
2. When platform-api is up and all checks pass, each surface shows as a collapsed row: "Shared — 4/4 OK" with a click-to-expand disclosure.
3. When a check fails, its surface starts expanded showing a flat table with columns: Status (dot + label), Check (name + category badge), Summary, Remediation.
4. The remediation column shows the backend's `remediation` text directly — e.g., "Reduce conversion load or increase worker capacity" for a saturated pool.
5. Clicking a table row expands an evidence section showing the key-value evidence pairs and the checked-at timestamp. Nothing else — no cause panel, no dependency panel, no action panel, no verification panel, no probe history panel.
6. The 3 deleted component files are gone.
7. All tests pass.

---

## Manifest

### Platform API

No platform API changes. The backend endpoint `GET /admin/runtime/readiness` is untouched.

### Observability

No observability changes.

### Database Migrations

No database migrations.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

**New pages:** `0`
**New components:** `0`
**New hooks:** `0`

**Deleted files:** `3`

| File | Why |
|------|-----|
| `web/src/components/superuser/OperationalReadinessActionPanel.tsx` | Never renders — `available_actions` is always `[]` |
| `web/src/components/superuser/OperationalReadinessDependencyPanel.tsx` | Never renders — `depends_on` and `blocked_by` are always `[]` |
| `web/src/components/superuser/OperationalReadinessProbeHistoryPanel.tsx` | Never renders — `hasLatestHistory` is hardcoded `false` |

**Modified files:** `5`

| File | What changes |
|------|-------------|
| `web/src/lib/operationalReadiness.ts` | Add `remediation: string` to `OperationalReadinessCheck` type. Normalizer maps `remediation` directly instead of burying it in `fallbackNextSteps`. |
| `web/src/components/superuser/OperationalReadinessCheckGrid.tsx` | Full rewrite: flat table (status dot, check name, summary, remediation). Expandable row shows only evidence k/v pairs. Delete all inline sub-components (CausePanel, VerificationPanel, NextStepsPanel). Remove imports of deleted components. Auto-collapse surfaces where all checks are OK. |
| `web/src/components/superuser/OperationalReadinessBootstrapPanel.tsx` | Rewrite: single alert line when degraded + collapsible `<details>` for probe info. Remove the 4-card grid and 6 probe cards as primary content. |
| `web/src/components/superuser/OperationalReadinessSummary.tsx` | Remove instructional text. Keep counters + timestamp. |
| `web/src/pages/superuser/SuperuserOperationalReadiness.tsx` | Minor: remove dead import of `OperationalReadinessClientPanel` info-duplication awareness (already collapsible, keep as-is). |

**Modified test files:** `3`

| File | What changes |
|------|-------------|
| `web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx` | Update for new table structure |
| `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx` | Update for new component structure |
| `web/src/hooks/useOperationalReadiness.test.tsx` | Update for `remediation` field |

**Deleted test files:** `1`

| File | Why |
|------|-----|
| `web/src/components/superuser/OperationalReadinessBootstrapPanel.test.tsx` | Rewrite alongside component |

---

## Locked Inventory Counts

### Frontend

- Deleted component files: `3`
- Modified component files: `3` (CheckGrid, BootstrapPanel, Summary)
- Modified lib files: `1` (operationalReadiness.ts)
- Modified page files: `1` (SuperuserOperationalReadiness.tsx)
- Modified test files: `3`
- Deleted test files: `1`

---

## Tasks

### Task 1: Add `remediation` to check type and normalizer

**File(s):** `web/src/lib/operationalReadiness.ts`

**Step 1:** Add `remediation: string;` to the `OperationalReadinessCheck` type (after `checked_at`).

**Step 2:** In `normalizeCheck()`, add `remediation: normalizeString(value.remediation),` to the return object.

**Step 3:** Remove the `fallbackNextSteps` logic (lines 330-343) — just assign `next_if_still_failing` from the raw array normalization directly, no remediation-to-step conversion.

**Test command:** `cd web && npx vitest run src/hooks/useOperationalReadiness.test.tsx`

**Commit:** `feat: add remediation as direct field on readiness check type`

---

### Task 2: Delete dead components

**File(s):**
- `web/src/components/superuser/OperationalReadinessActionPanel.tsx`
- `web/src/components/superuser/OperationalReadinessDependencyPanel.tsx`
- `web/src/components/superuser/OperationalReadinessProbeHistoryPanel.tsx`

**Step 1:** Delete all 3 files.

**Step 2:** Verify no other files import them (grep for the component names). The only consumer is `OperationalReadinessCheckGrid.tsx` which is rewritten in the next task.

**Commit:** `refactor: delete 3 dead operational readiness components`

---

### Task 3: Rewrite CheckGrid as flat table with auto-collapse

**File(s):** `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`

**Step 1:** Delete all imports of removed components and all inline sub-components (`CausePanel`, `VerificationPanel`, `NextStepsPanel`, `renderEvidence`, `hasExpandableDetails`, `getNextActionSummary`, `getPrimaryCause`, `isNoActionRequiredStep`, `getMeaningfulNextSteps`, `ACTIONABILITY_LABELS`, `STEP_KIND_LABELS`).

**Step 2:** Rewrite the component. The surface section renders as a collapsible `<details>` element. If all checks are `ok`, the `<details>` starts closed with a summary line: `"✓ {surface.label} — {checks.length}/{checks.length} OK"`. If any check is warn/fail/unknown, the `<details>` starts `open`.

**Step 3:** Inside the `<details>`, render a flat `<table>` with 4 columns:
- **Status**: colored dot + status text badge
- **Check**: label + category badge
- **Summary**: one-line summary text
- **Remediation**: `check.remediation` text. Show "—" when remediation is empty or equals "No action required."

**Step 4:** Each table row is clickable. Clicking toggles an evidence section below the row — a simple bordered `<div>` showing the `evidence` key-value pairs and the `checked_at` timestamp. No CausePanel, no DependencyPanel, no ActionPanel.

**Step 5:** Keep `STATUS_DOT`, `STATUS_BADGE`, `STATUS_ROW`, `SURFACE_TREATMENT`, `CATEGORY_LABELS`, `formatTimestamp`, `formatEvidenceKey`, `formatEvidenceValue` helpers. Delete everything else.

**Test command:** `cd web && npx vitest run src/components/superuser/OperationalReadinessCheckGrid.test.tsx`

**Commit:** `refactor: rewrite readiness check grid as flat table with auto-collapse`

---

### Task 4: Rewrite BootstrapPanel as alert line + collapsible details

**File(s):** `web/src/components/superuser/OperationalReadinessBootstrapPanel.tsx`

**Step 1:** When `bootstrap.snapshot_available` is `true` (ready state), render a single green line: `"✓ Snapshot loaded — {bootstrap.diagnosis_summary}"`. No probe cards, no 4-card grid.

**Step 2:** When `bootstrap.snapshot_available` is `false` (degraded state), render:
- One alert line: amber/warning icon + `bootstrap.diagnosis_title` + the `nextOperatorAction` text
- A collapsible `<details>` labeled "Probe details" containing the individual probe cards (simplified: just probe label, status badge, summary, and HTTP status if present — no target_url, no detail text)

**Step 3:** Keep the error banner for JS exceptions.

**Step 4:** Delete the 4-card grid (Frontend Origin, Platform API Target, Base Mode, Next Operator Action). This information is already in the Client Environment panel.

**Test command:** `cd web && npx vitest run src/pages/superuser/SuperuserOperationalReadiness.test.tsx`

**Commit:** `refactor: collapse bootstrap panel to alert line with details`

---

### Task 5: Simplify Summary bar

**File(s):** `web/src/components/superuser/OperationalReadinessSummary.tsx`

**Step 1:** Remove the instructional text "Use this strip for count orientation, then move straight into surface triage." from the Authoritative Snapshot card.

**Step 2:** Keep the 4 status counter cards and the timestamp. No other changes.

**Commit:** `refactor: remove instructional text from readiness summary`

---

### Task 6: Update tests

**File(s):**
- `web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx`
- `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`
- `web/src/hooks/useOperationalReadiness.test.tsx`

**Step 1:** Delete `web/src/components/superuser/OperationalReadinessBootstrapPanel.test.tsx`.

**Step 2:** Update `OperationalReadinessCheckGrid.test.tsx` for the new flat table structure. Test that:
- Surface with all-OK checks renders as collapsed `<details>`
- Surface with a failing check renders as expanded
- Table shows status, check name, summary, and remediation columns
- Clicking a row expands the evidence section

**Step 3:** Update `SuperuserOperationalReadiness.test.tsx` for the new page structure.

**Step 4:** Update `useOperationalReadiness.test.tsx` to include `remediation` in test fixtures.

**Test command:** `cd web && npx vitest run src/components/superuser/ src/pages/superuser/SuperuserOperationalReadiness.test.tsx src/hooks/useOperationalReadiness.test.tsx`

**Commit:** `test: update readiness tests for redesigned components`

---

### Task 7: Run full test suite

**Test command:** `cd web && npx vitest run src/components/superuser/ src/components/admin/ src/components/layout/ src/pages/superuser/ src/hooks/useOperationalReadiness.test.tsx`

**Expected output:** All tests pass.

**Commit:** No commit — verification only.

---

## Explicit Risks Accepted In This Plan

1. The aspirational type fields (`cause`, `depends_on`, `available_actions`, etc.) stay in the type definition. They are not rendered. If the backend grows these fields later, a future plan can add the UI.
2. The bootstrap probe-card details are still accessible via `<details>` — they are collapsed, not deleted. An operator who needs probe-level HTTP status codes can still find them.
3. The `OperationalReadinessClientPanel` is kept as-is. It duplicates some info from bootstrap but is already collapsible and low-priority to fix.

## Completion Criteria

The work is complete only when all of the following are true:

1. Three dead component files are deleted.
2. The check grid is a flat table with 4 columns: Status, Check, Summary, Remediation.
3. The remediation text from the backend is visible in the table for every check.
4. Green surfaces auto-collapse. Failing surfaces auto-expand.
5. The bootstrap panel is one alert line when degraded, not 6 probe cards.
6. All tests pass.
7. The page shows useful, actionable information at a glance — not empty expandable panels.
