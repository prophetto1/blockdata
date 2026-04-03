# Production Environment Parity: GCS User Storage

**Goal:** Ensure the GCS user-storage surface that works in development is fully operational in production by closing three gaps: the deploy script does not carry `GCS_USER_STORAGE_BUCKET`, no production bucket exists, and the checked-in CORS artifact has no production origins. After this plan, every future deploy inherits the correct bucket configuration automatically — no manual Cloud Run env-var editing, no silent drops on redeploy.

**Architecture:** The platform-api deploy script (`scripts/deploy-cloud-run-platform-api.ps1`) is the single source of truth for what environment variables production receives. Cloud Run's `--env-vars-file` flag replaces ALL env vars on every deploy, so any variable not in the script is silently erased. This plan treats the deploy script as the environment parity contract and closes the gap between what `config.py` reads and what the script provides. The production bucket (`blockdata-user-content-prod`) is provisioned as a peer to the existing dev bucket, matching the layout specified in the approved storage quota design. The Cloud Run service account (`blockdata-platform-api-sa`) receives object-level access via IAM, matching the ADC credential chain the code already uses.

**Tech Stack:** Google Cloud Storage, Google Cloud Run, gcloud CLI, PowerShell deploy script, JSON CORS policy artifact.

**Status:** Draft
**Author:** jon
**Date:** 2026-04-02

## Source of Truth

This plan is derived from:

- The full environment parity audit comparing `services/platform-api/app/core/config.py` against `scripts/deploy-cloud-run-platform-api.ps1`
- The approved storage quota design: `docs/plans/user-storage/2026-03-19-user-storage-quota-design.md` (lines 77-78: `gs://blockdata-user-content-dev` and `gs://blockdata-user-content-prod`)
- The existing CORS artifact: `ops/gcs/user-storage-cors.json`
- The existing CORS runbook: `docs/ops/storage-namespace-and-gcs-policy-runbook.md`
- The live browser remediation checklist: `docs/ops/2026-04-02-live-browser-remediation-checklist.md`
- Runtime readiness checks in `services/platform-api/app/services/runtime_readiness.py`

## Verified Current State

### What works in development

- `.env` line 71 sets `GCS_USER_STORAGE_BUCKET=blockdata-user-content-dev`
- `.env` line 72 sets `GOOGLE_APPLICATION_CREDENTIALS` to a local SA key file (`gcs-access-sa`)
- The `blockdata-user-content-dev` bucket exists in GCP project `agchain`
- Uploads, signed URLs, downloads, and quota accounting all function locally
- Runtime readiness checks (`blockdata.storage.bucket_config`, `blockdata.storage.signed_url_signing`, `blockdata.storage.bucket_cors`) all pass locally

### What is broken in production

1. **Deploy script gap.** `scripts/deploy-cloud-run-platform-api.ps1` does not include `GCS_USER_STORAGE_BUCKET` in its `$envVarEntries` array (lines 372-399) and has no parameter for it. Every deploy sets `--env-vars-file` which replaces all env vars — so even a manual `gcloud run services update --set-env-vars` fix is erased on the next deploy.

2. **No production bucket.** The storage quota design planned `gs://blockdata-user-content-prod` but it was never provisioned. `gcloud storage buckets list --project agchain` shows only `blockdata-user-content-dev` for user content.

3. **No production CORS origins.** `ops/gcs/user-storage-cors.json` only lists `localhost:5374` and `localhost:5375`. The production web origin `https://blockdata.run` is absent. Browser uploads from the live site fail with `Failed to fetch` on the signed PUT to GCS.

4. **Service account IAM gap.** The Cloud Run service `blockdata-platform-api` runs as `blockdata-platform-api-sa@agchain.iam.gserviceaccount.com`. This SA needs two roles on the production bucket: `roles/storage.objectAdmin` for object operations (upload, download, delete, signed URLs) and `roles/storage.legacyBucketReader` for bucket metadata reads. The metadata read is required because the runtime readiness check `blockdata.storage.bucket_cors` calls `bucket.reload()` (`runtime_readiness.py` line 249) which requires the `storage.buckets.get` permission — a permission not included in `roles/storage.objectAdmin`. Without it, the CORS readiness check falls to the exception handler and returns `unknown` instead of `ok`. Local dev uses a different SA (`gcs-access-sa@agchain.iam.gserviceaccount.com`) with a downloaded key file. The production SA's GCS permissions have not been granted because the production bucket does not exist yet.

