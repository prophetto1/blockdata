Frontend Storage Upload Migration (Supabase Uppy/ingest â†’ Platform API + GCS Signed Upload Flow) Implementation Plan
For Claude: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

Goal: Migrate all browser upload submission paths to the new FastAPI storage control plane (reserve -> signed URL PUT -> complete) while keeping Uppy fully removed from upload submission, and make deletion + quota flows reflect backend storage objects.

Architecture: Introduce one shared frontend storage client/service as the only upload control-plane path. Uploaders become lightweight UI/state wrappers that call that service. Backend calls remain in source-of-truth format for storage quota accounting, reservation lifecycle, and object metadata.

Tech Stack: React, TypeScript, React Router, existing auth/session layer in app, Fetch client wrapper to platform API, optional E2E runner, unit test tooling already used in repo.

Team Feedback Incorporated (Delta from prior draft)
ParsePage.tsx is a shell, not the migration owner.
useParseWorkbench.tsx is a real behavior owner for parse workbench upload + delete flows.
DocumentsPage.tsx imports upload components and must be in migration scope.
Deletion migration must include handler layers:
useAssetsWorkbench.tsx
useParseWorkbench.tsx
not just presentational components.
FlowWorkbench.tsx still posts to edgeFetch('ingest', ...) and must be migrated or intentionally deferred.
Remote-import flows in UploadTabPanel.tsx (google-drive/dropbox import) are separate concerns; explicit out-of-scope note.
Scope
In-scope:

POST /storage/uploads
PUT {signed_upload_url}
POST /storage/uploads/{reservation_id}/complete
DELETE /storage/uploads/{reservation_id}
DELETE /storage/objects/{storage_object_id}
GET /storage/quota
POST /storage/quota/reconcile (admin/support action, optional UI action)
Explicit out-of-scope for this phase:

Cloud import flows that already use separate edge endpoints.
Full migration of non-storage metadata tables beyond compatibility layer decisions.
Important phase gate: `useProjectDocuments.ts` is the live documents/realtime spine in the current UI. Until this compatibility decision is finalized, upload migration should stay behind Task 8 because Documents/Assets/Parse views currently depend on that shape.

Backend Contract Assumptions
Create reservation: POST /storage/uploads

body includes: `project_id` (required and non-empty), filename, expected_bytes, content_type, storage_kind, source_uid?
success returns { reservation_id, bucket, object_key, signed_upload_url }
Upload bytes: PUT signed_upload_url

body is raw file bytes
Content-Type must be set
Finalize: POST /storage/uploads/{reservation_id}/complete

body: { actual_bytes, checksum_sha256? }
Cancel: DELETE /storage/uploads/{reservation_id}

Delete object: DELETE /storage/objects/{storage_object_id}

Quota: GET /storage/quota

Route/Component Migration Matrix (Exact file ownership)
web/src/lib/storageUploadService.ts (new shared service)
web/src/hooks/useDirectUpload.ts (replace edge submit path)
web/src/components/documents/UploadTabPanel.tsx (UI wrapper for direct/file-picker flow)
web/src/components/documents/useUppyTransport.ts (remove/replace)
web/src/components/documents/ProjectParseUppyUploader.tsx (remove Uppy transport dependency)
web/src/pages/ParsePage.tsx (route shell verification only)
web/src/pages/useParseWorkbench.tsx (real delete/submit behavior migration)
web/src/components/flows/FlowWorkbench.tsx (remove ingest edge upload submission path)
web/src/pages/useAssetsWorkbench.tsx (upload/delete handler migration)
web/src/pages/DocumentsPage.tsx (UploadTabPanel integration compatibility)
web/src/pages/settings/index.ts + web/src/pages/settings/SettingsPageHeader.tsx + web/src/components/shell/nav-config.ts (quota view route/UI entry)
Optional: web/src/lib/edge.ts and related edge helper imports in touched paths if no longer needed for upload paths.
Prerequisite before Task 1/Task 2/Task 4/Task 5/Task 7:
Task 0 â€” source_documents parity decision and contract bridge (phase gate)

No UI migration task that impacts list/delete semantics should be finalized until this is implemented or feature-gated.

Task 1 â€” Build canonical storage upload client
Files

