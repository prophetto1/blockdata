# GCP Cloud Run Status — `writing-system-conversion-service`

Last updated: 2026-02-08
Owner: writing-system

---

## Current State: DEPLOYED but BLOCKED by org policy

The service is **built, pushed, and deployed** to Cloud Run on the `agchain` project. It starts and runs. However, the GCP organization policy blocks `allUsers` IAM binding, so the service returns **HTTP 403 Forbidden** to all external callers (including Supabase Edge Functions). Until this is fixed, the non-MD pipeline cannot work end-to-end.

---

## What Happened (2026-02-08 session)

### Problem 1: Original project billing disabled

The previous deployment lived on `gen-lang-client-0774445557`. Billing was disabled on that project, which broke Secret Manager access. The Cloud Run service there returned **HTTP 503** (couldn't start because it couldn't read the `CONVERSION_SERVICE_KEY` secret from Secret Manager).

**Resolution:** Switched to `agchain` project (has billing enabled).

### Problem 2: Cloud Build permissions on `agchain`

First `gcloud run deploy --source` failed because the default compute service account (`862494623920-compute@developer.gserviceaccount.com`) lacked:

1. `storage.objects.get` — needed to fetch source archives
2. `artifactregistry.repositories.uploadArtifacts` — needed to push the built Docker image
3. `logging.logWriter` — needed to write build logs

**Resolution:** Granted these IAM roles to the compute service account:

```
gcloud projects add-iam-policy-binding agchain \
  --member="serviceAccount:862494623920-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

gcloud projects add-iam-policy-binding agchain \
  --member="serviceAccount:862494623920-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding agchain \
  --member="serviceAccount:862494623920-compute@developer.gserviceaccount.com" \
  --role="roles/logging.logWriter"
```

After granting these, `gcloud builds submit` succeeded (build ID: `3d5c4100-d8b5-434e-a362-a73318b875fa`, 16m42s, STATUS: SUCCESS).

### Problem 3: `--allow-unauthenticated` blocked by org policy

The Cloud Run deploy command included `--allow-unauthenticated`, but the GCP organization has a **domain-restricted sharing policy** (`iam.allowedPolicyMemberDomains`). This policy prevents granting the `roles/run.invoker` role to `allUsers`.

The deploy itself succeeded, but the IAM binding was silently skipped. Result: the service is running but returns **403 Forbidden** to any caller that doesn't present a valid GCP IAM token.

This is the **current blocker**.

---

## Deployment Details (current)

| Field | Value |
|---|---|
| GCP project | `agchain` (project number: `862494623920`) |
| Region | `us-central1` |
| Service name | `writing-system-conversion-service` |
| Service URL | `https://writing-system-conversion-service-862494623920.us-central1.run.app` |
| Image | `us-central1-docker.pkg.dev/agchain/cloud-run-source-deploy/writing-system-conversion-service:latest` |
| Image SHA | `sha256:add37478ed5db95a758c9e6b7d77f86b78c1c3262748a4bcab8b9702d31b6fce` |
| Runtime SA | `writing-system-conversion-sa@agchain.iam.gserviceaccount.com` |
| CPU | 2 |
| Memory | 4Gi |
| Concurrency | 1 |
| Timeout | 1800s |
| Port | 8000 |
| Auth | `CONVERSION_SERVICE_KEY` env var (plain text, not Secret Manager) |
| CONVERSION_SERVICE_KEY value | `(stored in GCP Secret Manager)` |

---

## What You Need To Do

### ACTION 1: Fix the 403 — allow unauthenticated access to the Cloud Run service

The org policy blocks `allUsers`. You have **three options** (pick one):

#### Option A: Override the org policy (recommended if you have org admin access)

1. Go to: https://console.cloud.google.com/iam-admin/orgpolicies/iam-allowedPolicyMemberDomains?project=agchain
2. Click **Manage Policy**
3. Either:
   - Delete the policy override (if it was set at this project level), OR
   - Add an exception that allows `allUsers` for this project
4. Then run:

```powershell
gcloud run services add-iam-policy-binding writing-system-conversion-service `
  --region us-central1 `
  --project agchain `
  --member allUsers `
  --role roles/run.invoker
```

5. Verify:

```powershell
curl -sS -X POST "https://writing-system-conversion-service-862494623920.us-central1.run.app/convert" `
  -H "Content-Type: application/json" -d "{}"