5. **`.env.example` gap.** The `.env.example` file does not document `GCS_USER_STORAGE_BUCKET`, `GOOGLE_APPLICATION_CREDENTIALS`, or `USER_STORAGE_MAX_FILE_BYTES`. A developer cloning the repo has no template for the storage surface.

### What is NOT broken

- All other `config.py` env vars either have deploy script coverage or have safe defaults matching production intent (see audit table below)
- `GOOGLE_APPLICATION_CREDENTIALS` is not needed on Cloud Run — the service account identity is resolved via the metadata server (ADC chain)
- The AGChain worker vars default to disabled, which is intentional for now
- `AUTH_REDIRECT_ORIGINS` is already handled by the deploy script (and is separately addressed in the live browser remediation checklist)

### Full parity audit

| Env Var | config.py | Deploy Script | .env (dev) | Status |
|---------|-----------|---------------|------------|--------|
| `SUPABASE_URL` | line 111 | line 373 | line 24 | Covered |
| `SUPABASE_SERVICE_ROLE_KEY` | line 112 | Secret Manager | line 10 | Covered |
| `APP_SECRET_ENVELOPE_KEY` | line 113 | Secret Manager | -- | Covered |
| `PLATFORM_API_M2M_TOKEN` | line 108 | Secret Manager | -- | Covered |
| `CONVERSION_SERVICE_KEY` | line 109 | Secret Manager | line 18 | Covered |
| `CONVERSION_MAX_WORKERS` | -- | line 374 (hardcoded=2) | -- | Covered |
| `AUTH_REDIRECT_ORIGINS` | line 120 | lines 391-399 | line 43 | Covered |
| `OTEL_ENABLED` | line 121 | line 375 | -- | Covered |
| `OTEL_SERVICE_NAME` | line 122 | line 376 | -- | Covered |
| `OTEL_SERVICE_NAMESPACE` | line 123 | line 377 | -- | Covered |
| `OTEL_DEPLOYMENT_ENV` | line 124 | line 378 | -- | Covered |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | line 125 | line 379 | -- | Covered |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | line 126 | line 380 | -- | Covered |
| `OTEL_EXPORTER_OTLP_HEADERS` | line 127 | Secret Manager (optional) | -- | Covered |
| `OTEL_LOG_CORRELATION` | line 130 | line 383 | -- | Covered |
| `OTEL_METRICS_ENABLED` | line 131 | line 384 (note: script says line 383) | -- | Covered |
| `OTEL_LOGS_ENABLED` | line 132 | line 384 | -- | Covered |
| `SIGNOZ_UI_URL` | line 133 | line 386 | -- | Covered |
| `JAEGER_UI_URL` | line 135 | line 389 | -- | Covered |
| **`GCS_USER_STORAGE_BUCKET`** | **line 117** | **MISSING** | **line 71** | **BROKEN** |
| `LOG_LEVEL` | line 116 | Missing | -- | Safe default (INFO) |
| `USER_STORAGE_MAX_FILE_BYTES` | line 118 | Missing | line 73 | Safe default (1 GB) |
| `STORAGE_CLEANUP_INTERVAL_SECONDS` | line 119 | Missing | line 74 | Safe default (300) |
| `OTEL_TRACES_SAMPLER` | line 128 | Missing | -- | Safe default |
| `OTEL_TRACES_SAMPLER_ARG` | line 129 | Missing | -- | Safe default |
| `AGCHAIN_OPERATIONS_WORKER_ENABLED` | line 136 | Missing | -- | Safe default (disabled) |
| `AGCHAIN_OPERATIONS_WORKER_*` | lines 137-145 | Missing | -- | Safe default (only read when enabled) |
| `AGCHAIN_DATASET_*_THRESHOLD` | lines 146-151 | Missing | -- | Safe default (200) |

## Platform API

No new or modified platform API endpoints.

The platform-api code already supports `GCS_USER_STORAGE_BUCKET` through `config.py` line 117 and uses it across:

| Module | Usage |
|--------|-------|
| `app/api/routes/storage.py` | Signed upload URLs, signed download URLs, object deletion |
| `app/services/pipeline_storage.py` | Pipeline source upload and retrieval |
| `app/services/runtime_readiness.py` | Three readiness checks: bucket config, signed URL signing, bucket CORS |

These modules degrade gracefully when the bucket is unset — the service starts, readiness checks report `fail`, and individual upload/download endpoints return 500 with `"GCS_USER_STORAGE_BUCKET is not configured"`. The code requires no changes. The gap is purely that production never receives the env var.

## Observability

No new traces, metrics, or structured logs.

The existing runtime readiness surface already provides the observability needed to verify this fix:

| Check ID | What it proves |
|----------|----------------|
| `blockdata.storage.bucket_config` | `GCS_USER_STORAGE_BUCKET` is set |
| `blockdata.storage.signed_url_signing` | The service account can generate signed URLs against the configured bucket |
| `blockdata.storage.bucket_cors` | The bucket CORS policy allows PUT/POST uploads |

After this plan is executed, all three checks should report `ok` on the live `GET /admin/runtime/readiness?surface=blockdata` endpoint.

## Database Migrations

No database migrations.

This plan addresses GCP infrastructure and deploy script configuration only. The database layer is unaffected.

## Edge Functions

No edge functions created or modified.

## Frontend Surface Area

No frontend changes.

**New pages:** 0
**New components:** 0
**Modified pages:** 0
**Modified components:** 0

The frontend already calls the platform-api storage endpoints. The failure mode is that production returns 500 because the backend has no bucket configured. Fixing the backend configuration fixes the frontend behavior.

## Pre-Implementation Contract

No major infrastructure, naming, or IAM decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

### Locked Decisions

1. The production bucket name is `blockdata-user-content-prod`, matching the approved storage quota design.
2. The production bucket location is `us-central1`, matching the Cloud Run service region.
3. The production bucket uses uniform bucket-level access (no per-object ACLs).
4. The Cloud Run service account `blockdata-platform-api-sa@agchain.iam.gserviceaccount.com` receives two IAM roles on the production bucket: `roles/storage.objectAdmin` (object operations) and `roles/storage.legacyBucketReader` (bucket metadata reads, required by the `bucket_cors` readiness check which calls `bucket.reload()`).
5. The production web origin for CORS is `https://blockdata.run`. No wildcard origins.
6. The deploy script parameter is named `GcsUserStorageBucket` (PascalCase, matching existing parameter naming convention).
7. The `.env.example` documents the GCS storage vars so future developers can set up a working local environment.

### Locked Acceptance Contract

The implementation is complete only when all of the following are true:

1. `gcloud storage buckets describe gs://blockdata-user-content-prod --project agchain` succeeds.
2. `blockdata-platform-api-sa@agchain.iam.gserviceaccount.com` has `roles/storage.objectAdmin` and `roles/storage.legacyBucketReader` on the bucket.
3. The bucket CORS policy includes `https://blockdata.run` with methods `PUT`, `GET`, `HEAD`, `OPTIONS`.
4. The deploy script accepts `-GcsUserStorageBucket blockdata-user-content-prod` and includes it in the env vars file.
5. After a fresh deploy using the updated script, `gcloud run services describe blockdata-platform-api --project agchain --region us-central1 --format json` shows `GCS_USER_STORAGE_BUCKET=blockdata-user-content-prod` in the container env.
6. The live `GET /admin/runtime/readiness?surface=blockdata` endpoint reports `ok` for all three storage checks: `blockdata.storage.bucket_config`, `blockdata.storage.signed_url_signing`, and `blockdata.storage.bucket_cors`.
7. A browser upload from `https://blockdata.run` succeeds (signed PUT to GCS does not fail CORS).

### Locked Inventory Counts

#### Infrastructure

- New GCS buckets: 1 (`blockdata-user-content-prod`)
- New IAM bindings: 2 (`roles/storage.objectAdmin` + `roles/storage.legacyBucketReader` on bucket)
- CORS policy applications: 2 (prod bucket + dev bucket reconciliation)

#### Repository

- Modified files: 3
- New files: 0

### Locked File Inventory

#### Modified files