Create: e:\writing-system\web\src\lib\storageUploadService.ts
Implementation goals

Export typed methods:
createUploadReservation
uploadToSignedUrl
completeUpload
cancelReservation
deleteStorageObject
getStorageQuota
reconcileStorageUsage (optional)
Centralize status mapping:
413, 403, 409, 410, 422, 500 handling into predictable exceptions.
uploadToSignedUrl should perform raw PUT, not multipart/form-data.
Success criteria

Service has zero dependency on Uppy.
Service is the only frontend module performing the 3-step storage protocol.
Commit suggestion

chore(frontend): add shared storage upload client
Task 2 â€” Replace direct upload hook path
Files

Modify: e:\writing-system\web\src\hooks\useDirectUpload.ts
Modify: e:\writing-system\web\src\components\documents\UploadTabPanel.tsx
Exact call order

createUploadReservation
uploadToSignedUrl
completeUpload
on success, callback emits storage_object result
on any terminal error, cleanup policy (step-specific below)
Response handling

413 from step 1 or 3 â†’ show quota/file-size limit error.
422 from step 1 â†’ show validation error (bad filename/content-type/project).
403 from step 1 â†’ ownership/project permission error.
network failure at step 2 â†’ cancelReservation and show retry.
410 from step 3 â†’ show expired upload message and offer one-shot re-reserve flow.
409 on complete:
if already completed semantics, treat as idempotent success
otherwise show recoverable conflict with user retry.
Test intent

unit/integration test simulating each terminal status.
Commit suggestion

feat(frontend): migrate useDirectUpload and UploadTabPanel to platform storage flow
Task 3 â€” Remove Uppy transport from parse uploader path
Files

Replace: e:\writing-system\web\src\components\documents\useUppyTransport.ts
Replace/remove: e:\writing-system\web\src\components\documents\ProjectParseUppyUploader.tsx
Implementation

Remove Uppy dependency from upload execution.
Keep UX behaviors (file list, progress, success/error states) as-is.
Reuse the same 3-step service pipeline used in Task 2.
Ensure multi-file behavior, per-file independent retry.
Commit suggestion

refactor(frontend): remove Uppy transport for project parse uploader
Task 4 â€” Migrate parse handler logic owner
Files

Modify: e:\writing-system\web\src\pages\useParseWorkbench.tsx
Exact call order for parse-related uploads

Service upload create/upload/complete
On success: hand the returned storage object metadata to parse trigger through the existing compatibility contract.
If parse triggers still depend on `source_uid` / `source_documents`, explicitly bridge before starting parse (do not assume direct `storage_object_id` is already accepted).
Keep parse reset as a parse-domain action and do not conflate it with storage object deletion.
On uploaded-file delete:
call deleteStorageObject(storage_object_id)
then clear local file cleanup state.
Delete migration requirement

Remove manage-document upload-path submission usage for these flows.
Retain or gate any old source_documents cleanup only if required by parity strategy (see Task 8).
Commit suggestion

feat(parse): migrate parse workbench upload + delete to storage object backend
Task 5 â€” Migrate FlowWorkbench ingest path
Files

Modify: e:\writing-system\web\src\components\flows/FlowWorkbench.tsx (actual path under repo)
Requirements

Replace any direct edgeFetch('ingest', ...) upload-submission usage.
Route through shared storage service.
On completion, preserve existing post-upload behavior with updated object contract.
Error handling parity

Use same status mapping as Task 2.
On failure after reservation creation but before complete, cancel and surface retry.
Commit suggestion

feat(parse): replace ingest-edge upload in FlowWorkbench with platform storage flow
Task 6 â€” Migrate documents page upload integration points
Files

Inspect/modify: e:\writing-system\web\src\pages\DocumentsPage.tsx
Ensure component contracts with UploadTabPanel callback align with new return shape.
Acceptance

No remaining direct upload submission path from this page to ingest edge.
Commit suggestion

fix(docs): align DocumentsPage with migrated UploadTabPanel contract
Task 7 â€” Update assets workbench handler layer (delete + post-upload reconciliation)
Files

Modify: e:\writing-system\web\src\pages\useAssetsWorkbench.tsx
Exact behavior

