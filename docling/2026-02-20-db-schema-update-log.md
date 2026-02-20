# Database Schema Update Log — 2026-02-20

## Summary

Three categories of changes were applied in this session:
1. **Split `documents_v2`** into two normalized tables + a read-only view
2. **Rename `_v2` tables** to clean names (4 tables)
3. **Replace CHECK constraints** with lookup catalog tables (8 catalogs)

---

## 1. Table Split: `documents_v2` → `source_documents` + `conversion_parsing`

The monolithic `documents_v2` table was split into two normalized tables with a read-only JOIN view.

| Before | After | Purpose |
|---|---|---|
| `documents_v2` (table) | `source_documents` (table) | Upload metadata, ownership, status |
| | `conversion_parsing` (table) | Conversion/parsing results per source |
| | `documents_view` (view) | Read-only JOIN of both tables |
| | `documents_v2` (compat view) | INSTEAD OF triggers route writes to split tables |

### `source_documents` columns
`source_uid` (PK), `owner_id`, `source_type`, `source_filesize`, `source_total_characters`, `source_locator`, `doc_title`, `project_id`, `status`, `conversion_job_id`, `error`, `uploaded_at`, `updated_at`

### `conversion_parsing` columns
`conv_uid` (PK), `source_uid` (FK → source_documents), `conv_status`, `conv_parsing_tool`, `conv_representation_type`, `conv_total_blocks`, `conv_block_type_freq`, `conv_total_characters`, `conv_locator`, `created_at`

### `documents_view` definition
```sql
SELECT sd.*, cp.conv_uid, cp.conv_status, cp.conv_parsing_tool,
       cp.conv_representation_type, cp.conv_total_blocks,
       cp.conv_block_type_freq, cp.conv_total_characters, cp.conv_locator
FROM source_documents sd
LEFT JOIN conversion_parsing cp ON cp.source_uid = sd.source_uid
```

---

## 2. Table Renames (v2 suffix removed)

| Before (old name) | After (new name) | Compat View |
|---|---|---|
| `blocks_v2` | **`blocks`** | `blocks_v2` (auto-updatable view) |
| `runs_v2` | **`runs`** | `runs_v2` (auto-updatable view) |
| `block_overlays_v2` | **`block_overlays`** | `block_overlays_v2` (auto-updatable view) |
| `conversion_representations_v2` | **`conversion_representations`** | `conversion_representations_v2` (auto-updatable view) |

### Index Renames

| Before | After |
|---|---|
| `blocks_v2_pkey` | `blocks_pkey` |
| `blocks_v2_conv_uid_idx` | `blocks_conv_uid_idx` |
| `blocks_v2_conv_uid_block_index_key` | `blocks_conv_uid_block_index_key` |
| `runs_v2_pkey` | `runs_pkey` |
| `runs_v2_conv_uid_idx` | `runs_conv_uid_idx` |
| `runs_v2_owner_id_idx` | `runs_owner_id_idx` |
| `runs_v2_status_idx` | `runs_status_idx` |
| `block_overlays_v2_pkey` | `block_overlays_pkey` |
| `block_overlays_v2_run_id_idx` | `block_overlays_run_id_idx` |
| `block_overlays_v2_status_idx` | `block_overlays_status_idx` |
| `block_overlays_v2_run_id_status_idx` | `block_overlays_run_id_status_idx` |
| `conversion_representations_v2_pkey` | `conversion_representations_pkey` |
| `conversion_representations_v2_source_uid_idx` | `conversion_representations_source_uid_idx` |
| `conversion_representations_v2_conv_uid_idx` | `conversion_representations_conv_uid_idx` |
| `conversion_representations_v2_conv_uid_rep_type_key` | `conversion_representations_conv_uid_rep_type_key` |

### FK Constraint Renames

