---
title: Data Model
description: Database tables, relationships, RPCs, RLS policies, and deterministic identity rules.
sidebar:
  order: 3
---

## Tables

The v2 schema uses four primary tables plus a projects table:

### `projects`

| Column | Type | Description |
|--------|------|-------------|
| `project_id` | UUID PK | |
| `owner_id` | UUID FK (auth.users) | Row-level ownership |
| `project_name` | text | |
| `description` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-trigger |

### `documents_v2`

| Column | Type | Description |
|--------|------|-------------|
| `source_uid` | text PK | `sha256(source_type + "\n" + raw_bytes)` |
| `project_id` | UUID FK (projects) | |
| `owner_id` | UUID FK (auth.users) | |
| `source_type` | text | File format enum |
| `source_filesize` | integer | Bytes |
| `source_total_characters` | integer | Null for binary |
| `conv_uid` | text | `sha256(tool + "\n" + repr_type + "\n" + repr_bytes)` |
| `conv_status` | text | uploaded, converting, ingested, etc. |
| `conv_parsing_tool` | text | mdast, docling |
| `conv_representation_type` | text | markdown_bytes, doclingdocument_json |
| `conv_total_blocks` | integer | |
| `conv_block_type_freq` | jsonb | `{ "paragraph": 255, ... }` |
| `conv_total_characters` | integer | |

### `blocks_v2`

| Column | Type | Description |
|--------|------|-------------|
| `block_uid` | text PK | `conv_uid + ":" + block_index` |
| `conv_uid` | text FK | Links to document |
| `block_index` | integer | 0-based reading order |
| `block_type` | text | Platform enum |
| `block_locator` | jsonb | Typed provenance pointer |
| `block_content` | text | Original text |

### `schemas`

| Column | Type | Description |
|--------|------|-------------|
| `schema_id` | UUID PK | |
| `owner_id` | UUID FK (auth.users) | |
| `schema_ref` | text | User-facing slug |
| `schema_uid` | text | Content hash |
| `schema_jsonb` | jsonb | Full schema artifact |
| `created_at` | timestamptz | |

### `runs_v2`

| Column | Type | Description |
|--------|------|-------------|
| `run_id` | UUID PK | |
| `conv_uid` | text FK | Which document |
| `schema_id` | UUID FK (schemas) | Which schema |
| `owner_id` | UUID FK (auth.users) | |
| `status` | text | running, complete, cancelled, failed |
| `total_blocks` | integer | |
| `completed_blocks` | integer | |
| `failed_blocks` | integer | |
| `model_config` | jsonb | Optional model overrides |
| `created_at` | timestamptz | |

### `block_overlays_v2`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `run_id` | UUID FK (runs_v2) | |
| `block_uid` | text FK (blocks_v2) | |
| `status` | text | pending, claimed, ai_complete, confirmed, failed |
| `overlay_jsonb_staging` | jsonb | AI-produced draft |
| `overlay_jsonb_confirmed` | jsonb | User-confirmed final |
| `pack_index` | integer | Batch assignment (nullable) |
| `confirmed_at` | timestamptz | |
| `confirmed_by` | UUID | |
| `claimed_by` | text | Worker instance ID |
| `claimed_at` | timestamptz | |
| `attempt_count` | integer | |
| `last_error` | text | |

## Key RPCs

| RPC | Purpose |
|-----|---------|
| `create_run_v2(conv_uid, schema_id)` | Creates run + pending overlay per block |
| `claim_overlay_batch(run_id, batch_size)` | Claims pending blocks (FOR UPDATE SKIP LOCKED) |
| `claim_overlay_pack(run_id, worker_id)` | Claims all blocks in next unclaimed pack |
| `confirm_overlays(overlay_ids[])` | Copies staging → confirmed, stamps audit |
| `reject_overlays_to_pending(overlay_ids[])` | Resets to pending for reprocessing |
| `update_overlay_staging(overlay_id, data)` | User edits staged values |

## RLS policies

All tables use Row-Level Security with `owner_id = auth.uid()`:

- Users can only read/write their own projects, documents, schemas, runs, and overlays
- `service_role` bypasses RLS (used by Edge Functions)
- `anon` has no write access to Phase 2 tables
- `authenticated` UPDATE on `block_overlays_v2` is limited to `overlay_jsonb_staging` only

## Realtime

`block_overlays_v2` and `documents_v2` are in the Supabase Realtime publication. The frontend subscribes to overlay changes for live grid updates during worker processing.

## Deterministic identity rules

See [Immutable Fields](/docs/reference/immutable-fields/) for the full formula definitions. The key invariants:

- `source_uid` = hash of source type + raw bytes
- `conv_uid` = hash of tool + representation type + representation bytes
- `block_uid` = `conv_uid` + ":" + `block_index`
- `schema_uid` = hash of canonicalized schema JSON