Upload entry is delegated through UploadTabPanel:
focus on post-upload list refresh wiring and consistency updates.
Delete:
call deleteStorageObject(storage_object_id) from storage layer
then refresh quota
handle stale/404 as no-op UI cleanup.
Delete migration note

If UI currently relies on manage-document side effects, keep temporary bridge until source_documents parity is complete.
Commit suggestion

feat(assets): migrate assets workbench upload/delete to storage-object APIs
Task 8 â€” source_documents parity strategy (phase gate, must decide before Tasks 2/4 close)
Problem

`useProjectDocuments.ts` is the current list/realtime spine for DocumentsPage, Assets, and Parse workbench views.

Decision checkpoint

Existing list/realtime views depend on legacy source_documents shape.

Choose one:
- Backend write-through (preferred): when upload completes, backend creates/updates corresponding source_documents rows for immediate UI compatibility.
- Frontend shim (short-term): create/update temporary local representations and adapt list adapters.

Until one path is implemented, treat full migration as feature-gated.

Files

- If option 1: backend route or migration-level trigger/service update outside this frontend doc.
- If option 2: frontend adapters in list hooks used by assets/parse pages (scope to be identified during implementation).
Task 9 â€” Add quota visibility in settings
Files

Modify: e:\writing-system\web\src\pages\settings\index.ts
Modify: e:\writing-system\web\src\pages\settings\SettingsPageHeader.tsx
Modify: e:\writing-system\web\src\components\shell\nav-config.ts
Behavior

Add settings route and menu entry for storage usage.
On mount:
GET /storage/quota
render used/reserved/limit and percentage bar.
Trigger refresh after upload/complete/cancel/delete outcomes.
Commit suggestion

feat(settings): add storage quota view
Task 10 â€” Remove legacy upload edge usages from browser-managed local upload submission surface
Validation sweep command