```

Expected: **HTTP 401** (from the app's auth middleware, not GCP's 403). This means the request reaches the app.

#### Option B: Use a different GCP project without org policy restrictions

If `agchain` is under a restricted org, create or use a personal project:

1. Go to: https://console.cloud.google.com/projectcreate
2. Create a new project (e.g., `writing-system-prod`)
3. Enable billing on it
4. Re-run the deploy script from repo root:

```powershell
.\scripts\deploy-cloud-run-conversion-service.ps1 `
  -ProjectId "<NEW_PROJECT_ID>" `
  -Region us-central1 `
  -ConversionServiceKey "(stored in GCP Secret Manager)"
```

5. Verify the URL from the output works (should return 401, not 403).

#### Option C: Use Cloud Run with IAM auth + a proxy

This is more complex. Instead of `allUsers`, you'd set up a service account, generate an ID token, and have the Edge Function present it. **Not recommended** unless you can't do Option A or B.

### ACTION 2: Set Supabase Edge Function secrets

Once the Cloud Run URL is reachable (returns 401 not 403), set these secrets in **Supabase Dashboard > Project Settings > Edge Functions > Secrets**:

| Secret name | Value |
|---|---|
| `CONVERSION_SERVICE_URL` | `https://writing-system-conversion-service-862494623920.us-central1.run.app` (or the new URL if you used Option B) |
| `CONVERSION_SERVICE_KEY` | `(stored in GCP Secret Manager)` |

**Important:** No trailing slash on the URL. The Edge Function appends `/convert`.

Dashboard link: https://supabase.com/dashboard/project/dbdzzhshmigewyprahej/settings/functions

### ACTION 3: Verify end-to-end

After Actions 1 and 2 are complete, verify the auth gate works:

```powershell
# Should return 401 (app-level auth rejection, NOT 403):
curl.exe -sS -X POST "<CLOUD_RUN_URL>/convert" -H "Content-Type: application/json" -d "{}"

# Should return 422 (valid auth, bad payload -- proves the app is reachable):
curl.exe -sS -X POST "<CLOUD_RUN_URL>/convert" `
  -H "X-Conversion-Service-Key: (stored in GCP Secret Manager)" `
  -H "Content-Type: application/json" `
  -d "{}"
```

Then run the smoke test from repo root:

```powershell
$env:SUPABASE_URL = "https://dbdzzhshmigewyprahej.supabase.co"
$env:SUPABASE_ANON_KEY = "<your legacy anon key starting with eyJ...>"
$env:TEST_EMAIL = "jondev717@gmail.com"
$env:TEST_PASSWORD = "TestPass123!"

.\scripts\smoke-test-non-md.ps1
```

This will:
1. Authenticate with Supabase
2. Upload `docs/tests/test-pack/lorem_ipsum.docx` (or fall back to a `.txt`)
3. Poll `documents_v2` until status = `ingested`
4. Export JSONL and validate the v2 canonical shape
5. For `.docx`: assert `conv_parsing_tool=docling`, `block_locator.type=docling_json_pointer`

---

## Previous Deployment (gen-lang-client-0774445557) -- DEAD

| Field | Value |
|---|---|
| Status | **DOWN** (billing disabled, Secret Manager inaccessible, service returns 503) |
| URL | `https://writing-system-conversion-service-20728931817.us-central1.run.app` |
| Last deployed | 2026-02-03 |
| Why dead | Project billing disabled -> Secret Manager API blocked -> service can't read `CONVERSION_SERVICE_KEY` -> startup fails |

To revive this instead of using `agchain`: re-enable billing at https://console.developers.google.com/billing/enable?project=gen-lang-client-0774445557, then the existing service should start working again (it already has the correct image from 2026-02-03, though it has the **old** `main.py` without deterministic JSON / `docling_key` callback).

---

## Build Notes

- Docker image is ~5GB due to NVIDIA CUDA libraries pulled by `torch` (a `docling` dependency)
- Cloud Build with default machine type takes ~17 minutes
- `E2_HIGHCPU_8` machine type is blocked by quota on `agchain` -- use default
- The image is already built and pushed to `agchain`'s Artifact Registry; re-deploying Cloud Run from the existing image is instant (no rebuild needed)

---

## Key Files in Repo

| File | Purpose |
|---|---|
| `services/conversion-service/app/main.py` | FastAPI application (convert endpoint) |
| `services/conversion-service/Dockerfile` | Docker build (python:3.11-slim + docling) |
| `services/conversion-service/requirements.txt` | Python deps (fastapi, docling>=2.70.0, etc.) |
| `scripts/deploy-cloud-run-conversion-service.ps1` | Automated deploy script |
| `scripts/smoke-test-non-md.ps1` | End-to-end test for non-MD pipeline |
| `supabase/functions/ingest/index.ts` | Edge Function that calls `/convert` |
| `supabase/functions/conversion-complete/index.ts` | Edge Function callback (receives result) |
