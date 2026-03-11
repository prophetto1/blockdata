# Platform API Migration Plan (Task 13)

## Context

Tasks 1–12 of the platform-api merge plan are complete. The unified `services/platform-api/` service is built, tested (44 tests), and has a Cloud Run deploy script ready. What remains is the operational migration: deploying the new service, cutting over callers, adding deprecation markers to old services, and decommissioning.

The old services (`conversion-service`, `pipeline-worker`) are still fully present in the repo with no deprecation markers. Edge functions use `CONVERSION_SERVICE_URL` env var — the interface is identical, only the URL needs to change.

**Plan doc:** `docs/platform-api/2026-03-10-platform-api-merge.md` → Task 13

### Service name mapping

The checked-in deploy scripts use different Cloud Run service name defaults:

| Service | Deploy script default | Notes |
|---------|----------------------|-------|
| conversion-service | `writing-system-conversion-service` | `deploy-cloud-run-conversion-service.ps1` line 8 |
| platform-api | `blockdata-platform-api` | `deploy-cloud-run-platform-api.ps1` line 8 |
| pipeline-worker | *(no deploy script)* | Confirm actual Cloud Run name before operating |

**Action required before Phase 4:** Verify the actual deployed Cloud Run service names with `gcloud run services list` before running any scale/delete commands. Do not assume names from the plan doc.

---

## Phase 1: Add Deprecation Markers to Old Services

Mark both old services as deprecated so future contributors don't accidentally invest in dead code.

### Files to modify:

**1. `services/conversion-service/app/main.py`** — Add startup log at top of app initialization:
```python
import logging
logging.getLogger(__name__).warning(
    "DEPRECATED: conversion-service has been merged into services/platform-api/. "
    "See docs/platform-api/2026-03-10-platform-api-merge.md Task 13. "
    "This service will be decommissioned after the dual-run period."
)
```

> `logging.warning()` instead of `warnings.warn(DeprecationWarning)` — DeprecationWarning is filtered by default in Python, so it would be invisible in production. A startup log warning is visible in Cloud Run logs.

**2. `services/pipeline-worker/app/main.py`** — Same startup log:
```python
import logging
logging.getLogger(__name__).warning(
    "DEPRECATED: pipeline-worker has been merged into services/platform-api/. "
    "See docs/platform-api/2026-03-10-platform-api-merge.md Task 13. "
    "This service will be decommissioned after the dual-run period."
)
```

**3. `services/conversion-service/README.md`** — Add deprecation banner at top:
```markdown
> **DEPRECATED** — This service has been merged into `services/platform-api/`.
> See `docs/platform-api/2026-03-10-platform-api-merge.md` for the migration plan.
> This directory will be removed after the dual-run period.
```

**4. `services/conversion-service/Dockerfile`** — Add comment at top:
```dockerfile
# DEPRECATED: Use services/platform-api/Dockerfile instead.
# See docs/platform-api/2026-03-10-platform-api-merge.md
```

**5. `services/pipeline-worker/Dockerfile`** — Same comment at top.

**6. `scripts/deploy-cloud-run-conversion-service.ps1`** — Add deprecation comment at top:
```powershell
# DEPRECATED: Use scripts/deploy-cloud-run-platform-api.ps1 instead.
# See docs/platform-api/2026-03-10-platform-api-merge.md
```

### Commit
```
chore: add deprecation markers to conversion-service and pipeline-worker
```

---

## Phase 2: Deploy Platform API (Dual-Run)

Deploy platform-api alongside the existing services. Both old and new run simultaneously.

### Steps:

1. **Deploy platform-api to Cloud Run**
   ```bash
   ./scripts/deploy-cloud-run-platform-api.ps1
   ```

2. **Smoke test platform-api in isolation**
   - `GET /health` → `{"status": "ok"}`
   - `GET /health/live` → `{"status": "alive"}`
   - `GET /health/ready` → pool status + saturated flag
   - `GET /functions` → matches pipeline-worker output
   - `POST /citations` with legacy header auth (`X-Conversion-Service-Key`)
   - `POST /citations` with M2M bearer auth (`Authorization: Bearer ...`)
   - `POST /convert` with a real test document → verify callback fires + artifacts in storage

3. **Verify auth paths**
   - M2M bearer (`Authorization: Bearer $PLATFORM_API_M2M_TOKEN`)
   - Legacy header (`X-Conversion-Service-Key: $CONVERSION_SERVICE_KEY`)
   - Supabase JWT (if applicable at this stage)

---

## Phase 3: Cut Over External Callers

Switch all callers from old services to platform-api.

### Steps:

1. **Update Supabase edge function env var**
   ```bash
   supabase secrets set CONVERSION_SERVICE_URL=https://<platform-api-url>
   ```

   Three edge function files consume `CONVERSION_SERVICE_URL` (no code changes needed — they read the env var at runtime):
   - `supabase/functions/ingest/process-convert.ts` (line 135)
   - `supabase/functions/trigger-parse/index.ts` (line 185)
   - `supabase/functions/_shared/citations.ts` (line 84)

   One edge function uses only `CONVERSION_SERVICE_KEY` (for callback validation, not outbound calls) — no change needed:
   - `supabase/functions/conversion-complete/index.ts` (line 44)

   Note: `CONVERSION_SERVICE_KEY` stays the same — platform-api accepts it via legacy header auth.

