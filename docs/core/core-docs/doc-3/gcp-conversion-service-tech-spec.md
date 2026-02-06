# Doc 3 — Conversion Service (GCP Cloud Run) (Technical Spec, Present-Oriented)

Purpose: guide development/operation of the conversion service that turns non-Markdown uploads into canonical Markdown for ingest.

Non-goal: final product vision (Doc 1/2).

---

## Role in the System

- Called by Supabase Edge Functions for non-md uploads (`docx|pdf|txt`).
- Performs format conversion and writes the resulting Markdown bytes back to Supabase Storage using signed URLs.
- Calls back into Supabase Edge Functions to complete ingest.

Hard boundary:
- Conversion service must not access Postgres directly.

---

## Endpoint

- `POST /convert`

Auth model:
- Public HTTPS endpoint.
- Required header: `X-Conversion-Service-Key: <shared secret>`.

---

## Expected Request (Conceptual)

The request must provide:
- Source download URL (signed)
- Destination upload URL (signed) for the converted markdown
- `source_uid` and `conversion_job_id` for callback correlation
- `callback_url` that points to the deployed Supabase Edge Function path:
  - `/functions/v1/conversion-complete`

---

## Behavior

1) Download source bytes from the signed URL.
2) Convert:
   - `.docx`/`.pdf`: Docling → Markdown
   - `.txt`: decode to text → wrap as Markdown
3) Upload canonical Markdown bytes to the signed upload URL.
4) POST callback to Supabase with `{ source_uid, conversion_job_id, md_locator }` (and any other required fields) and the shared secret header.

Failure semantics:
- If conversion fails, callback should report the error so `documents.status` can become `conversion_failed`.

---

## Operational Requirements

- Expect heavy image/ML dependencies (Docling) and longer build times.
- PDFs may require higher memory/timeouts; scale Cloud Run settings accordingly.
- Do not log secrets; do not persist user content beyond runtime.