Search for remaining direct browser-managed local upload submission calls:
edgeFetch("ingest"...
supabase/functions/v1/ingest
manage-document in upload/complete actions
uppy in component import/runtime paths

Do not include cloud-import flows (google-drive-import, dropbox-import) in this task unless explicitly deferred out-of-scope.
Files to clean

e:\writing-system\web\src\components\documents\useUppyTransport.ts (delete/rewrite)
e:\writing-system\web\src\components\documents\ProjectParseUppyUploader.tsx (delete/rewrite)
Dependency cleanup

Remove Uppy imports from package.json only if no other routes still depend on it.
Commit suggestion

chore(frontend): eliminate legacy ingest submission paths and Uppy upload transport
Task 11 â€” End-to-end behavior tests
Minimal TDD tasks

Add/extend tests under existing frontend test setup for:
reservation create success and failure branches
signed URL upload timeout/network retry + cancel
complete conflict/expired/idempotent path
delete path 404 and success behavior
quota refresh after mutation
Suggested test files

e:\writing-system\web\src\lib\storageUploadService.test.ts
e:\writing-system\web\src\hooks\useDirectUpload.test.tsx
e:\writing-system\web\src\components\documents\UploadTabPanel.test.tsx
e:\writing-system\web\src\pages\useParseWorkbench.test.tsx
Commands

run unit suite targeted to touched modules first.
then run route-level/integration suite covering DocumentsPage, Parse and Assets paths.
Task 12 â€” Acceptance checklist (manual + automated)
Automated acceptance

grep/scan shows no direct browser submission to ingest edge.
no useUppyTransport call chain from active upload paths.
all delete actions in assets/parse workbenches call deleteStorageObject.
quota read endpoint is called after mutation events.
Manual acceptance

Upload one file:
create reservation
PUT upload
complete
appears in list quickly
Retry same completion:
backend idempotency honored
Expired reservation path:
returns recovery prompt and successful re-upload flow
Cancel stale upload:
reservation cleanup works (quota not incremented).
Delete object:
visible list updates
quota decreases on refresh.
Rollout plan (safe)
Implement service + direct upload path (Task 1 + 2).
Migrate parse/workbench handlers (Tasks 4 + 5 + 6).
Migrate assets handlers (Task 7).
Quota settings screen (Task 9).
Remove Uppy and legacy edge submission (Task 10).
Final cleanup sweep + parity check (Task 11 + 12).
Release with feature flag if needed for rollback window.
Risks and mitigations
Source_documents mismatch risk: handled explicitly in Task 8.
Remote import path mismatch: keep explicit out-of-scope note in UploadTabPanel.
Quota mismatch visibility: ensure post-op quota refresh on every successful/failed mutation.
Concurrent uploads: use independent per-file state and independent reservation IDs.
Suggested file save location
e:\writing-system\docs\plans\2026-03-20-frontend-storage-upload-migration-no-uppy.md



Modified files: 12â€“16

Core migration items likely touch:
web/src/hooks/useDirectUpload.ts
web/src/components/documents/UploadTabPanel.tsx
web/src/pages/useParseWorkbench.tsx
web/src/components/flows/FlowWorkbench.tsx
web/src/pages/useAssetsWorkbench.tsx
web/src/pages/DocumentsPage.tsx
web/src/pages/settings/index.ts
web/src/pages/settings/SettingsPageHeader.tsx
web/src/components/shell/nav-config.ts
web/src/components/documents/useUppyTransport.ts (if kept as shim)
plus test/edit paths as needed (see below)
If you also touch optional compatibility bridges, this grows to ~16.
New files: 4â€“7

Required:
web/src/lib/storageUploadService.ts (new shared client)
Test files (likely):
web/src/lib/storageUploadService.test.ts
web/src/hooks/useDirectUpload.test.tsx
web/src/components/documents/UploadTabPanel.test.tsx
web/src/pages/useParseWorkbench.test.tsx
Optional:
web/src/pages/settings/SettingsStorage.tsx (if adding a dedicated quota screen)
Deleted files: 1â€“2

web/src/components/documents/useUppyTransport.ts (removed/replaced)
web/src/components/documents/ProjectParseUppyUploader.tsx (if fully retired with the migration)
Expected lines of code:

Roughly 900â€“1,500 LOC total.
Typical split:
New storageUploadService.ts: ~200â€“320
Upload path rewrites across UI hooks/components: ~350â€“700
Settings + nav + glue: ~120â€“250
Error handling and compatibility points: ~150â€“300
Tests: ~300â€“500 (if all four test files are added)
---

## Implementation Simulation Addendum (for handoff / next dev)

This section captures a concrete implementation draft and can be handed directly to another engineer.

### A) New shared client (single source of truth)

Create: `web/src/lib/storageUploadService.ts`

```ts
// e:\writing-system\web\src\lib\storageUploadService.ts
import { platformApiFetch } from "@/lib/platformApi";

export type StorageKind = "source" | "converted" | "parsed" | "export";

export type StorageReservation = {
  reservation_id: string;
  bucket: string;
  object_key: string;
  signed_upload_url: string;
};

export type StorageObject = {
  storage_object_id: string;
  owner_user_id: string;
  project_id: string;
  bucket: string;
  object_key: string;
  byte_size: number;
  content_type: string;
  storage_kind: StorageKind;
  source_uid?: string | null;
  status: "active" | "deleted";
  created_at: string;
};

export type StorageQuota = {
  user_id: string;
  quota_bytes: number;
  used_bytes: number;
  reserved_bytes: number;
};

export type StorageUploadErrorCode =
  | "AUTH"
  | "PERMISSION"
  | "VALIDATION"
  | "TOO_LARGE"
  | "EXPIRED"
  | "CONFLICT"
  | "NOT_FOUND"
  | "NETWORK"
  | "SERVER";

export class StorageUploadError extends Error {
  constructor(
    public code: StorageUploadErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "StorageUploadError";
  }
}

function mapUploadError(status: number, message: string, details?: unknown): StorageUploadError {
  if (status === 403) return new StorageUploadError("PERMISSION", message, details);
  if (status === 422) return new StorageUploadError("VALIDATION", message, details);
  if (status === 413) return new StorageUploadError("TOO_LARGE", message, details);
  if (status === 410) return new StorageUploadError("EXPIRED", message, details);
  if (status === 409) return new StorageUploadError("CONFLICT", message, details);
  if (status === 404) return new StorageUploadError("NOT_FOUND", message, details);
  if (status >= 500) return new StorageUploadError("SERVER", message, details);
  return new StorageUploadError("NETWORK", message, details);
}

async function parseError(res: Response, fallback: string): Promise<never> {
  const bodyText = await res.text().catch(() => "");
  let detail = fallback;
  try {
    const body = bodyText ? JSON.parse(bodyText) : undefined;
    detail = body?.detail || detail;
    throw mapUploadError(res.status, detail, body);
  } catch (e) {
    if (e instanceof StorageUploadError) throw e;
    throw mapUploadError(res.status, detail, bodyText);
  }
}

export type CreateUploadRequest = {
  project_id: string;
  filename: string;
  expected_bytes: number;
  content_type: string;
  storage_kind: StorageKind;
  source_uid?: string | null;
  artifact_name?: string | null;
};

export type CompleteUploadRequest = {
  actual_bytes: number;
  checksum_sha256?: string;
};

export type UploadFlowOptions = {
  /**
   * Return a StorageObject when caller can recover idempotent/duplicate completion.
   */
  onConflictAsSuccess?: (error: StorageUploadError) => Promise<StorageObject | undefined> | StorageObject | undefined;
};

function isRetryableCompleteConflict(error: StorageUploadError): boolean {
  if (error.code !== "CONFLICT") return false;
  const msg = String(error.message || "").toLowerCase();
  return msg.includes("already") && msg.includes("completed");
}

export async function createUploadReservation(body: CreateUploadRequest): Promise<StorageReservation> {
  const res = await platformApiFetch("/storage/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await parseError(res, `Failed to create upload reservation (${res.status} ${res.statusText})`);
  }
  const data = (await res.json()) as StorageReservation;
  if (!data?.reservation_id || !data?.signed_upload_url) {
    throw new StorageUploadError("SERVER", "Reservation response missing required fields", data);
  }
  return data;
}

export async function uploadToSignedUrl(signedUploadUrl: string, file: File): Promise<void> {
  const res = await fetch(signedUploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw mapUploadError(res.status, `Failed to upload to signed URL (${res.status})`, text);
  }
}

export async function completeUpload(
  reservationId: string,
  request: CompleteUploadRequest,
): Promise<StorageObject> {
  const res = await platformApiFetch(`/storage/uploads/${encodeURIComponent(reservationId)}/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    await parseError(res, `Failed to finalize upload (${res.status} ${res.statusText})`);
  }

  return (await res.json()) as StorageObject;
}