| Before | After |
|---|---|
| `blocks_v2_conv_uid_fkey` | `blocks_conv_uid_fkey` |
| `runs_v2_schema_id_fkey` | `runs_schema_id_fkey` |
| `runs_v2_conv_uid_fkey` | `runs_conv_uid_fkey` |
| `block_overlays_v2_run_id_fkey` | `block_overlays_run_id_fkey` |
| `block_overlays_v2_block_uid_fkey` | `block_overlays_block_uid_fkey` |
| `conversion_representations_v2_source_uid_fkey` | `conversion_representations_source_uid_fkey` |
| `conversion_representations_v2_conv_uid_fkey` | `conversion_representations_conv_uid_fkey` |

### RLS Policy Renames

| Before | After |
|---|---|
| `block_overlays_v2_select_own` | `block_overlays_select_own` |
| `block_overlays_v2_update_own` | `block_overlays_update_own` |
| `runs_v2_select_own` | `runs_select_own` |
| *(none — added post-rename)* | `blocks_select_own` |
| *(none — added post-rename)* | `conversion_representations_select_own` |

### Stored Functions Updated (internal references changed)

All 9 functions were updated to reference the new table names:

| Function | Tables Referenced |
|---|---|
| `create_run_v2` | `runs`, `block_overlays`, `blocks`, `source_documents`, `conversion_parsing` |
| `claim_overlay_batch` | `block_overlays`, `blocks` |
| `delete_document` | `block_overlays`, `runs`, `blocks`, `conversion_representations`, `conversion_parsing`, `source_documents` |
| `delete_run` | `block_overlays`, `runs` |
| `cancel_run` | `block_overlays`, `runs` |
| `delete_schema` | `runs` |
| `update_overlay_staging` | `block_overlays`, `runs` |
| `confirm_overlays` | `runs`, `block_overlays` |
| `reject_overlays_to_pending` | `runs`, `block_overlays` |

---

## 3. Lookup Catalog Tables (replacing CHECK constraints)

8 catalog tables created. String CHECK constraints dropped and replaced with FK constraints.

| Catalog Table | Seeded Values | FK Target Column(s) |
|---|---|---|
| `block_type_catalog` | heading, paragraph, list_item, code_block, table, figure, caption, footnote, divider, html_block, definition, checkbox, reference, key_value_area, form, page_header, other | `blocks.block_type` |
| `run_status_catalog` | pending, processing, completed, failed | `runs.status` |
| `overlay_status_catalog` | pending, claimed, ai_complete, confirmed, failed | `block_overlays.status` |
| `source_type_catalog` | md, pdf, docx, pptx, xlsx, html, xml, csv, txt, rtf, epub, asciidoc, image, jpg, png, tif, bmp, gif, webp, audio, vtt, json | `source_documents.source_type` |
| `document_status_catalog` | uploaded, converting, ingested, conversion_failed, ingest_failed | `source_documents.status` |
| `parsing_tool_catalog` | mdast, docling, pandoc | `conversion_parsing.conv_parsing_tool`, `conversion_representations.parsing_tool` |
| `representation_type_catalog` | markdown_bytes, doclingdocument_json, pandoc_ast_json | `conversion_parsing.conv_representation_type`, `conversion_representations.representation_type` |
| `conv_status_catalog` | success, partial, failed | `conversion_parsing.conv_status` |

Each catalog table has: `value TEXT PRIMARY KEY`, `description TEXT`, `created_at TIMESTAMPTZ`.

---

## 4. Frontend Code Updates (`web/src/lib/tables.ts`)

```typescript
export const TABLES = {
  projects: 'projects',
  documents: 'documents_view',
  sourceDocuments: 'source_documents',
  conversionParsing: 'conversion_parsing',
  blocks: 'blocks',             // was 'blocks_v2'
  schemas: 'schemas',
  runs: 'runs',                 // was 'runs_v2'
  overlays: 'block_overlays',   // was 'block_overlays_v2'
  profiles: 'profiles',
} as const;
```

---

## 5. Edge Function Code Updates

