# Reconstruct Endpoint 401 Diagnosis

**Date:** 2026-03-14
**Status:** Root cause identified, fix not yet applied
**Symptom:** `POST /reconstruct` returns 401 Unauthorized for all browser-initiated calls

---

## Root Cause

The Cloud Run service `blockdata-platform-api` lacks the environment variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Without these, the server cannot validate Supabase JWTs sent by the browser.

## Evidence

### 1. Cloud Run env vars (verified via `gcloud run services describe`)

The service has exactly three env vars:

| Env Var | Source |
|---------|--------|
| `CONVERSION_MAX_WORKERS` | literal `"2"` |
| `PLATFORM_API_M2M_TOKEN` | Secret Manager: `conversion-service-key` |
| `CONVERSION_SERVICE_KEY` | Secret Manager: `conversion-service-key` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are absent.

### 2. Config defaults to empty strings

`services/platform-api/app/core/config.py:26-27`:
```python
supabase_url=os.environ.get("SUPABASE_URL", ""),
supabase_service_role_key=os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
```

When these env vars are unset, both resolve to `""`.

### 3. JWT validation fails with empty credentials

`services/platform-api/app/auth/dependencies.py:20-27`:
```python
def _verify_supabase_jwt(token: str) -> Any:
    from supabase import create_client
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    response = client.auth.get_user(token)
    ...
```

`create_client("", "")` fails. The exception is caught at line 96-98, logged at DEBUG level, and a 401 is returned.

### 4. Cloud Run logs confirm repeated 401s

```
2026-03-14 04:21:07 POST 401 .../reconstruct
2026-03-14 04:21:09 POST 401 .../reconstruct
2026-03-14 04:21:10 POST 401 .../reconstruct
(continues for every attempt)
```

### 5. M2M auth (used by edge functions) works because it bypasses JWT validation

Edge functions authenticate via `X-Conversion-Service-Key` header, which matches Path 3 in `require_auth` (line 120-128). This path compares the header value against the `CONVERSION_SERVICE_KEY` env var directly — no Supabase client needed.

The browser's `platformApiFetch` sends a `Bearer` token (Supabase JWT), which hits Path 2 (line 94-117) and requires the Supabase client to validate. This is where it fails.

### 6. Deploy script does not set Supabase env vars

`scripts/deploy-cloud-run-platform-api.ps1` only configures `CONVERSION_MAX_WORKERS`, `PLATFORM_API_M2M_TOKEN`, and `CONVERSION_SERVICE_KEY`. No reference to `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` exists in the deploy script.

## Auth Flow Summary

```
Browser → platformApiFetch('/reconstruct', { Bearer: <supabase-jwt> })
  → require_auth (dependencies.py:65)
    → Path 1: M2M match? NO (it's a user JWT, not the M2M token)
    → Path 2: Validate as Supabase JWT
      → _verify_supabase_jwt(token)
        → create_client("", "")  ← FAILS (empty URL/key)
        → exception caught → 401 "Invalid bearer token"

Edge Function → POST /convert { X-Conversion-Service-Key: <shared-secret> }
  → AuthBeforeBodyMiddleware (middleware.py)
    → M2M bearer? NO
    → Legacy header match? YES → passes through
  → require_auth
    → Path 3: Legacy header match → AuthPrincipal(machine) ← WORKS
```

## Required Fix

Add two env vars to the Cloud Run service:

| Env Var | Value | Sensitive? |
|---------|-------|------------|
| `SUPABASE_URL` | `https://dbdzzhshmigewyprahej.supabase.co` | No |
| `SUPABASE_SERVICE_ROLE_KEY` | (service role key from Supabase dashboard) | Yes — use Secret Manager |

### Option A: gcloud update (quick)

```bash
# Set non-sensitive URL directly
gcloud run services update blockdata-platform-api \
  --project agchain --region us-central1 \
  --set-env-vars "SUPABASE_URL=https://dbdzzhshmigewyprahej.supabase.co"

# Create secret for service role key, then mount it
gcloud secrets create supabase-service-role-key --project agchain \
  --replication-policy automatic
echo -n "<SERVICE_ROLE_KEY>" | gcloud secrets versions add supabase-service-role-key \
  --project agchain --data-file=-
gcloud run services update blockdata-platform-api \
  --project agchain --region us-central1 \
  --update-secrets "SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest"
```

### Option B: Update deploy script (durable)

Modify `scripts/deploy-cloud-run-platform-api.ps1` to include both env vars so future deploys don't regress.

Both options should be done — Option A for immediate fix, Option B to prevent recurrence.

## What This Does NOT Affect

- `/convert` endpoint — uses M2M auth, unaffected
- `/citations` endpoint — uses M2M auth, unaffected
- Edge function calls — use `X-Conversion-Service-Key`, unaffected
- The frontend code changes (DoclingMdTab, BlocksTab using reconstruct) — correct as written, blocked only by this infra gap
