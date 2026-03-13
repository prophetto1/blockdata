> **DEPRECATED** — This service has been merged into `services/platform-api/`.
> See `docs/platform-api/2026-03-10-platform-api-merge.md` for the migration plan.
> This directory will be removed after the dual-run period.

# Conversion Service (FastAPI) - Docling-Only Parsing

This service converts uploads into normalized markdown and Docling representation artifacts, then calls back the Edge Function.

It never writes Postgres directly and does not require Supabase service-role keys.

## Env vars

- `CONVERSION_SERVICE_KEY` (shared secret; required)

## HTTP

### `POST /convert`

Headers:

- `X-Conversion-Service-Key: <CONVERSION_SERVICE_KEY>`

Body (JSON):

```json
{
  "source_uid": "...",
  "conversion_job_id": "...",
  "track": "docling",
  "source_type": "docx|pdf|pptx|xlsx|html|csv|txt|md|markdown|rst|latex|odt|epub|rtf|org",
  "source_download_url": "https://...signed...",
  "output": {
    "bucket": "documents",
    "key": "converted/<source_uid>/<name>.md",
    "signed_upload_url": "https://...signed...",
    "token": null
  },
  "docling_output": {
    "bucket": "documents",
    "key": "converted/<source_uid>/<name>.docling.json",
    "signed_upload_url": "https://...signed...",
    "token": null
  },
  "html_output": {
    "bucket": "documents",
    "key": "converted/<source_uid>/<name>.html",
    "signed_upload_url": "https://...signed...",
    "token": null
  },
  "doctags_output": {
    "bucket": "documents",
    "key": "converted/<source_uid>/<name>.doctags",
    "signed_upload_url": "https://...signed...",
    "token": null
  },
  "callback_url": "https://<project-ref>.supabase.co/functions/v1/conversion-complete"
}
```

Notes:

1. `output` (markdown target) is required.
2. `docling_output` is used when Docling JSON is requested.
3. `html_output` and `doctags_output` are used when Docling output exports are requested.
4. All formats are parsed via Docling. `track` must be `"docling"` (or omitted, defaults to `"docling"`).

On completion (success or failure), the service POSTs to `callback_url` with:

```json
{
  "source_uid": "...",
  "conversion_job_id": "...",
  "track": "docling",
  "md_key": "converted/<source_uid>/<name>.md",
  "docling_key": "converted/<source_uid>/<name>.docling.json",
  "html_key": "converted/<source_uid>/<name>.html",
  "doctags_key": "converted/<source_uid>/<name>.doctags",
  "success": true,
  "error": null
}
```

Key semantics:

1. `docling_key` is null unless Docling JSON upload succeeded.
2. `html_key` / `doctags_key` are null unless those exports were requested and uploaded.
3. Callback auth uses the same shared secret in `X-Conversion-Service-Key`.

## Determinism

1. Docling JSON representation is canonicalized (`sort_keys=True`, compact separators).
2. This supports stable `conv_uid` generation in `conversion-complete`.

## Track behavior

All formats are converted via Docling:
- Produces markdown export as primary output.
- Emits `doclingdocument_json` when requested.
- Can emit `html_bytes` and `doctags_text` when requested.