| File | What changes |
|------|-------------|
| `scripts/deploy-cloud-run-platform-api.ps1` | Add `$GcsUserStorageBucket` parameter and conditional `$envVarEntries` entry |
| `ops/gcs/user-storage-cors.json` | Reconcile with full intended dev + prod origin set; add `https://blockdata.run`, verify no drift from live bucket state |
| `.env.example` | Add `GCS_USER_STORAGE_BUCKET`, `GOOGLE_APPLICATION_CREDENTIALS`, `USER_STORAGE_MAX_FILE_BYTES`, `STORAGE_CLEANUP_INTERVAL_SECONDS` with comments |

### Frozen Seam Contract

The deploy script uses `--env-vars-file` which replaces ALL non-secret env vars on every deploy. Any env var not in `$envVarEntries` is silently erased. This is the fundamental reason manual `gcloud run services update` fixes do not persist. The deploy script is the only durable path.

The GCS client in platform-api uses `google.cloud.storage.Client()` with no arguments, relying on Application Default Credentials. On Cloud Run, this resolves to the service account identity via the metadata server. No `GOOGLE_APPLICATION_CREDENTIALS` env var is needed in production. The IAM bindings on the bucket grant object and metadata access.

Signed URL generation has an additional credential dependency. `blob.generate_signed_url()` at `storage.py` line 114 is called with no explicit `credentials` parameter. Locally, the downloaded SA key file contains a private key and signing happens in-process. On Cloud Run, there is no private key — the library detects this and falls back to the IAM `signBlob` API, which requires the SA to have `iam.serviceAccounts.signBlob` permission on itself. This is typically granted via `roles/iam.serviceAccountTokenCreator`. If the SA lacks this permission, signed URL generation fails and the `blockdata.storage.signed_url_signing` readiness check returns `fail` with `"credentials do not include a private key"`. Task 2 includes a preflight check and contingency grant for this.

### Explicit Risks Accepted In This Plan

1. **Dev and prod share no bucket.** Dev uses `blockdata-user-content-dev`, prod uses `blockdata-user-content-prod`. There is no cross-environment data sharing. This is intentional per the approved storage quota design.

2. **CORS origins are environment-specific.** The checked-in `user-storage-cors.json` will contain both dev and prod origins in a single file. This means applying the policy to either bucket grants both environments' origins. This is acceptable because the bucket IAM binding (not CORS) controls who can actually read/write objects. CORS only controls which browser origins can make the request.

3. **The `gcs-access-sa` used locally is different from the `blockdata-platform-api-sa` used on Cloud Run.** This is expected — local dev uses a downloaded key file, Cloud Run uses metadata-server identity. The plan does not attempt to unify these.

4. **This plan does not address the `AUTH_REDIRECT_ORIGINS` production gap.** That is covered separately by the live browser remediation checklist (`docs/ops/2026-04-02-live-browser-remediation-checklist.md`). The two fixes are independent and can be executed in either order, but both must be done before the live site is fully operational.

## Relationship to Other Active Work

| Document | Relationship |
|----------|-------------|
| `docs/ops/2026-04-02-live-browser-remediation-checklist.md` | Covers CORS preflight (AUTH_REDIRECT_ORIGINS), platform-api redeploy, Supabase migration push, and stale auth. This plan's deploy script change should be included in that redeploy (step 3 of the checklist). |
| `docs/plans/2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md` | Covers validation of storage namespace migrations and manual acceptance evidence. This plan provides the production bucket that plan's acceptance path needs. |
| `docs/plans/2026-04-02-storage-surface-separation-status-report.md` | Describes the `source_documents` metadata collision. Independent of this plan — this plan fixes infrastructure, that report addresses data model. |

---

## Tasks

### Task 1: Provision the production bucket

**Step 1:** Create the bucket.

```bash
gcloud storage buckets create gs://blockdata-user-content-prod \
  --project agchain \
  --location us-central1 \
  --uniform-bucket-level-access
```

**Expected output:** `Creating gs://blockdata-user-content-prod/...`

**Step 2:** Verify the bucket exists.

```bash
gcloud storage buckets describe gs://blockdata-user-content-prod --project agchain --format="value(name)"
```

**Expected output:** `blockdata-user-content-prod`

### Task 2: Grant the Cloud Run service account access

Two roles are required:

