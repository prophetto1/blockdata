---
title: arango-local-dev
description: Local ArangoDB container details, environment variables, and verification commands for the BlockData workspace.
---

# Local ArangoDB Setup

This page records the current local ArangoDB container setup for the `E:\writing-system` workspace.

## Current Local Instance

- Container name: `arangodb`
- Docker image: `arangodb:latest`
- Verified version: `3.12.8`
- Port mapping: `8529:8529`
- Base URL: `http://127.0.0.1:8529`
- Database: `blockdata`
- Username: `root`
- Persistent Docker volume: `arangodb-data`

## App Config

Use these values for local BlockData Arango sync:

```env
ARANGO_SYNC_ENABLED=true
ARANGO_URL=http://127.0.0.1:8529
ARANGO_DATABASE=blockdata
ARANGO_USERNAME=root
ARANGO_PASSWORD=<retrieve-locally>
ARANGO_DOCUMENTS_COLLECTION=blockdata_documents
ARANGO_BLOCKS_COLLECTION=blockdata_blocks
```

## Secret Handling

The live root password is intentionally not stored in this docs page.

Retrieve the current password from the running container with:

```powershell
docker inspect arangodb --format "{{range .Config.Env}}{{println .}}{{end}}" `
  | Select-String '^ARANGO_ROOT_PASSWORD=' `
  | ForEach-Object { $_.ToString().Split('=', 2)[1] }
```

If the container is recreated, the password may change unless you explicitly provide one during `docker run`.

## Useful Commands

Check container status:

```powershell
docker ps --filter "name=arangodb"
```

Start the container:

```powershell
docker start arangodb
```

Stop the container:

```powershell
docker stop arangodb
```

Read logs:

```powershell
docker logs arangodb
```

Verify the API is up:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8529/_api/version"
```

Create the local database if needed:

```powershell
$pw = docker inspect arangodb --format "{{range .Config.Env}}{{println .}}{{end}}" `
  | Select-String '^ARANGO_ROOT_PASSWORD=' `
  | ForEach-Object { $_.ToString().Split('=', 2)[1] }
$auth = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("root:$pw"))
Invoke-WebRequest -UseBasicParsing -Method Post `
  -Uri "http://127.0.0.1:8529/_api/database" `
  -Headers @{ Authorization = $auth; "Content-Type" = "application/json" } `
  -Body '{"name":"blockdata"}'
```

## Expected Collections

The current BlockData-side Arango integration is designed around:

- `blockdata_documents`
- `blockdata_blocks`

Recommended record shape:

- `documents`: one record per `source_uid`
- `blocks`: one record per `source_uid:block_index`
- both include `project_id`
- blocks also include `conv_uid`, `block_uid`, `block_type`, `block_content`, and `block_locator`

## Integration Notes

The current repo-side sync is intended to run from the parse completion path and mirror parsed documents plus blocks into Arango as a secondary store.

The intended behavior is:

1. Upsert one document record for the parsed source document.
2. Delete prior Arango block rows for that source document.
3. Upsert fresh block rows for the current parse output.

This keeps project-linked document and block data queryable in Arango without changing Supabase's role as the primary system of record.

## Case.law Import

There is also a local importer for CAP-style extracted case JSON trees.

Expected local layout:

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
