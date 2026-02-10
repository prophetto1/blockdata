---
title: Processing
description: How to apply schemas to documents, dispatch to the AI worker, and monitor progress.
sidebar:
  order: 3
---

## Applying a schema

### Single document

From the Document Detail page, create a run by selecting a schema. This generates one pending overlay per block.

### Project-wide

From the Project Detail page:

1. Select a schema from the **Schema Scope Selector**
2. Click **Apply Schema to All** — creates runs for every ingested document that doesn't already have a run for this schema

## Dispatching to the worker

After creating runs, blocks are in `pending` status. To start processing:

1. Click **Run All Pending** on the Project Detail page
2. The platform dispatches blocks to the AI worker Edge Function in batches

### What the worker does

For each batch:

1. **Claim** — The worker claims a pack of blocks using `FOR UPDATE SKIP LOCKED` (prevents double-processing)
2. **Process** — Sends the pack to the AI model as a JSON array with the schema's instructions
3. **Write** — Stores structured output in `overlay_jsonb_staging` for each block
4. **Rollup** — Updates the run's `completed_blocks` / `failed_blocks` counts

### Batched processing

The worker processes multiple blocks per API call using pre-computed **packs**. Pack size is calculated at run creation based on:

- Model context window and max output tokens
- System prompt size
- Average block content length
- Schema field count and types

A 500-block document with 20-block packs = **25 API calls** instead of 500. See [Worker Protocol](/docs/architecture/worker-protocol/) for the full specification.

## Monitoring progress

### Overlay summary bar

The Project Detail page shows a progress bar broken down by status:

| Color | Status | Meaning |
|-------|--------|---------|
| Green | Confirmed | Human-reviewed and approved |
| Yellow | Staged (ai_complete) | AI output waiting for review |
| Blue | Pending | Not yet processed |
| Red | Failed | Exhausted retry attempts |

### Per-document progress

The document list shows document status badges. The runs panel shows `completed_blocks / total_blocks` per run.

### Real-time updates

The block viewer grid updates in real time via Supabase Realtime. As the worker completes blocks, rows transition from pending to ai_complete and overlay fields fill in.

## Error handling

- **Retries** — Failed blocks are retried up to `WORKER_MAX_RETRIES` (default 3) times
- **Partial failure** — If an API call returns results for some blocks but not others, successful ones are written and missing ones return to `pending`
- **Total failure** — If the API call fails entirely, all blocks in the pack return to `pending`
- **Max retries exceeded** — Block status becomes `failed` with `last_error` populated

## Model fallback chain

The AI model is selected in this order:

1. Schema `prompt_config.model`
2. Run-level `model_config.model`
3. User defaults (Settings page)
4. Environment default
