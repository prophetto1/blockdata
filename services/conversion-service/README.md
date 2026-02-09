# Conversion Service (FastAPI) — Docling ingress (Phase 1)

This service converts non-Markdown uploads (`.docx`, `.pdf`, `.txt`) into Markdown and writes the `.md` back to Supabase Storage **via a signed upload URL** provided by the Edge Function.

It never touches Postgres and receives no Supabase keys.

## Env vars

- `CONVERSION_SERVICE_KEY` (shared secret; required)

## HTTP

### `POST /convert`

Headers:

- `X-Conversion-Service-Key: <CONVERSION_SERVICE_KEY>`

Body (JSON):

```json
{
  "source_uid": "…",
  "conversion_job_id": "…",
  "source_type": "docx",
  "source_download_url": "https://…signed…",
  "output": {
    "bucket": "documents",
    "key": "converted/<source_uid>/<name>.md",
    "signed_upload_url": "https://…signed…",
    "token": null
  },
  "docling_output": {
    "bucket": "documents",
    "key": "converted/<source_uid>/<name>.docling.json",
    "signed_upload_url": "https://…signed…",
    "token": null
  },
  "callback_url": "https://<project-ref>.supabase.co/functions/v1/conversion-complete"
}
```

Notes on `docling_output`:

- Required for `docx` and `pdf` uploads. The ingest function always provides this for Docling-handled types.
- The service serializes `DoclingDocument.export_to_dict()` as deterministic JSON (`sort_keys=True`, compact separators) for hash-stable `conv_uid` computation.
- For `txt` uploads, `docling_output` is null (txt uses direct decode, not Docling).

On completion (success or failure), the service POSTs to `callback_url` with:

```json
{
  "source_uid": "…",
  "conversion_job_id": "…",
  "md_key": "converted/<source_uid>/<name>.md",
  "docling_key": "converted/<source_uid>/<name>.docling.json",
  "success": true,
  "error": null
}
```

Note: `docling_key` is null when `docling_output` was not provided or when `export_to_dict()` is not available.

## Notes

- Upload uses the provided `signed_upload_url` and sends the markdown body as `text/markdown; charset=utf-8`.
- When `docling_output` is provided, the JSON is uploaded as `application/json; charset=utf-8`.
- Conversion uses Docling for `docx/pdf` and a direct decode for `txt`.
