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
```

## Secret Handling

The live password is intentionally not stored in this docs page or committed to the repo.

Retrieve it from the local secret source you already use for Supabase Edge Function deployment.

Do not add the password value to docs, examples, or committed `.env` files.

## Sync Behavior

The Arango integration is wired up in [`supabase/functions/_shared/arangodb.ts`](/e:/writing-system/supabase/functions/_shared/arangodb.ts) and is used by the ingest and conversion-complete paths.

When `ARANGO_SYNC_ENABLED=true` and an ingest or conversion-complete flow runs:

1. BlockData upserts one document into `blockdata_documents`.
2. BlockData clears older block rows for that source document.
3. BlockData writes fresh block rows into `blockdata_blocks`.

The `blockdata_documents` and `blockdata_blocks` collections are created automatically on first sync by the repo's `ensureCollection` calls. Manual pre-creation is not required.

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
