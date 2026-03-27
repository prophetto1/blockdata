# Storage Signup Verification Worktree Integration Plan

**Goal:** Integrate the unmerged `storage-signup-verification` worktree into `master` without losing feature content, while preserving scope discipline and verifying that the merged result matches the storage-signup feature surface already built in the worktree.

**Architecture:** Keep `services/platform-api` as the storage control plane, preserve the authenticated upload reservation flow under `/storage/*`, add superuser-only storage policy and provisioning-monitor endpoints under `/admin/storage/*`, keep quota-aware asset upload behavior in the existing `ProjectAssetsPage` flow, and bridge completed source uploads into `source_documents` so existing asset/document surfaces continue to function.

**Tech Stack:** FastAPI, Supabase Postgres migrations, React + TypeScript, OpenTelemetry, pytest, Vitest.

## Pre-Implementation Contract

No major product, API, observability, seam, or inventory decision may be improvised during implementation. If any locked item below needs to change, stop implementation and revise this plan first.

## Locked Product Decisions

1. The authenticated user-facing storage surface stays inside the existing assets flow centered on `ProjectAssetsPage.tsx`; this integration does not create a new top-level storage route.
2. The superuser storage administration surface lives inside `SuperuserWorkspace.tsx`, not a new standalone admin route.
3. `services/platform-api` remains the runtime storage control plane; this integration does not move storage behavior into edge functions.
4. `source_documents` remains the compatibility seam for uploaded source material in this phase.
5. The backend, not the browser, owns the bridge from completed source uploads into `source_documents`.
6. The worktree integration must preserve the existing `/storage/*` control-plane shape while adding the new `/admin/storage/*` surface.

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/storage/quota` | Read authenticated user quota summary | Modified |
| POST | `/storage/uploads` | Reserve upload slot and issue signed upload URL | Modified |
| POST | `/storage/uploads/{reservation_id}/complete` | Finalize upload, consume reservation, bridge to `source_documents` | Modified |
| DELETE | `/storage/uploads/{reservation_id}` | Cancel pending reservation | Existing behavior retained, instrumentation/contract touched |
| DELETE | `/storage/objects/{storage_object_id}` | Delete storage object | Existing behavior retained, instrumentation/contract touched |
| POST | `/storage/quota/reconcile` | Reconcile quota accounting | Existing behavior retained, instrumentation/contract touched |
| GET | `/admin/storage/policy` | Read default new-user storage quota | New |
| PATCH | `/admin/storage/policy` | Update default new-user storage quota | New |
| GET | `/admin/storage/provisioning/recent` | Inspect recent signup storage provisioning outcomes | New |

#### New endpoint contracts

`GET /admin/storage/policy`

- Auth: `require_superuser`
- Request: no body
- Response: `default_new_user_quota_bytes`, `updated_at`, `updated_by`
- Touches: `public.admin_runtime_policy`

`PATCH /admin/storage/policy`

- Auth: `require_superuser`
- Request: `default_new_user_quota_bytes`, `reason`
- Response: same policy payload as `GET`
- Touches: `public.admin_runtime_policy`, `public.admin_runtime_policy_audit`

`GET /admin/storage/provisioning/recent`

- Auth: `require_superuser`
- Request: query `limit`
- Response: `items[]` summarizing recent provisioning outcomes
- Touches: recent signup/provisioning data queried via Supabase admin client

#### Modified endpoint contracts

`GET /storage/quota`

- Change: quota-read contract is now a first-class dependency of the authenticated assets UI and emits dedicated quota-read telemetry
- Why: `ProjectAssetsPage` now surfaces quota information, so this endpoint is part of the user-visible storage state contract rather than a hidden helper

`POST /storage/uploads`

- Change: supports reservation metadata needed for source uploads, including `source_uid`, `source_type`, and `doc_title`
- Why: upload reservation must preserve identity and metadata needed for later `source_documents` write-through

`POST /storage/uploads/{reservation_id}/complete`

- Change: finalization path now bridges completed source uploads into `source_documents`
- Why: existing asset/document surfaces still rely on `source_documents` as the compatibility seam

`DELETE /storage/uploads/{reservation_id}`

- Change: cancellation path becomes part of the browser upload cleanup flow and emits cancellation telemetry
- Why: the direct-upload browser path now performs best-effort reservation cleanup when a signed upload fails

`DELETE /storage/objects/{storage_object_id}`

- Change: object deletion remains behaviorally the same but becomes part of the quota-aware storage surface and emits deletion telemetry
- Why: quota correctness and storage object lifecycle are now exposed through the same storage control-plane integration

`POST /storage/quota/reconcile`

- Change: reconcile remains behaviorally the same but is now explicitly part of the locked storage control-plane verification surface
- Why: quota drift diagnosis is part of verifying the signup-quota and upload-accounting integration even though this worktree does not add new reconcile-specific tracing

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Counter | `platform.storage.quota.read.count` | `storage_metrics.py` / `storage.py` | Count quota reads |
| Counter | `platform.storage.upload.reserve.count` | `storage_metrics.py` / `storage.py` | Count successful reservations |
| Counter | `platform.storage.upload.reserve.failure.count` | `storage_metrics.py` / `storage.py` | Count reservation failures |
| Counter | `platform.storage.upload.complete.count` | `storage_metrics.py` / `storage.py` | Count successful finalizations |
| Counter | `platform.storage.upload.complete.failure.count` | `storage_metrics.py` / `storage.py` | Count finalization failures |
| Counter | `platform.storage.upload.cancel.count` | `storage_metrics.py` / `storage.py` | Count reservation cancellations |
| Counter | `platform.storage.object.delete.count` | `storage_metrics.py` / `storage.py` | Count object deletions |
| Counter | `platform.storage.quota.exceeded.count` | `storage_metrics.py` / `storage.py` | Count over-quota rejections |
| Counter | `platform.admin.storage.policy.update.count` | `storage_metrics.py` / `admin_storage.py` | Count superuser policy updates |
| Counter | `platform.admin.storage.provisioning.incomplete.count` | `storage_metrics.py` / `admin_storage.py` | Count incomplete provisioning rows returned |
| Histogram | `platform.storage.upload.reserve.duration.ms` | `storage_metrics.py` / `storage.py` | Measure reservation latency |
| Histogram | `platform.storage.upload.complete.duration.ms` | `storage_metrics.py` / `storage.py` | Measure completion latency |
| Histogram | `platform.admin.storage.policy.duration.ms` | `storage_metrics.py` / `admin_storage.py` | Measure policy read/update latency |
| Histogram | `platform.admin.storage.provisioning.query.duration.ms` | `storage_metrics.py` / `admin_storage.py` | Measure provisioning query latency |
| Trace span | `storage.quota.read` | `storage.py` | Trace quota reads |
| Trace span | `storage.upload.reserve` | `storage.py` | Trace reservation flow |
| Trace span | `storage.upload.sign_url` | `storage.py` | Trace signed-upload URL creation |
| Trace span | `storage.upload.complete` | `storage.py` | Trace completion flow |
| Trace span | `admin.storage.policy.read` | `admin_storage.py` | Trace policy reads |
| Trace span | `admin.storage.policy.update` | `admin_storage.py` | Trace policy updates |
| Trace span | `admin.storage.provisioning.recent` | `admin_storage.py` | Trace provisioning inspection |
| Structured log | `admin.storage.policy.updated` | `admin_storage.py` | Audit policy updates |
| Structured log | `admin.storage.provisioning.incomplete` | `admin_storage.py` | Flag incomplete provisioning rows |

Attribute discipline:

- Allowed attributes: byte counts, quota counts, limit, result, status, HTTP status code, storage kind, source type
- Forbidden in trace/metric attributes: user ids, emails, raw filenames, object keys, `source_uid`

## Locked Platform API Surface

### New superuser-only platform API endpoints: `3`

1. `GET /admin/storage/policy`
2. `PATCH /admin/storage/policy`
3. `GET /admin/storage/provisioning/recent`

### Modified authenticated storage endpoints: `6`

1. `GET /storage/quota`
2. `POST /storage/uploads`
3. `POST /storage/uploads/{reservation_id}/complete`
4. `DELETE /storage/uploads/{reservation_id}`
5. `DELETE /storage/objects/{storage_object_id}`
6. `POST /storage/quota/reconcile`

Locked rule:

- do not add, remove, rename, or reroute any endpoint during integration unless this plan is revised first

## Locked Observability Surface

### Traces: `7`

1. `storage.quota.read`
2. `storage.upload.reserve`
3. `storage.upload.sign_url`
4. `storage.upload.complete`
5. `admin.storage.policy.read`
6. `admin.storage.policy.update`
7. `admin.storage.provisioning.recent`

### Counters: `10`

1. `platform.storage.quota.read.count`
2. `platform.storage.upload.reserve.count`
3. `platform.storage.upload.reserve.failure.count`
4. `platform.storage.upload.complete.count`
5. `platform.storage.upload.complete.failure.count`
6. `platform.storage.upload.cancel.count`
7. `platform.storage.object.delete.count`
8. `platform.storage.quota.exceeded.count`
9. `platform.admin.storage.policy.update.count`
10. `platform.admin.storage.provisioning.incomplete.count`

### Histograms: `4`

1. `platform.storage.upload.reserve.duration.ms`
2. `platform.storage.upload.complete.duration.ms`
3. `platform.admin.storage.policy.duration.ms`
4. `platform.admin.storage.provisioning.query.duration.ms`

### Structured logs: `2`

1. `admin.storage.policy.updated`
2. `admin.storage.provisioning.incomplete`

Locked rule:

- trace/metric attribute discipline remains exactly as declared in the Manifest / Observability section
- do not silently add observability names outside this set during integration

### Database Migrations

| Migration | Change | Existing data impact |
|-----------|--------|----------------------|
| `20260321120000_storage_default_quota_policy.sql` | Moves default signup quota to `admin_runtime_policy` and related policy read/update path | Existing default preserved, new policy row seeded |
| `20260321130000_storage_source_document_bridge.sql` | Extends reservation metadata and enables `source_documents` bridge on upload completion | Existing reservation/finalization behavior broadened for source uploads |

### Edge Functions

No new edge functions. This integration keeps storage behavior in `services/platform-api`.

### Frontend

Modified:

- `web/src/pages/ProjectAssetsPage.tsx`
- `web/src/pages/ProjectAssetsPage.test.tsx`
- `web/src/pages/project-assets-sync.test.tsx`
- `web/src/pages/useAssetsWorkbench.tsx`
- `web/src/components/flows/FlowWorkbench.tsx`
- `web/src/hooks/useDirectUpload.ts`
- `web/src/pages/superuser/SuperuserWorkspace.tsx`

New:

- `web/src/components/storage/StorageQuotaSummary.tsx`
- `web/src/hooks/useStorageQuota.ts`
- `web/src/hooks/useDirectUpload.test.tsx`
- `web/src/lib/storageUploadService.ts`
- `web/src/lib/storageUploadService.test.ts`
- `web/src/pages/superuser/SuperuserStoragePolicy.tsx`
- `web/src/pages/superuser/SuperuserProvisioningMonitor.tsx`
- `web/src/pages/superuser/SuperuserWorkspaceStorage.test.tsx`

Package surface:

- `web/package.json`
- `web/package-lock.json`

Locked package note:

- `@noble/hashes` is treated as feature-required unless direct inspection during integration proves the hashing path can be satisfied by an already-installed dependency.

## Frozen Seam Contract

`source_documents` remains the compatibility seam for uploaded source material.

Locked seam rules:

- completed source uploads must still write through to `source_documents`
- `source_uid` remains the identity key for storage-to-document linkage
- the bridge must not require a separate browser-side persistence step after upload completion
- existing assets/document surfaces must continue reading the resulting document state through the current `source_documents` path
- if integration reveals a need to replace this seam rather than preserve it, stop and get explicit approval before proceeding

## Locked File Inventory

### Backend

- `services/platform-api/app/api/routes/storage.py`
- `services/platform-api/app/api/routes/admin_storage.py`
- `services/platform-api/app/observability/storage_metrics.py`
- `services/platform-api/app/services/storage_source_documents.py`
- `services/platform-api/app/main.py`
- `services/platform-api/tests/test_storage_routes.py`
- `services/platform-api/tests/test_admin_storage_routes.py`
- `services/platform-api/tests/test_storage_source_documents.py`

### Database

- `supabase/migrations/20260321120000_storage_default_quota_policy.sql`
- `supabase/migrations/20260321130000_storage_source_document_bridge.sql`

### Frontend

- `web/src/pages/ProjectAssetsPage.tsx`
- `web/src/pages/ProjectAssetsPage.test.tsx`
- `web/src/pages/project-assets-sync.test.tsx`
- `web/src/pages/useAssetsWorkbench.tsx`
- `web/src/components/flows/FlowWorkbench.tsx`
- `web/src/components/storage/StorageQuotaSummary.tsx`
- `web/src/hooks/useDirectUpload.ts`
- `web/src/hooks/useDirectUpload.test.tsx`
- `web/src/hooks/useStorageQuota.ts`
- `web/src/lib/storageUploadService.ts`
- `web/src/lib/storageUploadService.test.ts`
- `web/src/pages/superuser/SuperuserWorkspace.tsx`
- `web/src/pages/superuser/SuperuserStoragePolicy.tsx`
- `web/src/pages/superuser/SuperuserProvisioningMonitor.tsx`
- `web/src/pages/superuser/SuperuserWorkspaceStorage.test.tsx`

### Package

- `web/package.json`
- `web/package-lock.json`

## Locked Acceptance Contract

1. `master` receives the full storage-signup-verification feature surface from the worktree with no manual file-copy process.
2. Upload reservation and completion flows continue to work through `/storage/uploads` and `/storage/uploads/{reservation_id}/complete`.
3. Source uploads complete with `source_documents` write-through preserved.
4. Project assets surfaces display storage quota information.
5. Superuser workspace exposes storage policy and provisioning monitor panels.
6. New admin storage endpoints are mounted in `services/platform-api/app/main.py`.
7. Storage/admin backend tests pass on the integrated branch before merge.
8. Storage/admin/frontend tests pass again on `master` after merge.
9. Incidental churn is excluded unless proven feature-required.
10. Worktree is deleted only after merged verification passes.

## Locked Inventory Counts

- New route modules: `1`
- Modified route modules: `1`
- New observability modules: `1`
- New service modules: `1`
- Modified API entrypoints: `1`
- New migrations: `2`
- New backend test modules: `2`
- Modified backend test modules: `1`
- New frontend components: `1`
- New frontend hooks: `1`
- Modified frontend hooks: `1`
- New frontend libs: `1`
- New frontend lib tests: `1`
- New frontend pages/panels: `2`
- New frontend page tests: `1`
- Modified frontend pages: `4`
- Modified frontend tests: `2`
- Package manifest files touched: `2`

## Explicit Risks

- The worktree is not disposable: `master` is missing both tracked changes and multiple new files.
- `web/package.json` / `web/package-lock.json` must not be dropped unless hashing support is proven unnecessary.
- Supabase migration drift already exists in this repo; migration verification may require separate reconciliation before remote push.
- The small detached worktree modifying `AGENTS.md` is separate and out of scope for this integration.

## Execution Tasks

### Task 1 — Freeze and review the worktree diff

Files:

- all files listed in `Locked File Inventory`

Actions:

1. Confirm the worktree is still limited to the declared storage feature surface.
2. Classify every touched file as `feature-required` or `incidental`.
3. Stop and ask before removing any touched file that is not clearly incidental.

Verification:

- `git -C E:\\writing-system\\.worktrees\\storage-signup-verification status --short`
- expected: only declared files remain in scope after review

### Task 2 — Commit the storage feature cleanly in the worktree

Actions:

1. Stage only the verified storage feature files.
2. Exclude unrelated residue.
3. Create one clean commit for the integrated feature with message: `Integrate storage signup verification worktree`.

Verification:

- `git -C E:\\writing-system\\.worktrees\\storage-signup-verification diff --cached --stat`
- expected: staged set matches the locked inventory

### Task 3 — Rebase the worktree branch onto current `master`

Actions:

1. Rebase `codex/user-storage-signup-verification` onto current `master`.
2. Resolve conflicts by keeping the declared storage feature behavior.
3. Do not widen scope while resolving conflicts.

Verification:

- `git -C E:\\writing-system\\.worktrees\\storage-signup-verification rebase master`
- expected: rebase completes with no unresolved conflicts

### Task 4 — Verify on the rebased branch

Commands:

- `cd E:\\writing-system\\.worktrees\\storage-signup-verification && pytest services/platform-api/tests/test_storage_routes.py services/platform-api/tests/test_admin_storage_routes.py services/platform-api/tests/test_storage_source_documents.py -q`
- `cd E:\\writing-system\\.worktrees\\storage-signup-verification\\web && npm test -- src/pages/ProjectAssetsPage.test.tsx src/pages/project-assets-sync.test.tsx src/hooks/useDirectUpload.test.tsx src/lib/storageUploadService.test.ts src/pages/superuser/SuperuserWorkspaceStorage.test.tsx`

Expected:

- backend tests pass
- frontend tests pass

### Task 5 — Merge into `master`

Actions:

1. Merge the rebased `codex/user-storage-signup-verification` branch into `master`.
2. Do not squash away the storage feature commit without explicit request.

Verification:

- `git -C E:\\writing-system merge --no-ff codex/user-storage-signup-verification`
- expected: merge completes cleanly

### Task 6 — Verify on merged `master`

Commands:

- `cd E:\\writing-system && pytest services/platform-api/tests/test_storage_routes.py services/platform-api/tests/test_admin_storage_routes.py services/platform-api/tests/test_storage_source_documents.py -q`
- `cd E:\\writing-system\\web && npm test -- src/pages/ProjectAssetsPage.test.tsx src/pages/project-assets-sync.test.tsx src/hooks/useDirectUpload.test.tsx src/lib/storageUploadService.test.ts src/pages/superuser/SuperuserWorkspaceStorage.test.tsx`

Expected:

- merged `master` passes the storage verification set

### Task 7 — Delete the worktree only after merged verification passes

Actions:

1. Remove the worktree from git management.
2. Delete the branch only after the merge is confirmed.
3. Remove the physical directory if no process is locking it.

Verification:

- `git -C E:\\writing-system worktree list`
- expected: `storage-signup-verification` no longer appears

## Completion Criteria

- The full storage-signup-verification feature is present on `master`
- Rebased-branch verification passed
- Post-merge `master` verification passed
- No unique storage work remains only in the worktree
- Worktree and branch are removed or any deletion blocker is explicitly documented
