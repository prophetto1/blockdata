---
title: Exporting
description: How to export confirmed results as JSONL, project-wide ZIP archives, and other formats.
sidebar:
  order: 5
---

## Export options

### Single-run JSONL

From the Document Detail or Run Detail page, click **Export JSONL**. This downloads a JSONL file containing all blocks for that run, ordered by `block_index`.

- Confirmed overlays include full `user_defined.data`
- Blocks without confirmed overlays have `"data": {}`

### Project-wide ZIP

From the Project Detail page:

1. Select a schema from the Schema Scope Selector
2. Click **Export All (ZIP)**
3. The platform finds the latest run per document for that schema
4. Each document's JSONL is bundled into a ZIP archive

Filename pattern: `project-{projectId}-{schemaLabel}-exports.zip`

## What's in the export

Each line of the JSONL file is one block record with the [canonical two-key shape](/docs/concepts/export/):

```json
{
  "immutable": {
    "source_upload": { ... },
    "conversion": { ... },
    "block": { "block_uid": "...", "block_type": "paragraph", "block_content": "..." }
  },
  "user_defined": {
    "schema_ref": "my_schema_v1",
    "schema_uid": "a3f8...",
    "data": { "summary": "...", "category": "analysis" }
  }
}
```

## Export scope

| What | Exported |
|------|---------|
| Confirmed overlays | Full `user_defined.data` with schema ref and UID |
| Pending / staged blocks | `"data": {}` (empty) |
| Failed blocks | `"data": {}` (empty) |
| Immutable fields | Always complete for every block |

## Downstream use

See [Integrations](/docs/integrations/) for detailed guides on consuming JSONL exports in:

- Fine-tuning datasets
- Knowledge graphs (Neo4j)
- Analytical pipelines (DuckDB, Parquet)
- Vector embedding pipelines
- Webhook-triggered ETL
