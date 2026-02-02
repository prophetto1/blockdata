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
  "callback_url": "https://<project>.functions.supabase.co/conversion-complete"
}
```

Notes on `docling_output`:

- Optional debug artifact. If present, the service will also upload Docling's structured document export as JSON.
- This is not used by Phase 1 ingestion (which remains Markdown -> remark -> blocks).

On completion (success or failure), the service POSTs to `callback_url` with:

```json
{
  "source_uid": "…",
  "conversion_job_id": "…",
  "md_key": "converted/<source_uid>/<name>.md",
  "success": true,
  "error": null
}
```

## Notes

- Upload uses the provided `signed_upload_url` and sends the markdown body as `text/markdown; charset=utf-8`.
- When `docling_output` is provided, the JSON is uploaded as `application/json; charset=utf-8`.
- Conversion uses Docling for `docx/pdf` and a direct decode for `txt`.
