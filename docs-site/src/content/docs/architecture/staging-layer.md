---
title: Staging Layer
description: The two-column staging model — how AI output flows through review to confirmed export.
sidebar:
  order: 4
---

## Problem

Users should not blindly accept AI-filled schema fields. The staging layer provides an explicit Postgres-level contract separating draft values from confirmed values.

## Two-column model (Option A)

Each overlay row has two JSONB columns:

| Column | Written by | Read by |
|--------|-----------|---------|
| `overlay_jsonb_staging` | AI worker | Grid (for review/editing) |
| `overlay_jsonb_confirmed` | Confirm RPC | Export, integrations |

Plus audit fields:
- `confirmed_at` — When confirmed
- `confirmed_by` — Who confirmed

## Write rules

1. **Worker** writes only `overlay_jsonb_staging` and status fields
2. **User** can edit `overlay_jsonb_staging` via the grid (only when `ai_complete`)
3. **Confirm** copies staging → confirmed atomically (via RPC)
4. **Export** reads confirmed only by default

## Confirmation RPCs

All confirmation is atomic (copy + audit + validation in one transaction) and authorized (owner confirms own run overlays only):

| Operation | RPC |
|-----------|-----|
| Confirm specific blocks | `confirm_overlays(overlay_ids[])` |
| Reject blocks to pending | `reject_overlays_to_pending(overlay_ids[])` |
| Edit staged values | `update_overlay_staging(overlay_id, data)` |

## Export contract

| Mode | Source | Use case |
|------|--------|----------|
| **Confirmed only** (default) | `overlay_jsonb_confirmed` | Production export, integrations |
| **Staging** (explicit) | `overlay_jsonb_staging` | Debugging, preview |
| **Both** | Both columns | Comparison, audit |

This ensures downstream consumers (Neo4j, webhooks, analytical pipelines) never ingest half-finished values unless explicitly opted in.

## Editing track fit

The staging layer also supports content revision workflows:

- `blocks_v2.block_content` stays **immutable** — never modified
- "Edited content" is an overlay field (e.g., `revised_content`) that follows staging → confirm
- Reconstruction uses confirmed `revised_content` where present, falling back to original `block_content`

## RLS hardening

- `authenticated` UPDATE on `block_overlays_v2` is restricted to `overlay_jsonb_staging` only
- `anon` has no UPDATE access
- Phase 6 RPCs (`confirm_overlays`, `reject_overlays_to_pending`) execute only for `authenticated` and `service_role`