export async function cancelUploadReservation(reservationId: string): Promise<void> {
  const res = await platformApiFetch(`/storage/uploads/${encodeURIComponent(reservationId)}`, {
    method: "DELETE",
  });

  // cancellation is best effort. treat 404 as acceptable idempotency.
  if (!res.ok && res.status !== 404) {
    await parseError(res, `Failed to cancel reservation (${res.status} ${res.statusText})`);
  }
}

export async function deleteStorageObject(storageObjectId: string): Promise<boolean> {
  const res = await platformApiFetch(`/storage/objects/${encodeURIComponent(storageObjectId)}`, {
    method: "DELETE",
  });

  if (res.status === 404) return false;
  if (!res.ok) {
    await parseError(res, `Failed to delete object (${res.status} ${res.statusText})`);
  }
  return true;
}

export async function fetchStorageQuota(): Promise<StorageQuota> {
  const res = await platformApiFetch("/storage/quota", { method: "GET" });

  if (!res.ok) {
    await parseError(res, `Failed to fetch quota (${res.status} ${res.statusText})`);
  }

  return (await res.json()) as StorageQuota;
}

export async function reconcileStorageUsage(): Promise<void> {
  const res = await platformApiFetch("/storage/quota/reconcile", {
    method: "POST",
  });
  if (!res.ok) {
    await parseError(res, `Failed to reconcile quota (${res.status} ${res.statusText})`);
  }
}

export async function completeUploadWithRecovery(
  reservationId: string,
  request: CompleteUploadRequest,
  options?: UploadFlowOptions,
): Promise<StorageObject> {
  try {
    return await completeUpload(reservationId, request);
  } catch (error) {
    if (!(error instanceof StorageUploadError)) throw error;
    if (isRetryableCompleteConflict(error) && options?.onConflictAsSuccess) {
      const recovered = await options.onConflictAsSuccess(error);
      if (recovered) return recovered;
    }
    throw error;
  }
}

