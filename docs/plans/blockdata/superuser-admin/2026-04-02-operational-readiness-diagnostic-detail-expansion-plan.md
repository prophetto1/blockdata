# Operational Readiness Diagnostic Detail Expansion Implementation Plan

**Goal:** Expand the Superuser Operational Readiness surface so it exposes materially better diagnostic detail for runtime, deployment, and storage failures without turning into a general-purpose observability or CI dashboard. Operators must be able to tell which runtime is active, what credential path is in use, why a storage check failed, and what to verify next from the page itself.

**Architecture:** Keep `GET /admin/runtime/readiness` as the single backend-owned source of truth. Do not add browser-side GCP calls or a separate deployment-status API. Enrich the existing readiness snapshot with precise structured evidence, cause metadata, dependency/action guidance, and runtime identity details. Use the existing Superuser page and existing check grid to render that information more clearly: promote a small set of high-signal runtime facts into the summary area, keep full evidence in the expandable detail view, and expose richer cause/action sections on failing checks.

**Tech Stack:** FastAPI, React, TypeScript, Cloud Run runtime metadata, Google Cloud Storage readiness checks, Vitest, pytest.

**Status:** Draft  
**Date:** 2026-04-02

## Source Of Truth

This plan is derived from:

- `services/platform-api/app/services/runtime_readiness.py`
- `services/platform-api/app/api/routes/admin_runtime_readiness.py`
- `web/src/lib/operationalReadiness.ts`
- `web/src/hooks/useOperationalReadiness.ts`
- `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`
- `web/src/components/superuser/OperationalReadinessSummary.tsx`
- `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
- `docs/plans/2026-04-02-production-environment-parity-gcs-storage-plan.md`
- the current live debugging findings around `blockdata.storage.signed_url_signing`, `blockdata.storage.bucket_cors`, Cloud Run revision identity, and GCS signing-path failures

## Verified Current State

### Backend snapshot

- `GET /admin/runtime/readiness` already returns a live, freshly computed snapshot through `get_runtime_readiness_snapshot(...)`.
- Each check already carries `checked_at`, `summary`, `evidence`, and `remediation`.
- `_make_check(...)` in `runtime_readiness.py` does not currently populate richer operator fields like `cause`, `cause_confidence`, `depends_on`, `blocked_by`, `available_actions`, `verify_after`, `next_if_still_failing`, or `actionability`.
- The storage checks currently collapse distinct failure modes into thin summaries:
  - `blockdata.storage.signed_url_signing` currently maps `AttributeError` to a private-key-specific message and only exposes `error_type`.
  - `blockdata.storage.bucket_cors` exposes `cors_configured`, `rule_count`, and `allows_upload_methods`, but not the actual origins, methods, or response headers.
- `check_shared_platform_api_ready(...)` currently acts as a simple process-ready probe and does not expose runtime identity like `K_SERVICE`, `K_REVISION`, or the active service account email.

### Frontend surface

- The frontend readiness type model in `web/src/lib/operationalReadiness.ts` already supports richer check fields:
  - `cause`
  - `cause_confidence`
  - `depends_on`
  - `blocked_by`
  - `available_actions`
  - `verify_after`
  - `next_if_still_failing`
  - `actionability`
- `OperationalReadinessCheckGrid.tsx` currently renders only:
  - label
  - category
  - status
  - summary
  - remediation
  - expanded evidence entries
  - checked timestamp
- `OperationalReadinessSummary.tsx` currently renders only summary counts plus “Last refresh”.
- The page already has a manual refresh action and does not read a persisted backend cache.

### Operator gap

- The page can show that a check failed, but often not enough detail to tell:
  - which Cloud Run revision is live
  - which service account is active
  - whether signing used local private-key mode or IAM `signBlob`
  - whether a failure is caused by missing IAM role, insufficient OAuth scope, absent bucket config, or incomplete CORS policy
  - what exact next verification should happen after a fix

## Platform API

### Existing endpoint reused

- `GET /admin/runtime/readiness`

### Endpoint behavior change

`GET /admin/runtime/readiness` remains the only readiness endpoint, but the snapshot contract becomes richer.

No new route is added.

## Frontend Surface

### Existing page reused

- `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`

### Existing components reused

- `web/src/components/superuser/OperationalReadinessSummary.tsx`
- `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`

No new page is introduced.

## Database Migrations

None.

## Edge Functions

None.

## Observability

No new traces, metrics, or structured logs are required for this batch.

This survives the zero-change test because the feature is an expansion of the existing backend-owned readiness snapshot, not a new cross-runtime flow. The operator-facing diagnostic detail is emitted through the existing readiness route itself.

## Pre-Implementation Contract

No major product, API, observability, runtime-metadata, or UI-surface decision may be improvised during implementation. If any item below needs to change, implementation must stop and the plan must be revised first.

## Locked Product Decisions

1. This work expands the existing operational-readiness control surface. It does not create a generic observability dashboard.
2. `GET /admin/runtime/readiness` remains the single authoritative backend-owned source of readiness data.
3. The browser must not make direct GCP or deployment-platform calls.
4. “Build state” in this batch means runtime identity that the current process can prove about itself, not CI/CD workflow history.
5. The runtime identity surfaced in this batch is limited to safe process/runtime facts:
   - environment mode
   - Cloud Run service name
   - Cloud Run revision name
   - Cloud Run configuration name
   - active service account email
6. Storage checks must distinguish failure classes precisely enough for operators to act without reading code:
   - missing bucket config
   - local private-key mode
   - IAM `signBlob` mode
   - missing `TokenCreator`
   - insufficient OAuth scope
   - bucket metadata access failure
   - incomplete CORS policy
7. The page must promote a small set of high-signal runtime facts without requiring expansion of every check row.
8. Full evidence remains available in the expandable detail panel for each check.
9. No secrets or sensitive values may be exposed:
   - no raw access tokens
   - no signed URLs
   - no secret payloads
   - no raw Supabase service-role keys
   - no raw object keys
10. This batch may use existing richer frontend readiness fields that are already defined in `web/src/lib/operationalReadiness.ts`.
11. This batch does not add GitHub Actions status, Cloud Build history, or Vercel deployment history.

## Locked Snapshot Contract

### Snapshot shape

The top-level snapshot shape remains:

- `generated_at`
- `summary`
- `surfaces`

No new top-level root object is introduced in this batch.

### Check shape

Every check returned by `runtime_readiness.py` must include:

- `id`
- `category`
- `status`
- `label`
- `summary`
- `evidence`
- `remediation`
- `checked_at`

The following fields become first-class and must be populated for the targeted checks in this plan:

- `cause`
- `cause_confidence`
- `depends_on`
- `blocked_by`
- `available_actions`
- `verify_after`
- `next_if_still_failing`
- `actionability`

### Targeted checks expanded in this batch

#### `shared.platform_api.ready`

Must expose evidence keys:

- `runtime_environment`
- `service_name`
- `revision_name`
- `configuration_name`
- `service_account_email`
- `credential_class`

Must expose operator fields:

- `cause`
- `cause_confidence`
- `available_actions`
- `verify_after`
- `actionability`

#### `blockdata.storage.bucket_config`

Must expose evidence keys:

- `bucket_name`
- `has_bucket`
- `max_file_bytes`
- `cleanup_interval_seconds`

Must expose operator fields:

- `cause`
- `cause_confidence`
- `available_actions`
- `verify_after`
- `actionability`

#### `blockdata.storage.signed_url_signing`

Must expose evidence keys:

- `bucket_name`
- `credential_class`
- `service_account_email`
- `signing_mode`
- `has_local_signer`
- `uses_iam_signblob`
- `has_access_token`
- `error_type`
- `error_status`
- `error_reason`
- `error_service`
- `error_method`

Must expose operator fields:

- `cause`
- `cause_confidence`
- `depends_on`
- `blocked_by`
- `available_actions`
- `verify_after`
- `next_if_still_failing`
- `actionability`

#### `blockdata.storage.bucket_cors`

Must expose evidence keys:

- `bucket_name`
- `cors_rule_count`
- `allowed_origins`
- `allowed_methods`
- `allowed_response_headers`
- `allows_upload_methods`

Must expose operator fields:

- `cause`
- `cause_confidence`
- `available_actions`
- `verify_after`
- `actionability`

## Locked UI Behavior

1. The page header and route remain the same.
2. The summary area continues to show global status counts and refresh time.
3. The summary area additionally shows a compact runtime identity panel derived from the current `shared.platform_api.ready` evidence when those values are present.
4. Each check row continues to show summary and remediation.
5. Each fail or warn check additionally shows:
   - `Cause:` line when `cause` is present
   - small inline “Key facts” presentation for selected evidence keys when present
6. The expanded detail panel continues to show the full evidence map and checked timestamp.
7. If `available_actions`, `verify_after`, or `next_if_still_failing` are present, the expanded detail panel must render them clearly instead of dropping them on the floor.
8. The UI must not dump raw JSON blobs into the default collapsed row.

## Locked Observability Surface

No new OpenTelemetry spans, metrics, or logger contracts are added.

The existing readiness snapshot route and readiness check spans remain the only observability seam touched by this work.

## Locked Inventory Counts

### Backend

- Modified backend runtime files: `1`
- Modified backend test files: `2`
- New backend files: `0`

### Frontend

- Modified frontend runtime files: `3`
- Modified frontend test files: `2`
- New frontend files: `0`

## Locked File Inventory

### Modified backend runtime files

- `services/platform-api/app/services/runtime_readiness.py`

### Modified backend test files

- `services/platform-api/tests/test_runtime_readiness_service.py`
- `services/platform-api/tests/test_admin_runtime_readiness_routes.py`

### Modified frontend runtime files

- `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`
- `web/src/components/superuser/OperationalReadinessSummary.tsx`
- `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`

### Modified frontend test files

- `web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx`
- `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`

## Frozen Seam Contract

1. `GET /admin/runtime/readiness` remains the only readiness snapshot endpoint.
2. `useOperationalReadiness()` remains the page’s data-loading hook.
3. The page continues to render backend-provided state first and browser-local diagnostics second.
4. The existing `OperationalReadinessCheck` type in `web/src/lib/operationalReadiness.ts` remains the frontend contract authority for richer readiness fields.
5. The page does not become a log console, trace explorer, or deployment history UI.

## Explicit Risks Accepted In This Plan

1. Runtime identity values like `K_SERVICE` and `K_REVISION` are Cloud Run-specific and may be unavailable in local dev. The UI must degrade gracefully when those fields are absent.
2. The signed-url signing check may still fail for reasons outside this batch’s exact scope, but after this work it must say which failure class occurred.
3. The page may expose more operational detail than today, so the plan must remain strict about forbidden sensitive values.
4. This batch improves operator diagnosis, not the underlying storage or deploy bugs themselves.

## Relationship To Other Active Work

| Document | Relationship |
|----------|-------------|
| `docs/plans/2026-04-02-production-environment-parity-gcs-storage-plan.md` | Supplies the current real failure classes for bucket config, `signBlob`, and CORS. This plan makes those failures easier to diagnose from the page. |
| `docs/ops/2026-04-02-live-browser-remediation-checklist.md` | Covers live remediation steps. This plan improves the operator control surface used to verify those remediations. |

## Task Breakdown

### Task 1: Expand backend readiness check payloads

**File(s):**

- `services/platform-api/app/services/runtime_readiness.py`
- `services/platform-api/tests/test_runtime_readiness_service.py`
- `services/platform-api/tests/test_admin_runtime_readiness_routes.py`

**Step 1:** Extend `_make_check(...)` so targeted checks can populate the richer readiness contract fields already expected by the frontend type system.

**Step 2:** Expand `check_shared_platform_api_ready(...)` to emit runtime identity evidence:

- `runtime_environment`
- `service_name`
- `revision_name`
- `configuration_name`
- `service_account_email`
- `credential_class`

**Step 3:** Expand `check_blockdata_storage_bucket_config(...)` to emit bucket-specific evidence such as `bucket_name`, `max_file_bytes`, and `cleanup_interval_seconds`.

**Step 4:** Refactor `check_blockdata_storage_signed_url_signing(...)` so it classifies failures precisely and emits structured evidence instead of a generic private-key message.

**Step 5:** Expand `check_blockdata_storage_bucket_cors(...)` to emit actual origins, methods, and response headers in addition to the current booleans.

**Step 6:** Update route-level tests so the readiness route preserves the enriched fields through the snapshot response.

**Test command:** `cd services/platform-api && pytest -q tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py`

**Expected output:** Pytest passes with assertions covering richer evidence, cause metadata, action fields, and precise storage-signing failure classification.

**Commit:** `feat(readiness): enrich runtime and storage diagnostic evidence`

### Task 2: Surface the new diagnostic detail in the existing page

**File(s):**

- `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`
- `web/src/components/superuser/OperationalReadinessSummary.tsx`
- `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
- `web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx`
- `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`

