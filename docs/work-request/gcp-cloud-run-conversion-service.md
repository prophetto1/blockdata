# Work Request: Deploy `conversion-service` to GCP Cloud Run (writing-system)

Owner requesting: Jon  
Executor: CC  
Date: 2026-02-02  
Priority: High (blocks today's end-to-end verification)

## 1) Objective

Deploy the repo's Python FastAPI conversion service to **Google Cloud Run** so that Supabase Edge Functions can convert **non-Markdown uploads** (`.docx`, `.pdf`, `.txt`) into Markdown and ingest them into Postgres blocks.

This is required to complete Phase 1 end-to-end today:

`upload -> (convert to Markdown if needed) -> blocks in Postgres -> export-jsonl`

## 2) What this service does (context)

Service location:

- `E:/writing-system/services/conversion-service/`

API:

- `POST /convert` (FastAPI)
- Requires header: `X-Conversion-Service-Key: <shared_secret>`

Behavior:

- Downloads the original file from a **Supabase Storage signed download URL**.
- Converts it to Markdown using **Docling** (`docx|pdf`) or a direct decode (`txt`).
- Uploads the resulting Markdown to a **Supabase Storage signed upload URL**.
- Calls back to Supabase Edge Function:
  - `POST https://<project-ref>.supabase.co/functions/v1/conversion-complete`
  - Header: `X-Conversion-Service-Key: <shared_secret>`

Important constraints:

- The conversion service must **NOT** have access to Postgres.
- The conversion service must **NOT** have Supabase API keys.
- The only secret it needs is `CONVERSION_SERVICE_KEY` (shared secret used in headers).
- The service is designed to be reachable publicly over HTTPS. It relies on the shared secret for auth.

## 3) Deliverables

1. A running Cloud Run service with a public HTTPS URL:
   - Example: `https://conversion-service-xxxxx-uc.a.run.app`
2. The Cloud Run service has env var set:
   - `CONVERSION_SERVICE_KEY` (exact value provided out-of-band)
3. Confirmed that:
   - Requests without the header are rejected (401)
   - Requests with header reach the app (not 401)
4. Supabase secrets updated (if CC has access; otherwise provide the URL back to Jon):
   - `CONVERSION_SERVICE_URL=<cloud-run-url>` (no trailing slash)
   - `CONVERSION_SERVICE_KEY=<same shared secret>`

## 4) Acceptance criteria

Cloud Run:

- Service deploys successfully from repo source.
- Endpoint is reachable at `POST <cloud-run-url>/convert`.
- Returns `401 Unauthorized` if `X-Conversion-Service-Key` missing/wrong.
- Returns JSON `{"ok": true}` (HTTP 200) when invoked with correct header and a valid payload.

System end-to-end (post-deploy):

- Non-markdown upload via `POST /functions/v1/ingest` reaches state `converting`, then transitions to `ingested`.
- `blocks` exist for the resulting `doc_uid`.
- `GET /functions/v1/export-jsonl?doc_uid=...` works.

## 5) GCP resources + permissions needed

Minimum GCP APIs (enable in project):

- Cloud Run API (`run.googleapis.com`)
- Cloud Build API (`cloudbuild.googleapis.com`)
- Artifact Registry API (`artifactregistry.googleapis.com`) *(often required by Cloud Build pipelines)*
- Secret Manager API (`secretmanager.googleapis.com`) *(optional but recommended)*

IAM roles (typical; adjust to org policy):

- For the deploying identity (CC / CI):
  - Cloud Run Admin
  - Cloud Build Editor (or Cloud Build Admin)
  - Artifact Registry Writer
  - Service Account User (for the runtime service account)
- Runtime service account:
  - No Google API access is required for the app to function (except `roles/secretmanager.secretAccessor` if using Secret Manager).

## 6) Configuration values (fill in)

GCP project:

- `GCP_PROJECT_ID = <fill>`
- `GCP_REGION = <fill>` (recommended: `us-central1` unless you have a standard)

Service:

- `CLOUD_RUN_SERVICE_NAME = writing-system-conversion-service`
- `CONTAINER_PORT = 8000`
- `CONVERSION_SERVICE_KEY = <provided securely>`

Repo:

- Build context directory: `services/conversion-service`
- Dockerfile: `services/conversion-service/Dockerfile` (or just `Dockerfile` if using that directory as context)

Supabase (already exists):

- `SUPABASE_URL = https://dbdzzhshmigewyprahej.supabase.co`

## 7) Deployment approach (recommended): Cloud Run "Deploy from source"

Goal: avoid local Docker entirely; let Google build and host.

High-level steps (Console or gcloud):

1. Go to Cloud Run -> Create Service
2. Select "Deploy from source repository"
3. Connect repo (GitHub) and select:
   - repository: `<fill>`
   - branch/tag: `<fill>` (e.g., `main`)
   - root/build context: `services/conversion-service`
   - build type: Dockerfile
4. Service settings:
   - Service name: `writing-system-conversion-service`
   - Region: `<GCP_REGION>`
   - Ingress: "All" (public)
   - Authentication: "Allow unauthenticated invocations"
   - Container port: `8000`
5. Resources:
   - CPU: start with `2`
   - Memory: start with `4Gi` (Docling can be heavy; bump to `8Gi` if needed)
   - Request timeout: `600s` to `1800s` (Docling on PDF may take time)
   - Concurrency: `1` to start (safer while proving; can raise later)
6. Environment variables:
   - `CONVERSION_SERVICE_KEY = <secret>`
   - Preferred: store secret in Secret Manager and mount to env var (org dependent).
7. Deploy.

## 8) CLI version (gcloud)

This does not require local Docker. It deploys from `services/conversion-service` using Cloud Build.

### Option A (recommended): run the repo script (PowerShell)

From repo root:

```powershell
# Don't commit this value anywhere.
$env:CONVERSION_SERVICE_KEY = "<shared secret>"

.\scripts\deploy-cloud-run-conversion-service.ps1 `
  -ProjectId "<GCP_PROJECT_ID>" `
  -Region "<GCP_REGION>" `
  -UseSecretManager
```

This prints the Cloud Run service URL and uses:

- Artifact Registry repo: `cloud-run-source-deploy` (created if missing)
- Runtime service account: `writing-system-conversion-sa` (created if missing)
- Secret Manager secret: `conversion-service-key` (created if missing; new version added)

### Option B: manual gcloud commands (copy/paste)

```powershell
# Set your project + region
gcloud config set project <GCP_PROJECT_ID>
gcloud config set run/region <GCP_REGION>

# Enable required APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

# (Optional but recommended) create the Artifact Registry repo Cloud Run source deploys often use
gcloud artifacts repositories create cloud-run-source-deploy --repository-format=docker --location <GCP_REGION> 2>$null

# Runtime service account (no Google API access needed, except Secret Manager read)
gcloud iam service-accounts create writing-system-conversion-sa --display-name writing-system-conversion-sa 2>$null

# Store the shared secret in Secret Manager
gcloud secrets create conversion-service-key --replication-policy=automatic 2>$null
echo "<shared secret>" | gcloud secrets versions add conversion-service-key --data-file=-

# Allow the Cloud Run runtime service account to read the secret
gcloud secrets add-iam-policy-binding conversion-service-key `
  --member "serviceAccount:writing-system-conversion-sa@<GCP_PROJECT_ID>.iam.gserviceaccount.com" `
  --role "roles/secretmanager.secretAccessor"

# Deploy from source (no local Docker required)
gcloud run deploy writing-system-conversion-service `
  --source services/conversion-service `
  --allow-unauthenticated `
  --ingress all `
  --port 8000 `
  --cpu 2 `
  --memory 4Gi `
  --concurrency 1 `
  --timeout 1800 `
  --service-account writing-system-conversion-sa@<GCP_PROJECT_ID>.iam.gserviceaccount.com `
  --set-secrets CONVERSION_SERVICE_KEY=conversion-service-key:latest

# Get the service URL (use this for Supabase CONVERSION_SERVICE_URL)
gcloud run services describe writing-system-conversion-service --format "value(status.url)"
```

## 9) Post-deploy checks (manual)

1) Confirm auth gate works:

Missing header should be 401:

```powershell
curl.exe -i -X POST "<CLOUD_RUN_URL>/convert" -H "Content-Type: application/json" -d "{}"
```

2) Confirm endpoint accepts requests with header (expected to return `{"ok": true}` only if payload is valid; otherwise it should still be non-401):

```powershell
curl.exe -i -X POST "<CLOUD_RUN_URL>/convert" `
  -H "X-Conversion-Service-Key: <shared secret>" `
  -H "Content-Type: application/json" `
  -d "{}"
```

Notes:

- A valid payload is normally generated by Supabase `POST /functions/v1/ingest`.
- For quick verification, the "wrong payload" check is still useful because it proves auth is correct and the app is reachable.

## 10) Required Supabase configuration (secrets)

These must be set in Supabase Dashboard -> Project Settings -> Edge Functions -> Secrets:

- `CONVERSION_SERVICE_URL = <CLOUD_RUN_URL>` (no trailing slash)
- `CONVERSION_SERVICE_KEY = <same secret>`

Other required secrets should already be set, but confirm:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (legacy anon JWT key used by clients/smoke tests)
- `SUPABASE_SERVICE_ROLE_KEY` (Edge Functions server-side)
- `DOCUMENTS_BUCKET` (optional; default `documents`)

## 11) Risks / likely issues (so we don't get stuck)

- Docling + PDF: if PDF conversion fails due to missing system libraries, we may need to extend the Dockerfile with `apt-get` dependencies. If this happens, verify `.docx` first (often simpler).
- Timeouts: if PDFs are slow, increase Cloud Run timeout and/or memory.
- Auth: Cloud Run is intentionally public; the shared secret header is required. Do not remove the header check in code.
- URL formatting: `CONVERSION_SERVICE_URL` should be the base URL only (no trailing slash). The Edge Function appends `/convert`.

## 12) Hand-off back to Jon

Please send:

1. Cloud Run service URL
2. Confirmation of region + resource settings used
3. Confirmation that `POST /convert` returns 401 without header
4. Whether you updated Supabase secrets or want Jon to do it

