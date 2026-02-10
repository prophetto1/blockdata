---
title: Runs
description: A run binds a schema to a document's blocks for one execution — creating pending overlays that the AI worker processes.
sidebar:
  order: 5
---

A **run** is a single execution of a schema against a document's blocks. When you apply a schema to a document, the platform creates a run, which generates one pending overlay row per block. The AI worker then processes those blocks according to the schema's instructions.

## Creating a run

Runs are created via:

- **Project Detail** → Select schema → "Apply Schema to All" (bulk — creates runs for all ingested documents)
- **Individual document** → Create run with a specific schema

The `create_run_v2` RPC:
1. Creates a `runs_v2` row with status `running` and `total_blocks` from the block count
2. Creates one `block_overlays_v2` row per block with status `pending`
3. Returns the `run_id`

## Run status machine

```
running → complete   (no more pending/claimed blocks)
        → cancelled  (user cancels)
        → failed     (all blocks fail)
```

| Status | Meaning |
|--------|---------|
| `running` | Blocks are being processed or waiting to be processed |
| `complete` | All blocks have reached a terminal state (confirmed or failed) |
| `cancelled` | User manually cancelled the run |
| `failed` | All blocks exhausted retries |

## Run progress tracking

Each run tracks aggregate progress:

| Field | Description |
|-------|-------------|
| `total_blocks` | Total blocks in the document |
| `completed_blocks` | Blocks that reached `ai_complete` or `confirmed` |
| `failed_blocks` | Blocks that exhausted retries |
| `status` | Current run status |

## Multi-schema runs

A document can have multiple runs with different schemas. Each run produces independent overlays — they don't interfere with each other. In the block viewer, a **run selector** dropdown switches which schema's overlay columns are displayed.

You can also run the same schema multiple times (e.g., with different model configurations) to compare results.

## Model configuration

The AI model used for a run follows a fallback chain:

1. Schema's `prompt_config.model` (if specified)
2. Run-level `model_config.model` (if provided at creation)
3. User defaults from Settings page
4. Environment default (`claude-sonnet-4-5-20250929`)

## Data model

| Field | Type | Description |
|-------|------|-------------|
| `run_id` | UUID | Primary key |
| `conv_uid` | text | FK — which document's blocks to process |
| `schema_id` | UUID | FK — which schema to apply |
| `owner_id` | UUID | FK to `auth.users` |
| `status` | text | `running`, `complete`, `cancelled`, `failed` |
| `total_blocks` | integer | Block count at creation |
| `completed_blocks` | integer | Blocks successfully processed |
| `failed_blocks` | integer | Blocks that exhausted retries |
| `model_config` | jsonb | Optional model/parameter overrides |
| `created_at` | timestamptz | Creation timestamp |
