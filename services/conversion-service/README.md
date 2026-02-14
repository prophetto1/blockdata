# Conversion Service (FastAPI) - Multi-Track Ingest Conversion

This service converts non-Markdown uploads into normalized markdown and parser representation artifacts, then calls back the Edge Function.

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
  "track": "docling|pandoc|mdast",
  "source_type": "docx|pdf|pptx|xlsx|html|csv|txt|rst|latex|odt|epub|rtf|org",
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
  "pandoc_output": {
    "bucket": "documents",
    "key": "converted/<source_uid>/<name>.pandoc.ast.json",
    "signed_upload_url": "https://...signed...",
    "token": null
  },
  "callback_url": "https://<project-ref>.supabase.co/functions/v1/conversion-complete"
}
```

Notes:

1. `output` (markdown target) is required.
2. `docling_output` is used when Docling JSON is available (primary or supplemental).
3. `pandoc_output` is used when Pandoc AST is available (primary or supplemental).
4. `track=mdast` currently supports `txt` conversion path in this service.
5. For backward compatibility, if `track` is omitted:
   - `txt` defaults to `mdast`
   - non-`txt` defaults to `docling`

On completion (success or failure), the service POSTs to `callback_url` with:

```json
{
  "source_uid": "...",
  "conversion_job_id": "...",
  "track": "docling|pandoc|mdast",
  "md_key": "converted/<source_uid>/<name>.md",
  "docling_key": "converted/<source_uid>/<name>.docling.json",
  "pandoc_key": "converted/<source_uid>/<name>.pandoc.ast.json",
  "success": true,
  "error": null
}
```

Key semantics:

1. `docling_key` is null unless Docling JSON upload succeeded.
2. `pandoc_key` is null unless Pandoc AST upload succeeded.
3. `track` is the resolved conversion track used by the service.
4. Callback auth uses the same shared secret in `X-Conversion-Service-Key`.

## Determinism

1. Docling JSON representation is canonicalized (`sort_keys=True`, compact separators).
2. Pandoc AST JSON is canonicalized (`sort_keys=True`, compact separators).
3. This supports stable `conv_uid` generation in `conversion-complete`.

## Track behavior summary

1. `docling`:
   - converts via Docling to markdown,
   - emits `doclingdocument_json` when requested,
   - can emit supplemental `pandoc_ast_json` when requested and supported.
2. `pandoc`:
   - converts via Pandoc to markdown (`gfm`),
   - emits `pandoc_ast_json`,
   - can emit supplemental `doclingdocument_json` when requested and supported.
3. `mdast`:
   - currently direct text decode path for `txt`,
   - can emit supplemental parser artifacts when requested and supported.