**Step 1:** Add a compact runtime identity presentation to the summary area using the evidence from `shared.platform_api.ready`.

**Step 2:** Update the check grid so fail and warn rows render a visible `Cause:` line when present.

**Step 3:** Add a compact inline “Key facts” presentation for selected evidence keys on the targeted checks:

- `service_name`
- `revision_name`
- `service_account_email`
- `bucket_name`
- `signing_mode`
- `error_reason`
- `error_service`
- `cors_rule_count`

**Step 4:** Expand the detail panel rendering so it shows:

- `available_actions`
- `verify_after`
- `next_if_still_failing`

when those arrays are present.

**Step 5:** Keep the expanded evidence panel authoritative and complete while preserving the current visual structure.

**Test command:** `cd web && npx vitest run src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx`

**Expected output:** Vitest passes with assertions covering runtime identity rendering, cause-line rendering, key-facts rendering, and action/follow-up rendering.

**Commit:** `feat(readiness): surface runtime identity and richer operator detail`

### Task 3: End-to-end verification

**File(s):**

- `services/platform-api/app/services/runtime_readiness.py`
- `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`
- `web/src/components/superuser/OperationalReadinessSummary.tsx`
- `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`

**Step 1:** Run the focused backend and frontend test suites.

**Step 2:** Build the web app.