| File | Changes |
|---|---|
| `conversion-complete/index.ts` | `blocks_v2` → `blocks` |
| `runs/index.ts` | `runs_v2` → `runs` |
| `worker/index.ts` | `block_overlays_v2` → `block_overlays`, `runs_v2` → `runs`, `blocks_v2` → `blocks` |
| `_shared/representation.ts` | `conversion_representations_v2` → `conversion_representations` |
| `ingest/process-md.ts` | `blocks_v2` → `blocks` |
| `ingest/validate.ts` | `blocks_v2` → `blocks`, `conversion_representations_v2` → `conversion_representations` |
| `export-jsonl/index.ts` | `runs_v2` → `runs`, `block_overlays_v2` → `block_overlays`, `blocks_v2` → `blocks` |

**Note:** Edge functions are updated locally but NOT yet deployed. Deployed functions use old `_v2` names, routed through compatibility views.

---

## 6. Compatibility Views (for deployed code)

These views allow old code referencing `_v2` names to continue working:

| View | Points To | Type |
|---|---|---|
| `documents_v2` | `source_documents` + `conversion_parsing` | INSTEAD OF triggers (INSERT/UPDATE/DELETE) |
| `blocks_v2` | `blocks` | Auto-updatable (simple SELECT *) |
| `runs_v2` | `runs` | Auto-updatable (simple SELECT *) |
| `block_overlays_v2` | `block_overlays` | Auto-updatable (simple SELECT *) |
| `conversion_representations_v2` | `conversion_representations` | Auto-updatable (simple SELECT *) |

**These views should be dropped after edge functions are deployed with the new table names.**

---

## 7. Migration History (applied in order)

| Migration | Purpose |
|---|---|
| `drop_v1_tables` | Dropped legacy v1 tables (documents, blocks, annotation_runs, block_annotations) |
| `split_documents_v2_into_source_documents_and_conversion_parsing` | Split documents_v2 → source_documents + conversion_parsing |
| `create_documents_view` | Created documents_view JOIN view |
| `add_documents_v2_compat_write_triggers` | INSTEAD OF triggers on documents_v2 compat view |
| `rename_v2_tables_and_update_functions` | Renamed 4 tables, indexes, FKs, CHECKs, policies, 9 functions, 4 compat views |
| `create_lookup_catalogs_replace_string_checks` | 8 catalog tables, 10 FK constraints, dropped 10 CHECK constraints |
| `add_missing_rls_policies_blocks_and_representations` | Added SELECT policies for blocks + conversion_representations |

---

## 8. Complete Table Inventory (current state)

### Core Tables
| Table | Purpose |
|---|---|
| `projects` | User projects |
| `source_documents` | Uploaded file metadata + ownership |
| `conversion_parsing` | Parsing results per source document |
| `blocks` | Individual content blocks extracted from documents |
| `schemas` | User-defined extraction schemas |
| `runs` | Schema extraction runs |
| `block_overlays` | LLM extraction results per block per run |
| `conversion_representations` | Stored representation artifacts |

### Admin / Config Tables
| Table | Purpose |
|---|---|
| `admin_runtime_policy` | 19 policy keys for superuser config |
| `admin_runtime_policy_audit` | Audit trail for policy changes |
| `profiles` | User profiles |
| `user_api_keys` | User API keys + model defaults |
| `user_agent_configs` | User agent configurations |
| `user_provider_connections` | User provider OAuth connections |
| `agent_catalog` | Available agent definitions |

### Lookup Catalogs
| Table | Purpose |
|---|---|
| `block_type_catalog` | Valid block_type values |
| `run_status_catalog` | Valid run status values |
| `overlay_status_catalog` | Valid overlay status values |
| `source_type_catalog` | Valid source_type values |
| `document_status_catalog` | Valid document status values |
| `parsing_tool_catalog` | Valid parsing_tool values |
| `representation_type_catalog` | Valid representation_type values |
| `conv_status_catalog` | Valid conv_status values |

### Views
| View | Purpose |
|---|---|
| `documents_view` | Read-only JOIN of source_documents + conversion_parsing |
| `documents_v2` | Compat view with INSTEAD OF triggers (drop after deploy) |
| `blocks_v2` | Compat view → blocks (drop after deploy) |
| `runs_v2` | Compat view → runs (drop after deploy) |
| `block_overlays_v2` | Compat view → block_overlays (drop after deploy) |
| `conversion_representations_v2` | Compat view → conversion_representations (drop after deploy) |