- `roles/storage.objectAdmin` — object operations (upload, download, delete, signed URL generation)
- `roles/storage.legacyBucketReader` — bucket metadata reads (required by the `blockdata.storage.bucket_cors` readiness check, which calls `bucket.reload()` at `runtime_readiness.py` line 249; this requires `storage.buckets.get`, a permission not included in `roles/storage.objectAdmin`)

**Step 1:** Add the object admin IAM binding.

```bash
gcloud storage buckets add-iam-policy-binding gs://blockdata-user-content-prod \
  --member="serviceAccount:blockdata-platform-api-sa@agchain.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

**Expected output:** Updated IAM policy with the new binding.

**Step 2:** Add the bucket metadata read IAM binding.

```bash
gcloud storage buckets add-iam-policy-binding gs://blockdata-user-content-prod \
  --member="serviceAccount:blockdata-platform-api-sa@agchain.iam.gserviceaccount.com" \
  --role="roles/storage.legacyBucketReader"
```

**Expected output:** Updated IAM policy with the new binding.

**Step 3:** Verify both bucket-level bindings.

```bash
gcloud storage buckets get-iam-policy gs://blockdata-user-content-prod \
  --format="table(bindings.role,bindings.members)"
```

**Expected output:** Shows `blockdata-platform-api-sa@agchain.iam.gserviceaccount.com` under both `roles/storage.objectAdmin` and `roles/storage.legacyBucketReader`.

**Step 4:** Check whether the SA can sign blobs on its own behalf.

On Cloud Run, there is no local private key. `blob.generate_signed_url()` falls back to the IAM `signBlob` API, which requires `iam.serviceAccounts.signBlob` on the SA itself. Check if this is already granted:

```bash
gcloud iam service-accounts get-iam-policy \
  blockdata-platform-api-sa@agchain.iam.gserviceaccount.com \
  --project agchain \
  --format="table(bindings.role,bindings.members)"
```

If the output includes `roles/iam.serviceAccountTokenCreator` (or another role granting `iam.serviceAccounts.signBlob`) for the SA or a broader principal, no action is needed.

**Step 5 (contingency):** If Step 4 shows no signing permission, grant self-signing.

```bash
gcloud iam service-accounts add-iam-policy-binding \
  blockdata-platform-api-sa@agchain.iam.gserviceaccount.com \
  --project agchain \
  --member="serviceAccount:blockdata-platform-api-sa@agchain.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

This grants the SA permission to sign blobs on its own behalf. Without this, the `blockdata.storage.signed_url_signing` readiness check will return `fail` on Cloud Run even though bucket permissions are correct.

### Task 3: Reconcile the CORS artifact with the full intended origin set

**File:** `ops/gcs/user-storage-cors.json`

The checked-in artifact is the source of truth for both buckets. This task reconciles it with the full intended dev + prod origin set, then applies it to both buckets so the artifact and live state are identical.

**Step 1:** Read the current live CORS state of the dev bucket to check for drift.

```bash
gcloud storage buckets describe gs://blockdata-user-content-dev \
  --format="default(cors_config)"
```

Compare the output against the checked-in `ops/gcs/user-storage-cors.json`. If the live bucket has origins not in the artifact, those origins must be evaluated: add them to the artifact if they are still needed, or accept their removal if they are stale.

**Step 2:** Write the authoritative CORS artifact containing the full intended origin set.

The file must contain exactly these origins and no others:

| Origin | Environment | Purpose |
|--------|-------------|---------|
| `http://127.0.0.1:5374` | Dev | Vite dev server (IP) |
| `http://localhost:5374` | Dev | Vite dev server (hostname) |
| `http://127.0.0.1:5375` | Dev | Alternate dev port (IP) |
| `http://localhost:5375` | Dev | Alternate dev port (hostname) |
| `https://blockdata.run` | Prod | Production web app |

The file should become:

```json
[
  {
    "origin": [
      "http://127.0.0.1:5374",
      "http://localhost:5374",
      "http://127.0.0.1:5375",
      "http://localhost:5375",
      "https://blockdata.run"
    ],
    "method": ["PUT", "GET", "HEAD", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Content-Disposition",
      "ETag",
      "x-goog-resumable"
    ],
    "maxAgeSeconds": 3600
  }
]
```

If Step 1 revealed additional origins that should be kept, add them to the artifact here. Do not silently drop origins that are still in use.

