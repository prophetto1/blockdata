---
title: arango-cloud
description: Current ArangoDB Cloud connection details, sync behavior, and verification notes for the BlockData workspace.
---

# ArangoDB Cloud

This workspace now uses ArangoDB Cloud, not a local Docker container.

## Current Cluster

- Endpoint: `https://b5ce5c7f0236.arangodb.cloud:8529`
- Verified version: `3.12.7-2 Enterprise`
- Database: `_system`
- Username: `root`
- Auth: Basic auth
- Replication factor: `3`
- Sharding: `single`
- User collections: none yet beyond the system collections

## App Config

Use these values for BlockData Arango sync:

```env
ARANGO_SYNC_ENABLED=true
ARANGO_URL=https://b5ce5c7f0236.arangodb.cloud:8529
ARANGO_DATABASE=_system
ARANGO_USERNAME=root
ARANGO_PASSWORD=<stored-locally>
ARANGO_DOCUMENTS_COLLECTION=blockdata_documents
ARANGO_BLOCKS_COLLECTION=blockdata_blocks
ARANGO_DOCLING_DOCUMENTS_COLLECTION=blockdata_docling_documents
ARANGO_RUNS_COLLECTION=blockdata_runs
ARANGO_OVERLAYS_COLLECTION=blockdata_overlays
```

## Secret Handling

The live password is intentionally not stored in this docs page or committed to the repo.

Retrieve it from the local secret source you already use for Supabase Edge Function deployment.

Do not add the password value to docs, examples, or committed `.env` files.

## Sync Behavior

The Arango integration is wired up in [`supabase/functions/_shared/arangodb.ts`](/e:/writing-system/supabase/functions/_shared/arangodb.ts) and is used by ingest, conversion-complete, runs, worker, manage-overlays, manage-document, and trigger-parse.

### Self-contained Docling projection (five collections)

When `ARANGO_SYNC_ENABLED=true`, Arango maintains a self-contained projection of parsed documents:

| Collection | Key | Contents |
|---|---|---|
| `blockdata_documents` | `source_uid` | Document metadata and lifecycle status |
| `blockdata_docling_documents` | `conv_uid` | Full `doclingdocument_json` payload |
| `blockdata_blocks` | `source_uid:block_index` | Normalized block rows |
| `blockdata_runs` | `run_id` | Extraction run metadata |
| `blockdata_overlays` | `overlay_uid` | Per-block overlay state (staging, confirmed) |

All collections are created automatically on first sync. Manual pre-creation is not required.

- The original uploaded file stays in Supabase Storage. Arango stores the full Docling JSON, not the raw binary.
- `overlay_uid` is a first-class UUID in both Postgres and Arango.
- Every run and overlay record carries ancestry fields (`source_uid`, `conv_uid`, `project_id`) for cross-collection joins.

### Lifecycle sync points

- **Upload:** `ingest` syncs document metadata to `blockdata_documents` with `status: "uploaded"`.
- **Conversion start:** `ingest` updates document status to `"converting"`.
- **Parse success:** `conversion-complete` syncs document metadata, full Docling JSON, and block rows.
- **Run creation:** `runs` syncs run row and initial overlay rows to Arango.
- **Worker processing:** `worker` batch-syncs all touched overlay rows once after all mutations (non-fatal).
- **Review actions:** `manage-overlays` syncs affected overlays after confirm/reject/staging updates.
- **Re-parse:** `trigger-parse` clears stale Arango projection before new conversion starts.
- **Delete:** `manage-document` removes all five collection records for the `source_uid`.
- **Reset:** `manage-document` removes derived data (docling, blocks, runs, overlays) and patches the document row back to upload-stage shape.

### Partial failure recovery

If Arango cleanup fails after a successful Postgres delete/reset, the `manage-document` edge function writes a row to `cleanup_outbox` and returns HTTP 207. A separate reconciliation sweep (not yet implemented) will retry pending outbox entries.

The `trigger-parse` re-parse path also writes an outbox row on Arango cleanup failure.

## Verification

```powershell
$pair = "root:<password>"
$auth = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
Invoke-WebRequest -UseBasicParsing `
  -Uri "https://b5ce5c7f0236.arangodb.cloud:8529/_db/_system/_api/version" `
  -Headers @{ Authorization = $auth }
```

Expected result:

- HTTP `200`
- ArangoDB version reported as `3.12.7-2`
- Basic auth succeeds against the `_system` database

## Local Development Note

There is no longer a supported local `arangodb` container workflow for this workspace. If an old local container still exists, remove it so the machine state matches the docs.

## Case.law Import

There is also an importer for CAP-style extracted case JSON trees. It uses the same Arango env vars and targets the current cloud cluster.

Expected layout:

```text
<root>/
  us/
    134/
      VolumeMetadata.json
      CasesMetadata.json
      cases/
        1000-01.json
  s-ct/
    134/
      VolumeMetadata.json
      CasesMetadata.json
      cases/
        1000-01.json
```

Run it with:

```powershell
node scripts/import-case-law-to-arango.mjs `
  --root F:\case-law `
  --reporters us,s-ct,f,f2d,f3d,f-supp,f-supp-2d,f-supp-3d
```

Dry-run first:

```powershell
node scripts/import-case-law-to-arango.mjs `
  --root F:\case-law `
  --reporters us,s-ct `
  --dry-run
```

Default collections:

- `case_law_volumes`
- `case_law_cases`
- `case_law_opinions`