2. **Update registry_services base URLs**
   ```sql
   UPDATE registry_services
   SET base_url = 'https://<platform-api-url>'
   WHERE base_url LIKE '%pipeline-worker%' OR base_url LIKE '%conversion-service%';
   ```

3. **Update Kestra workflow base URLs** (if any reference pipeline-worker directly)

4. **End-to-end verification**
   - Upload a document through the frontend → full pipeline works
   - Run a Kestra workflow that calls a plugin → works
   - Check Supabase logs for auth failures

---

## Phase 4: Monitor and Decommission

### Prerequisite: Confirm actual Cloud Run service names

```bash
gcloud run services list --format="value(SERVICE)"
```

Use the actual names from this output in all commands below. The conversion-service deploy script defaults to `writing-system-conversion-service` (not `blockdata-conversion-service` as the plan doc assumed).

### Steps:

1. **Record current scaling config** (needed for rollback)
   ```bash
   # Save these values — you will need them if rollback is required after scale-to-zero
   gcloud run services describe <actual-conversion-service-name> \
     --format="value(spec.template.spec.containerConcurrency,spec.template.metadata.annotations['autoscaling.knative.dev/minScale'],spec.template.metadata.annotations['autoscaling.knative.dev/maxScale'])"
   gcloud run services describe <actual-pipeline-worker-name> \
     --format="value(spec.template.spec.containerConcurrency,spec.template.metadata.annotations['autoscaling.knative.dev/minScale'],spec.template.metadata.annotations['autoscaling.knative.dev/maxScale'])"
   ```

2. **Monitor dual-run period (24–48 hours)**
   - Cloud Run logs for platform-api — watch for errors
   - Cloud Run logs for old services — traffic should drop to zero
   - Supabase edge function logs — watch for callback failures

3. **Scale old services to zero** (keeps them for rollback)
   ```bash
   gcloud run services update <actual-conversion-service-name> --min-instances 0 --max-instances 0
   gcloud run services update <actual-pipeline-worker-name> --min-instances 0 --max-instances 0
   ```

4. **Wait 24 more hours**, then delete if no issues:
   ```bash
   gcloud run services delete <actual-conversion-service-name>
   gcloud run services delete <actual-pipeline-worker-name>
   ```

5. **Rollback procedure** (if needed at any point):

   **Before scale-to-zero** (services still have capacity):
   ```bash
   # Revert the env var
   supabase secrets set CONVERSION_SERVICE_URL=https://<old-conversion-service-url>
   ```

   **After scale-to-zero** (must restore capacity first):
   ```bash
   # Step 1: Restore old service capacity using values recorded in step 1
   gcloud run services update <actual-conversion-service-name> --min-instances <recorded-min> --max-instances <recorded-max>
   gcloud run services update <actual-pipeline-worker-name> --min-instances <recorded-min> --max-instances <recorded-max>
   # Step 2: Wait for at least one instance to become healthy
   gcloud run services describe <actual-conversion-service-name> --format="value(status.conditions)"
   # Step 3: Only THEN revert the env var
   supabase secrets set CONVERSION_SERVICE_URL=https://<old-conversion-service-url>
   ```

   **After deletion** — rollback requires redeployment from source:
   ```bash
   # conversion-service: has a deploy script
   ./scripts/deploy-cloud-run-conversion-service.ps1

   # pipeline-worker: no deploy script exists — deploy manually:
   gcloud run deploy <actual-pipeline-worker-name> \
     --source services/pipeline-worker \
     --region <region> \
     --set-env-vars="SUPABASE_URL=...,SUPABASE_SERVICE_ROLE_KEY=..." \
     --min-instances 0 --max-instances <recorded-max>
   # Then revert the env var and registry URLs (Phase 3 in reverse)
   ```

---

## Verification

- **Phase 1:** `git diff` shows deprecation markers in 6 files. Old services still work (log warning is non-fatal).
- **Phase 2:** `curl /health` and `curl /health/ready` on platform-api return 200. All smoke tests pass.
- **Phase 3:** Frontend document upload triggers conversion via platform-api (check Cloud Run logs). Old service logs show zero traffic.
- **Phase 4:** After decommission, old Cloud Run services are gone. Platform-api handles all traffic.

---

## Critical Files

| File | Action |
|------|--------|
| `services/conversion-service/app/main.py` | Add deprecation log warning |
| `services/pipeline-worker/app/main.py` | Add deprecation log warning |
| `services/conversion-service/README.md` | Add deprecation banner |
| `services/conversion-service/Dockerfile` | Add deprecation comment |
| `services/pipeline-worker/Dockerfile` | Add deprecation comment |
| `scripts/deploy-cloud-run-conversion-service.ps1` | Add deprecation comment |
| `scripts/deploy-cloud-run-platform-api.ps1` | Used for deployment (no changes) |
| `supabase/functions/ingest/process-convert.ts` | No code change — env var update |
| `supabase/functions/trigger-parse/index.ts` | No code change — env var update |
| `supabase/functions/_shared/citations.ts` | No code change — env var update |
| `supabase/functions/conversion-complete/index.ts` | No change — only validates KEY, not URL |