**Step 3:** Apply the reconciled artifact to the production bucket.

```bash
gcloud storage buckets update gs://blockdata-user-content-prod \
  --cors-file=ops/gcs/user-storage-cors.json
```

**Step 4:** Apply the same artifact to the dev bucket (reconciles live state with the checked-in source of truth).

```bash
gcloud storage buckets update gs://blockdata-user-content-dev \
  --cors-file=ops/gcs/user-storage-cors.json
```

**Step 5:** Verify both buckets match the artifact.

```bash
gcloud storage buckets describe gs://blockdata-user-content-prod --format="default(cors_config)"
gcloud storage buckets describe gs://blockdata-user-content-dev --format="default(cors_config)"
```

**Expected output:** Both buckets show identical CORS config matching the checked-in artifact: all five origins, methods `PUT`, `GET`, `HEAD`, `OPTIONS`, response headers `Content-Type`, `Content-Disposition`, `ETag`, `x-goog-resumable`.

**Commit:** `fix: reconcile GCS user-storage CORS artifact with full dev + prod origin set`

### Task 4: Add GCS bucket parameter to the deploy script

**File:** `scripts/deploy-cloud-run-platform-api.ps1`

**Step 1:** Add the parameter to the `param()` block, after the `$AuthRedirectOrigins` parameter (line 49):

```powershell
# GCS user-storage bucket name (e.g., blockdata-user-content-prod).
# If omitted, the script will preserve the currently deployed value when possible.
[string]$GcsUserStorageBucket = '',
```

**Step 2:** Add the env var entry to the `$envVarEntries` block, after the `AUTH_REDIRECT_ORIGINS` conditional (after line 399):

```powershell
if (-not $GcsUserStorageBucket) {
  $GcsUserStorageBucket = $env:GCS_USER_STORAGE_BUCKET
}
if (-not $GcsUserStorageBucket) {
  $GcsUserStorageBucket = Get-ExistingServiceEnvValue -EnvName 'GCS_USER_STORAGE_BUCKET'
}
if ($GcsUserStorageBucket) {
  $envVarEntries += @("GCS_USER_STORAGE_BUCKET=$GcsUserStorageBucket")
}
```

This follows the same preserve-existing-value pattern used by `AUTH_REDIRECT_ORIGINS` (lines 391-399): explicit parameter wins, then env var fallback, then preserve whatever is currently deployed.

**Step 3:** Verify the script parses without errors.

```powershell
pwsh -Command "& { Get-Help .\scripts\deploy-cloud-run-platform-api.ps1 -Parameter GcsUserStorageBucket }"
```

**Expected output:** Shows the parameter definition with its help text.

**Commit:** `fix: add GCS_USER_STORAGE_BUCKET to platform-api deploy script`

### Task 5: Update .env.example with storage vars

**File:** `.env.example`

**Step 1:** Add a storage section with the missing vars. Find the appropriate location (after the existing env vars) and add:

```env
# ── User storage (GCS-backed) ──
# Bucket name for user file uploads (signed URLs, quota accounting).
# Dev: blockdata-user-content-dev | Prod: blockdata-user-content-prod
GCS_USER_STORAGE_BUCKET=blockdata-user-content-dev
# Local only: path to GCS service account key file.
# Not needed on Cloud Run (uses service account identity via metadata server).
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/gcs-sa-key.json
# Max single file size in bytes (default: 1073741824 = 1 GB)
USER_STORAGE_MAX_FILE_BYTES=1073741824
# Interval in seconds between storage cleanup sweeps (default: 300)
STORAGE_CLEANUP_INTERVAL_SECONDS=300
```

**Commit:** `docs: add GCS storage vars to .env.example`

### Task 6: Deploy and verify

**Step 1:** Run the deploy with the new parameter.

```powershell
.\scripts\deploy-cloud-run-platform-api.ps1 `
  -ProjectId agchain `
  -Region us-central1 `
  -UseSecretManager `
  -UseExistingSecret `
  -SecretName conversion-service-key `
  -UseExistingSupabaseServiceRoleSecret `
  -UseExistingAppSecretEnvelopeKeySecret `
  -GcsUserStorageBucket blockdata-user-content-prod `
  -AuthRedirectOrigins "http://localhost:5374,http://127.0.0.1:5374,http://localhost:5375,http://127.0.0.1:5375,https://blockdata.run"
