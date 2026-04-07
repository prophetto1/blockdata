# Assets Storage Quota Workbench Placement Fix Plan

The current Assets page quota surface is implemented, but it is mounted in the wrong ownership layer.

In [`web/src/pages/ProjectAssetsPage.tsx`](/e:/writing-system/web/src/pages/ProjectAssetsPage.tsx), the page renders `StorageQuotaSummary` inside a full-width shell header strip above the workbench. In the shipped UI, that creates a detached banner row that sits outside the left upload/files pane, leaves unused horizontal space across the preview column, and visually competes with the workbench tab chrome instead of reading as context for asset upload and file management.

The screenshot reflects the same implementation defect: the quota card is technically present, but it is spatially orphaned. The problem is not missing data. The problem is incorrect layout ownership and presentation.

## Scope

### Platform API

Zero platform API changes.

`GET /storage/quota` already exists, and this fix does not change routes, auth, request bodies, response bodies, or quota refresh behavior.

### Observability

Zero observability changes.

This is a frontend placement and presentation correction only. Existing storage quota read telemetry remains unchanged.

### Database Migrations

Zero database migrations.

No schema, policy, storage reservation, or quota-accounting changes are needed.

### Edge Functions

Zero edge function changes.

### Frontend Surface Area

- Reassign quota summary ownership from the page shell to the Assets workbench content surface.
- Replace the current detached stacked card treatment with a compact workbench-context treatment that belongs to the left upload/files pane.
- Preserve the existing `useStorageQuota()` fetch and refresh seam.
- Preserve existing upload completion quota refresh behavior.

## Confirmed Problem

The live defect is a layout-composition bug with three concrete symptoms:

1. The quota surface is mounted above the workbench instead of inside the workbench-owned asset management area.
2. The quota surface spans a page-level header row even though it only describes the left upload/files workflow, not the preview pane.
3. The visual treatment is too card-like and too tall for shell chrome, so it reads as a stray panel rather than contextual metadata.

## Root Cause

The current implementation follows the earlier storage rollout instruction to mount the quota summary in the page shell:

- [`web/src/pages/ProjectAssetsPage.tsx`](/e:/writing-system/web/src/pages/ProjectAssetsPage.tsx) creates a bordered row above `Workbench`.
- [`web/src/components/storage/StorageQuotaSummary.tsx`](/e:/writing-system/web/src/components/storage/StorageQuotaSummary.tsx) renders as a stacked card optimized for standalone placement.
- [`web/src/pages/useAssetsWorkbench.tsx`](/e:/writing-system/web/src/pages/useAssetsWorkbench.tsx) owns the actual upload/files/preview workspace, but the quota context is kept outside that workspace.

That ownership split is the defect. The quota context belongs to the workbench-controlled asset pane, not to a page-wide shell header.

## Locked Frontend Layout Contract

- The Assets page must not render a dedicated full-width quota header row above the workbench.
- The quota summary must be rendered inside the workbench-owned asset surface, aligned with the left-side upload/files pane rather than the preview pane.
- The quota summary must remain visible when the user is in the asset-management side of the experience and must not appear as floating chrome disconnected from the pane content below it.
- The quota summary must use a compact presentation suitable for workbench context chrome.
- On desktop widths, the quota summary must not consume a full-width page band across both panes.
- The preview pane must begin directly under its own tab chrome without a quota banner visually occupying the preview column above it.
- The existing upload completion refresh path must remain intact: successful upload completion still refreshes quota and document inventory.

## Locked Acceptance Contract

1. The yellow-box defect from the screenshot is removed because quota information is no longer rendered as a detached page-shell banner.
2. The quota summary is visually associated with the upload/files workspace it describes.
3. The preview column no longer has unused top-row quota space above it.
4. The Assets page still shows total, used, reserved, and remaining quota values.
5. The existing `platformApiFetch('/storage/quota')` read path remains unchanged.
6. Upload completion still refreshes quota without requiring a page reload.
7. No backend, migration, or storage-contract regressions are introduced.

## Locked File Inventory

### Modified frontend files