export async function uploadWithReservation(
  file: File,
  payload: CreateUploadRequest,
  options?: UploadFlowOptions,
): Promise<StorageObject> {
  const reservation = await createUploadReservation(payload);
  try {
    await uploadToSignedUrl(reservation.signed_upload_url, file);
    return await completeUploadWithRecovery(reservation.reservation_id, { actual_bytes: file.size }, options);
  } catch (error) {
    if (error instanceof StorageUploadError && error.code !== "CONFLICT" && error.code !== "EXPIRED") {
      await cancelUploadReservation(reservation.reservation_id);
    }
    throw error;
  }
}
```

### B) Upload sequence (exact in every uploader)

```ts
async function runUploadFromUi(file: File, payload: CreateUploadRequest): Promise<StorageObject> {
  try {
    return await uploadWithReservation(file, payload, {
      onConflictAsSuccess: (error) => {
        // If backend completes idempotently, fetch by object key/reservation key here.
        // Keep this branch explicit instead of always canceling on 409.
        throw error;
      },
    });
  } catch (err) {
    throw err;
  }
}
```

### C) Status handling map to UI

- `StorageUploadError.code === 'TOO_LARGE'` => quota error UI (413)
- `code === 'PERMISSION'` => ownership/project selection blocker (403)
- `code === 'VALIDATION'` => form/input validation message (422)
- `code === 'EXPIRED'` => show retry after re-reserve flow (410), no cancel side effect until user chooses.
- `code === 'CONFLICT'` => attempt idempotent recovery when server indicates completed; do not cancel reservation automatically.
- `code === 'NETWORK'` => retry button, and if step is upload/transfer or non-idempotent complete failure then cancel reservation.
- `code === 'NOT_FOUND'` => surface stale/not-found message
- `code === 'SERVER'` => generic toast

### D) Minimal target edits by file (simulated diff intent)

1) `web/src/hooks/useDirectUpload.ts`
- Replace ingest edge call with `uploadWithReservation`
- Use explicit callback contract:
  - preferred minimum: `onUploadComplete(): void` (refresh-based)
  - optional rich payload: `onStorageObjectUploaded?: (storageObject: StorageObject) => void`
- On `StorageUploadError`, apply step-aware recovery:
  - do not call cancel on idempotent `409`
  - call cancel for raw upload failures and non-idempotent completion failures

2) `web/src/components/documents/UploadTabPanel.tsx`
- keep UI
- switch callback to handle storage object result

3) `web/src/components/documents/useUppyTransport.ts`
- delete, or return a shim that throws "legacy removed"

4) `web/src/components/documents/ProjectParseUppyUploader.tsx`
- remove Uppy integration and route to service path

5) `web/src/components/flows/FlowWorkbench.tsx`
- replace upload submission branch only

6) `web/src/pages/useParseWorkbench.tsx`
- delete path => `deleteStorageObject`
- parse trigger => bridge from new storage object -> parser expected input

7) `web/src/pages/useAssetsWorkbench.tsx`
- post-upload refresh & quota hooks
- delete path => `deleteStorageObject`

8) `web/src/pages/DocumentsPage.tsx`
- callback contract alignment for UploadTabPanel

9) `web/src/pages/settings/index.ts`, `SettingsPageHeader.tsx`, `components/shell/nav-config.ts`
- add settings route entry for storage usage

10) Optional dedicated `web/src/pages/settings/SettingsStorage.tsx`
- query `fetchStorageQuota` on mount and after mutation events

### E) Example compatibility bridge point

```ts
// pseudo in useParseWorkbench.tsx
function mapStorageObjectToLegacySource(storage: StorageObject) {
  return {
    storage_object_id: storage.storage_object_id,
    source_uid: storage.source_uid ?? storage.storage_object_id,
    object_key: storage.object_key,
    byte_size: storage.byte_size,
    content_type: storage.content_type,
    storage_kind: storage.storage_kind,
  };
}
```

### F) Suggested acceptance checks before handing off

- no remaining browser-upload submission path calls `edgeFetch('ingest'...)`
- no active uploader imports/use of `useUppyTransport`
- delete for parse/assets calls `deleteStorageObject` first,
- quota read after upload complete/cancel/delete

### G) Handoff note

This plan is now suitable as a direct implementation contract. It includes one client API and one deterministic flow to apply across all browser-managed local upload paths.
