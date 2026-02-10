---
title: Uploading Documents
description: How to add files to a project and track the conversion pipeline.
sidebar:
  order: 1
---

## Before you start

You need a project. Navigate to **Projects** (`/app`) and create one if you haven't already.

## Uploading files

1. Open your project and click **Upload Document**
2. Drag and drop files (or click to browse) — up to 10 files per batch
3. Click **Upload selected**

### Supported formats

| Format | Extension | Notes |
|--------|-----------|-------|
| Markdown | `.md` | Parsed inline via mdast — fastest path |
| Word | `.docx` | Sent to Docling conversion service |
| PDF | `.pdf` | Sent to Docling conversion service |
| Plain text | `.txt` | Treated as markdown |

## What happens after upload

Each file goes through the ingest pipeline independently:

1. **Ingest** — File is hashed to compute `source_uid`, uploaded to storage, and a document row is created
2. **Conversion** — Markdown files are processed immediately; DOCX/PDF are sent to the Cloud Run conversion service
3. **Block extraction** — The parsed representation is decomposed into typed blocks

### Status tracking

Watch the document list on the Project Detail page for status updates:

| Status | What it means |
|--------|--------------|
| `uploaded` | File received, conversion starting |
| `converting` | Conversion service is processing |
| `ingested` | Blocks extracted — ready for schema application |
| `conversion_failed` | Something went wrong in conversion |

## Deterministic deduplication

Uploading the same file twice produces the same `source_uid` (it's a SHA-256 hash of the file type + content). The platform uses this for deduplication.

## Next step

Once your documents show status `ingested`, you can [create a schema](/docs/workflows/creating-schemas/) and apply it.
