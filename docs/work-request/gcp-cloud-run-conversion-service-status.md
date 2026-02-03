# GCP Cloud Run Status — `writing-system-conversion-service`

Last updated: 2026-02-03  
Owner: writing-system

## Summary

The `conversion-service` is deployed to **Google Cloud Run** and is reachable over public HTTPS. The service is intended to be called by Supabase Edge Functions for converting `.docx`, `.pdf`, and `.txt` uploads into Markdown.

## Deployment Details

- GCP project: `gen-lang-client-0774445557`
- Region: `us-central1`
- Cloud Run service name: `writing-system-conversion-service`
- Service URL: `https://writing-system-conversion-service-a7sxc3pnla-uc.a.run.app`
- Convert endpoint: `POST https://writing-system-conversion-service-a7sxc3pnla-uc.a.run.app/convert`
- Auth model: public endpoint + required request header (`X-Conversion-Service-Key`)
- Secret storage: Google Secret Manager secret named `conversion-service-key` is configured as env var `CONVERSION_SERVICE_KEY` on the Cloud Run service (value not recorded here).

## Verification Performed

- Reachability: service URL responds over HTTPS.
- Auth gate:
  - Missing/incorrect auth header returns `401 Unauthorized`.
  - Valid auth header reaches application logic (invalid `{}` body returns `422` due to missing required fields; this is expected for an intentionally-invalid test payload).

## Notes / Operational Details

- Builds are slow/heavy because the `docling` dependency pulls large ML-related Python packages; expect Cloud Build to take several minutes.
- The GCP CLI printed a warning about the project missing an `environment` tag; deploy still succeeded.

## Next Steps (Non-GCP)

- Supabase Edge Function secrets should be set (do not include trailing slash):
  - `CONVERSION_SERVICE_URL=https://writing-system-conversion-service-a7sxc3pnla-uc.a.run.app`
  - `CONVERSION_SERVICE_KEY=<same shared secret as Cloud Run>`
- Run end-to-end: upload a non-markdown file and confirm `converting -> ingested`, blocks created, and export works.
  - Suggested local check: `scripts/smoke-test-non-md.ps1` (defaults to generating and uploading a `.txt`, which validates the full conversion callback wiring; pass `-FilePath` with a `.pdf`/`.docx` to validate Docling itself).