```

Note on `-SecretName conversion-service-key`: the deploy script defaults to `platform-api-m2m-token`, but the actual Secret Manager secret in the `agchain` GCP project is named `conversion-service-key`. This is existing infrastructure — every prior production deploy has passed this flag. This plan does not change secret provenance; it uses the established correct invocation.

Note: this deploy should be coordinated with the live browser remediation checklist (step 3) since both require a platform-api redeploy.

**Step 2:** Verify the env var is set on the deployed service.

```bash
gcloud run services describe blockdata-platform-api \
  --project agchain \
  --region us-central1 \
  --format="value(spec.template.spec.containers[0].env)" \
  | grep GCS_USER_STORAGE_BUCKET
```

**Expected output:** Contains `GCS_USER_STORAGE_BUCKET=blockdata-user-content-prod`.

**Step 3:** Hit the readiness endpoint from the live site.

```
GET https://blockdata-platform-api-sqsmf5q2rq-uc.a.run.app/admin/runtime/readiness?surface=blockdata
```

**Expected output:** The three storage checks report `ok`:
- `blockdata.storage.bucket_config` — `ok`
- `blockdata.storage.signed_url_signing` — `ok`
- `blockdata.storage.bucket_cors` — `ok`

**Remediation if `signed_url_signing` reports `fail`:** If the check returns `fail` with evidence `"has_signing_credentials": false`, the SA cannot sign blobs on Cloud Run. Return to Task 2 Step 5 and grant `roles/iam.serviceAccountTokenCreator`. The new IAM binding takes effect within minutes — no redeploy needed. Re-check the readiness endpoint after granting.

**Remediation if `bucket_cors` reports `unknown`:** If the check returns `unknown` with `error_type`, the SA cannot read bucket metadata. Return to Task 2 Step 2 and verify the `roles/storage.legacyBucketReader` binding was applied.

**Step 4:** Verify browser upload from production origin.

- Open `https://blockdata.run` in a browser
- Navigate to the Assets page
- Upload a test file
- Confirm the signed PUT to GCS does not fail with a CORS error
- Confirm the file appears in the Assets list

### Task 7: Verify parity persists across redeploys

**Step 1:** Run the deploy script again WITHOUT the `-GcsUserStorageBucket` parameter.

```powershell
.\scripts\deploy-cloud-run-platform-api.ps1 `
  -ProjectId agchain `
  -Region us-central1 `
  -UseSecretManager `
  -UseExistingSecret `
  -SecretName conversion-service-key `
  -UseExistingSupabaseServiceRoleSecret `
  -UseExistingAppSecretEnvelopeKeySecret
```

**Step 2:** Verify the env var is STILL set (preserved from the previous deploy via the `Get-ExistingServiceEnvValue` fallback).

```bash
gcloud run services describe blockdata-platform-api \
  --project agchain \
  --region us-central1 \
  --format="value(spec.template.spec.containers[0].env)" \
  | grep GCS_USER_STORAGE_BUCKET
```

**Expected output:** Still contains `GCS_USER_STORAGE_BUCKET=blockdata-user-content-prod`.

This confirms that the preserve-existing-value pattern works and the bucket config survives future redeploys even when the operator does not pass the flag explicitly.

## Completion Criteria

The work is complete only when all of the following are true:

1. `gs://blockdata-user-content-prod` exists in GCP project `agchain`, region `us-central1`, with uniform bucket-level access.
2. `blockdata-platform-api-sa@agchain.iam.gserviceaccount.com` has `roles/storage.objectAdmin` and `roles/storage.legacyBucketReader` on that bucket.
3. The bucket CORS policy includes `https://blockdata.run` with methods `PUT`, `GET`, `HEAD`, `OPTIONS`.
4. `scripts/deploy-cloud-run-platform-api.ps1` accepts `-GcsUserStorageBucket` and preserves the value across redeploys.
5. `.env.example` documents all GCS storage vars.
6. The live `GET /admin/runtime/readiness?surface=blockdata` reports `ok` for all three storage checks.
7. A browser upload from `https://blockdata.run` succeeds end-to-end.
8. A subsequent redeploy without `-GcsUserStorageBucket` preserves the production bucket configuration.