- `web/src/pages/ProjectAssetsPage.tsx`
- `web/src/pages/useAssetsWorkbench.tsx`
- `web/src/components/storage/StorageQuotaSummary.tsx`
- `web/src/pages/ProjectAssetsPage.test.tsx`

### New frontend files

- `web/src/components/storage/StorageQuotaSummary.test.tsx`

### Backend files

Zero.

### Database files

Zero.

## Existing - No Contract Change

- `web/src/hooks/useStorageQuota.ts`
- `web/src/components/documents/UploadTabPanel.tsx`
- `web/src/components/documents/DocumentFileTable.tsx`
- `web/src/components/documents/PreviewTabPanel.tsx`
- `web/src/lib/platformApi.ts`

## Explicit Supersession Of Prior Frontend Contract

This plan intentionally supersedes the quota-placement instruction in [`docs/plans/user-storage/2026-03-21-user-storage-signup-verification-implementation.md`](/e:/writing-system/docs/plans/user-storage/2026-03-21-user-storage-signup-verification-implementation.md).

It specifically replaces the prior instruction that the quota summary should be mounted in the real assets page shell in `ProjectAssetsPage.tsx`.

That earlier decision succeeded at visibility, but it produced the current layout defect. The authoritative contract after this plan is:

- quota visibility remains required
- page-shell placement is no longer authoritative
- workbench-owned pane placement becomes the correct UI contract

## Explicit Risks Accepted In This Plan

- Moving the quota surface into the workbench may require passing quota data deeper into the frontend tree. This is acceptable because the current page-shell ownership is the actual defect.
- The existing assets page tests only prove quota text presence and two-pane defaults; they do not currently lock placement. This plan accepts that and expands the tests rather than preserving the blind spot.
- A compact quota presentation may require a variant or class contract change in `StorageQuotaSummary.tsx`. That is acceptable because the current standalone-card styling is the wrong presentation for this surface.

## Completion Criteria

The work is complete only when all of the following are true:

1. `ProjectAssetsPage.tsx` no longer renders a dedicated quota banner row above `Workbench`.
2. The quota summary is rendered from the workbench-owned asset pane composition.
3. The quota summary styling is compact and visually integrated with the asset-management pane.
4. The quota values still render correctly for loading, error, and populated states.
5. `ProjectAssetsPage.test.tsx` proves the quota surface is present and no longer mounted as detached page-shell chrome.
6. `StorageQuotaSummary.test.tsx` proves the compact presentation contract.
7. Targeted frontend tests for the assets page and quota summary pass.

## Task 1: Move quota ownership from page shell to workbench composition

**File(s):** `web/src/pages/ProjectAssetsPage.tsx`, `web/src/pages/useAssetsWorkbench.tsx`

- Remove the page-level quota header strip from `ProjectAssetsPage.tsx`.
- Pass quota state into the assets workbench composition instead of rendering it above the workbench.
- Add a workbench-owned placement seam so the upload/files side can render quota context without affecting preview-pane top chrome.

## Task 2: Redesign the quota summary for compact pane-context presentation

**File(s):** `web/src/components/storage/StorageQuotaSummary.tsx`

- Replace the current detached stacked-card presentation with a compact treatment suitable for workbench context.
- Keep total, used, reserved, and remaining values intact.
- Preserve loading and error handling while aligning the component with the asset-pane layout contract.

## Task 3: Lock the new placement in tests

**File(s):** `web/src/pages/ProjectAssetsPage.test.tsx`, `web/src/components/storage/StorageQuotaSummary.test.tsx`

- Update page tests so they verify quota placement as part of the assets workbench contract, not just text presence.
- Add focused component tests for the compact quota summary rendering contract.
- Preserve the existing two-pane assets layout expectations.

## Task 4: Run targeted verification

**Test command:** `cd web && npm run test -- src/pages/ProjectAssetsPage.test.tsx src/components/storage/StorageQuotaSummary.test.tsx`

**Expected output:** Assets page tests prove the quota summary is still visible, now owned by the workbench composition, and no longer rendered as detached page-shell chrome.
