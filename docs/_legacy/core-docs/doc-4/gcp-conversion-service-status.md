# Doc 4 — Conversion Service (GCP Cloud Run) (Implementation Status, As-Is)

Purpose: describe what exists now: deployed service, reachability, and how to verify.

---

## Current Deployment (Recorded)

This repo contains a status snapshot in `docs/work-request/gcp-cloud-run-conversion-service-status.md`.

This canonical status doc intentionally does not restate secrets.

---

## Verification (As-Is)

Reachability + auth gate:
- Service responds over HTTPS.
- Missing/incorrect `X-Conversion-Service-Key` returns 401.

Next end-to-end verification:
- Upload a non-md file and observe `documents.status` moving `converting → ingested`.

