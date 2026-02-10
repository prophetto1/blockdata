---
title: Overlay Status
description: Status values and state transitions for overlay blocks, runs, and documents.
sidebar:
  order: 5
---

## Block overlay status

```
pending → claimed → ai_complete → confirmed
  ↑         ↓           ↓
  └─────────┴───────────┘  (rejected back to pending)

  claimed → failed  (max retries exceeded)
```

| Status | Set by | Meaning |
|--------|--------|---------|
| `pending` | Run creation / rejection | Waiting for the worker to claim |
| `claimed` | Worker (via `claim_overlay_batch` RPC) | Worker is processing this block |
| `ai_complete` | Worker (after successful API call) | Staging output written, awaiting human review |
| `confirmed` | User (via `confirm_overlays` RPC) | Staging copied to confirmed, ready for export |
| `failed` | Worker (after max retries) | Processing failed, `last_error` populated |

### Transitions

| From | To | Triggered by |
|------|----|-------------|
| `pending` | `claimed` | Worker claims a pack |
| `claimed` | `ai_complete` | Worker writes staging output |
| `claimed` | `pending` | API call fails (retry) |
| `claimed` | `failed` | Max retries exceeded |
| `ai_complete` | `confirmed` | User confirms |
| `ai_complete` | `pending` | User rejects |

## Run status

```
running → complete
        → cancelled
        → failed
```

| Status | Meaning |
|--------|---------|
| `running` | Has pending or claimed blocks |
| `complete` | No more pending/claimed blocks |
| `cancelled` | User cancelled |
| `failed` | All blocks failed |

## Document status

```
uploaded → converting → ingested
                     → conversion_failed
         → ingest_failed
```

| Status | Meaning |
|--------|---------|
| `uploaded` | File stored, conversion not started |
| `converting` | Conversion service processing |
| `ingested` | Blocks extracted successfully |
| `conversion_failed` | Conversion service error |
| `ingest_failed` | Block extraction error |
