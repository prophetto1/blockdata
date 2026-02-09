# Docling Track Implementation — State Log

**Date:** 2026-02-08
**Companion:** `0208-non-md-docling-track-implementation-plan.md`

---

## Pre-Implementation State

### What exists today (before any changes)

| Component | File | Current behavior |
|---|---|---|
| **Ingest (Edge Function)** | `supabase/functions/ingest/index.ts` | Non-MD uploads: creates `documents_v2` row with `conv_uid=null`, sends to Python conversion service. `docling_output` signed URL created **only** when `ENABLE_DOCLING_DEBUG_EXPORT=true` (env flag, default false). |
| **Conversion service** | `services/conversion-service/app/main.py` | Converts docx/pdf via Docling → `export_to_markdown()`. Optional: if `docling_output` provided, also calls `export_to_dict()` with `indent=2` (pretty-printed, NOT deterministic). Callback POST does NOT include `docling_key`. |
| **Conversion-complete** | `supabase/functions/conversion-complete/index.ts` | Always downloads Markdown from `md_key`, parses via mdast, writes `conv_parsing_tool='mdast'`, `conv_representation_type='markdown_bytes'`, `block_locator.type='text_offset_range'`. No docling branch. |
| **Block extraction** | `supabase/functions/_shared/markdown.ts` | mdast-only. No `_shared/docling.ts` exists. |
| **Smoke test** | `scripts/smoke-test-non-md.ps1` | Creates a `.txt` file. Polls `documents_v2`. Warns (does not fail) if `conv_parsing_tool != 'mdast'`. No docx/pdf fixture. |
| **Conversion README** | `services/conversion-service/README.md` | Documents `docling_output` as "optional debug artifact". Callback schema has no `docling_key` field. |
| **Database** | `documents_v2` + `blocks_v2` | CHECK constraint already enforces `docling ↔ doclingdocument_json` pairing. No rows use docling track yet — all rows have `conv_parsing_tool='mdast'`. |

### Non-MD pipeline flow (current)

```
Upload .docx/.pdf
  → ingest: store in Storage, create documents_v2 (status=converting), POST /convert
  → conversion-service: Docling → export_to_markdown() → upload .md
  → callback: { source_uid, conversion_job_id, md_key, success }
  → conversion-complete: download .md → mdast parse → blocks_v2
  → Result: conv_parsing_tool=mdast, block_locator.type=text_offset_range
```

### What the spec requires (from immutable-fields.md + blocks.md)

```
Upload .docx/.pdf
  → ingest: store in Storage, create documents_v2 (status=converting), POST /convert with docling_output
  → conversion-service: Docling → export_to_dict() deterministic JSON → upload .docling.json + .md
  → callback: { source_uid, conversion_job_id, md_key, docling_key, success }
  → conversion-complete: download .docling.json → extract blocks from DoclingDocument → blocks_v2
  → Result: conv_parsing_tool=docling, block_locator.type=docling_json_pointer
```

---

## Post-Implementation State

**Completed:** 2026-02-08

### What changed

| Component | File | New behavior |
|---|---|---|
| **Ingest (Edge Function)** | `supabase/functions/ingest/index.ts` (v9) | Non-MD uploads: `docling_output` signed URL **always** created for `docx`/`pdf` (no env flag). `txt` still gets `null`. Removed `ENABLE_DOCLING_DEBUG_EXPORT` gate. |
| **Conversion service** | `services/conversion-service/app/main.py` | `export_to_dict()` serialized with **deterministic JSON** (`sort_keys=True, separators=(",",":")`) for hash-stable `conv_uid`. Callback POST now includes `docling_key` field (set when docling JSON was uploaded, `null` otherwise). |
| **Conversion-complete** | `supabase/functions/conversion-complete/index.ts` (v5) | Two-branch logic: if `docling_key` present → downloads `.docling.json`, computes `conv_uid = sha256("docling\ndoclingdocument_json\n" + bytes)`, extracts blocks via `extractDoclingBlocks()`, writes `conv_parsing_tool='docling'`, `block_locator.type='docling_json_pointer'`. Falls back to mdast track when `docling_key` absent (txt, legacy). |
| **Block extraction** | `supabase/functions/_shared/docling.ts` (NEW) | Parses DoclingDocument JSON. Traverses `body.children[]` then `furniture.children[]`. Resolves `$ref` pointers to texts/tables/pictures/kv/forms. Maps Docling labels to platform `block_type` enum. Returns `{ docTitle, blocks[] }` with `pointer` and `page_no` per block. |
| **Smoke test** | `scripts/smoke-test-non-md.ps1` | Defaults to `.docx` fixture (`docs/tests/test-pack/lorem_ipsum.docx`). Falls back to `.txt` if missing. Hard assertions for docling track fields (`conv_parsing_tool`, `conv_representation_type`, `block_locator.type`, `pointer`). Prints first block sample. |
| **Conversion README** | `services/conversion-service/README.md` | `docling_output` documented as required for `docx`/`pdf`. Callback schema includes `docling_key`. Deterministic JSON noted. |
| **Database** | `documents_v2` + `blocks_v2` | No schema changes needed — CHECK constraint already supports `docling ↔ doclingdocument_json` pairing. New rows will use docling track for docx/pdf uploads. |

### Non-MD pipeline flow (post-implementation)

```
Upload .docx/.pdf
  → ingest: store in Storage, create documents_v2 (status=converting),
    create signed URLs for .md + .docling.json, POST /convert with docling_output
  → conversion-service: Docling → export_to_dict() deterministic JSON → upload .docling.json + .md
  → callback: { source_uid, conversion_job_id, md_key, docling_key, success }
  → conversion-complete: download .docling.json → extractDoclingBlocks() → blocks_v2
  → Result: conv_parsing_tool=docling, conv_representation_type=doclingdocument_json,
    block_locator.type=docling_json_pointer

Upload .txt
  → Same as before (mdast fallback): docling_output=null, no docling_key in callback
  → Result: conv_parsing_tool=mdast, block_locator.type=text_offset_range
```

### Deployment versions

| Function | Version | SHA256 |
|---|---|---|
| `ingest` | v9 | `edbe224326ddd9a503cf2f041385f9db010b74dd55930508965cce2bbda8fe72` |
| `conversion-complete` | v5 | `7ee54d9e689ee015fafa5e7798701a1a73e4690b33a47c55c66a48cae6b3a3a3` |

### Remaining work

- **Conversion service redeployment** (Cloud Run): `services/conversion-service/app/main.py` changes need deployment outside Supabase. Until redeployed, the old service won't send `docling_key` in callbacks, so `conversion-complete` will use the mdast fallback gracefully.
- **End-to-end smoke test**: Run `scripts/smoke-test-non-md.ps1` after conversion service is redeployed to verify full docling track pipeline.

---
