---
title: "Frontend Task Inventory — Kestra Flow UI Replication"
description: "Organized task list for replicating Kestra's flow UI in BlockData's React frontend."
---# Frontend Task Inventory — Kestra Flow UI Replication

Organized task list for replicating Kestra's flow UI in BlockData's React frontend.

## Task Files

| File | Area | Tasks | Status |
|---|---|---|---|
| [flow-pages.md](flow-pages.md) | Flow list, detail, and tab pages | 14 | Mixed |
| [editor-subviews.md](editor-subviews.md) | Flow editor sub-views inside FlowWorkbench | 7 | Mostly stubs |
| [global-pages.md](global-pages.md) | Cross-flow operational pages | 9 | Mostly missing |
| [frontend-conventions.md](frontend-conventions.md) | Established patterns all new pages must follow | — | Reference |

## Priority Order

1. Frontend — replicate Kestra's UI as closely as possible
2. SQL — use Kestra's schemas nearly verbatim
3. Wire frontend to SQL
4. Then in parallel: Java handlers to Python handlers + Arango layer

## Guiding Principle

Do not drift from Kestra's battle-tested code. Replicate closely. Only deviate where BlockData's requirements demand it.