**Step 3:** Manually verify the page in a superuser session.

Manual verification checklist:

1. Open `/app/superuser/operational-readiness`.
2. Click `Refresh Status`.
3. Confirm the summary area shows current runtime identity for the active backend when available.
4. Confirm a storage-signing failure, if present, shows a precise cause like missing bucket, missing `TokenCreator`, or `ACCESS_TOKEN_SCOPE_INSUFFICIENT` rather than a generic private-key message.
5. Confirm the Bucket CORS check shows actual origins, methods, and response headers in the expanded detail panel.
6. Confirm the `Checked` timestamp updates after refresh.
7. Confirm no raw tokens, signed URLs, object keys, or secret values are visible anywhere in the page.

**Test command:** `cd services/platform-api && pytest -q tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py && cd ../../web && npx vitest run src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx && npm run build`

**Expected output:** All targeted pytest and Vitest commands pass, the web build succeeds, and the manual page check confirms the new diagnostic detail is visible and safe.

**Commit:** `test(readiness): verify richer operational diagnostics`

## Locked Acceptance Contract

1. The page continues to load from `GET /admin/runtime/readiness` with no new readiness endpoint.
2. `shared.platform_api.ready` exposes runtime identity evidence including `service_name`, `revision_name`, and `service_account_email` when available.
3. `blockdata.storage.signed_url_signing` exposes precise structured failure evidence instead of only `error_type`.
4. `blockdata.storage.bucket_cors` exposes actual origins, methods, and response headers.
5. The summary area shows a compact runtime identity presentation when the backend provides those values.
6. Fail and warn rows render a visible `Cause:` line when cause metadata exists.
7. Expanded check detail renders `available_actions`, `verify_after`, and `next_if_still_failing` when present.
8. No raw secrets, access tokens, signed URLs, or object keys are exposed.
9. The locked inventory counts and file inventory remain true to the implemented change set.

## Completion Criteria

The work is complete only when all of the following are true:

1. The backend readiness snapshot includes the richer diagnostic fields for the targeted checks exactly as locked in this plan.
2. The frontend surfaces the most important runtime and storage facts without requiring operators to inspect raw JSON or logs first.
3. The page can distinguish the major storage-signing and CORS failure classes from the UI itself.
4. The existing readiness route, page route, and control-surface model remain intact.
5. The targeted pytest and Vitest suites pass.
6. The web build succeeds.
7. Manual verification confirms the page shows materially more useful operator detail while exposing no sensitive values.
