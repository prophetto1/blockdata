---
title: Overlays
description: Overlays hold per-block AI output — staged for review, then confirmed for export.
sidebar:
  order: 6
---

An **overlay** is the structured data the AI model produces for a single block. Each overlay row belongs to exactly one run and one block. Overlays follow a staging-to-confirmation lifecycle that ensures nothing reaches the export boundary without human review.

## Two-column staging model

Each overlay row has two JSONB columns:

| Column | Written by | Purpose |
|--------|-----------|---------|
| `overlay_jsonb_staging` | AI worker | Draft output, editable by user |
| `overlay_jsonb_confirmed` | Confirm RPC | Final output, used for export |

The AI worker writes **only** to staging. Users review and edit in the grid. Confirmation copies staging to confirmed and stamps the audit trail.

## Overlay status machine

```
pending → claimed → ai_complete → confirmed
  ↑         ↓           ↓
  └─────────┴───────────┘  (rejected back to pending)

  claimed → failed  (max retries exceeded)
```

| Status | Meaning |
|--------|---------|
| `pending` | Waiting to be claimed by the worker |
| `claimed` | Worker has claimed this block, processing in progress |
| `ai_complete` | Worker wrote staging output, awaiting human review |
| `confirmed` | User confirmed — staging copied to confirmed, ready for export |
| `failed` | Exhausted retry attempts |

## Review actions

In the block viewer grid, users can:

- **Edit** — Modify staged field values inline (only when status is `ai_complete`)
- **Confirm** — Accept the staged output → copies to confirmed, stamps `confirmed_at` and `confirmed_by`
- **Reject** — Send back to `pending` for re-processing by the AI worker
- **Confirm All** — Bulk-confirm all `ai_complete` overlays in the current run

## Confirmation RPCs

Confirmation is atomic (copy + audit + validation in one transaction) and authorized (owner confirms their own run's overlays only):

- `confirm_overlays(overlay_ids[])` — Confirm specific blocks
- `reject_overlays_to_pending(overlay_ids[])` — Reset to pending for reprocessing

## Audit trail

| Field | Description |
|-------|-------------|
| `confirmed_at` | Timestamp of confirmation |
| `confirmed_by` | UUID of the user who confirmed |
| `claimed_by` | Worker instance that processed this block |
| `claimed_at` | When the worker claimed it |
| `attempt_count` | Number of processing attempts |
| `last_error` | Error message from the most recent failure |

## Export behavior

By default, `export-jsonl` exports **confirmed** overlays only. Blocks without confirmed overlays are exported with empty `user_defined.data`. This ensures downstream consumers never receive half-finished values.

## Data model

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `run_id` | UUID | FK to `runs_v2` |
| `block_uid` | text | FK to `blocks_v2` |
| `status` | text | `pending`, `claimed`, `ai_complete`, `confirmed`, `failed` |
| `overlay_jsonb_staging` | jsonb | AI-produced draft output |
| `overlay_jsonb_confirmed` | jsonb | User-confirmed final output |
| `pack_index` | integer | Batch assignment for the worker (nullable) |
| `confirmed_at` | timestamptz | When confirmed |
| `confirmed_by` | UUID | Who confirmed |
| `claimed_by` | text | Worker instance ID |
| `claimed_at` | timestamptz | When claimed |
| `attempt_count` | integer | Processing attempts |
| `last_error` | text | Most recent error |
