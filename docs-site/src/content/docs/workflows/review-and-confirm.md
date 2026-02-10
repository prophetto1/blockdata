---
title: Review and Confirm
description: How to inspect AI output in the block viewer grid, edit staged values, and confirm or reject overlays.
sidebar:
  order: 4
---

## The block viewer grid

The Document Detail page displays blocks in an AG Grid table with two column regions:

### Left columns (immutable, always visible)

| Column | Content |
|--------|---------|
| `#` | Block index |
| `Type` | Block type with color badge |
| `Content` | Block content (word-wrapped) |
| `Block UID` | Unique block identifier |

### Right columns (dynamic, schema-dependent)

When a run is selected, the grid adds:

| Column | Content |
|--------|---------|
| `Status` | Overlay status badge (pending, claimed, ai_complete, confirmed, failed) |
| `Review Actions` | Confirm / Reject buttons (visible for `ai_complete` blocks) |
| *Schema fields* | One column per schema property — dynamically generated from the schema's `properties` |

## Reviewing staged output

After the worker processes blocks, they appear with status `ai_complete` and the staged values populated in the schema columns.

### Inline editing

Click any schema field cell on an `ai_complete` row to edit the value. Changes are saved to `overlay_jsonb_staging` via the `update_overlay_staging` RPC. You can correct AI output before confirming.

### Confirming blocks

- **Single block** — Click the **Confirm** button on the row. Copies `overlay_jsonb_staging` → `overlay_jsonb_confirmed`, sets status to `confirmed`, stamps `confirmed_at` and `confirmed_by`.
- **Bulk confirm** — Click **Confirm All Staged** to confirm every `ai_complete` block in the current run.
- **Project-wide** — From Project Detail, **Confirm All** confirms all staged overlays across all documents for the selected schema.

### Rejecting blocks

Click **Reject** to send a block back to `pending` status. The worker will reprocess it on the next dispatch.

## Grid controls

The toolbar above the grid provides:

| Control | Purpose |
|---------|---------|
| **Run selector** | Switch which schema run's overlays are displayed |
| **Type filter** | Multi-select filter by block type (paragraph, heading, table, etc.) |
| **Density toggle** | Compact / comfortable row height |
| **Column visibility** | Show/hide specific columns |
| **Page size** | 25 / 50 / 100 rows per page |
| **Block count** | Shows total blocks with confirmed/staged breakdown |

## Real-time updates

The grid subscribes to Supabase Realtime. As the worker processes blocks:

- Rows transition from `pending` → `claimed` → `ai_complete`
- Schema field values appear as they're written to staging
- Progress counts update live

## Best practices

- **Start with a small document** to validate your schema design before bulk processing
- **Use type filters** to focus review on specific block types (e.g., review all headings, then all paragraphs)
- **Edit before confirming** — once confirmed, changes require a re-run
- **Reject sparingly** — rejected blocks consume additional API calls when reprocessed
