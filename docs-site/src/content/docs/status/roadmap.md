---
title: Roadmap
description: The 9-phase production roadmap — from database foundations through infrastructure polish.
sidebar:
  order: 1
---

## Phase overview

### Phase 1 — Database & Architecture Foundations
Schema changes: staging columns, status enum expansion, prompt_config convention, project_id NOT NULL, migration drift reconciliation. **Complete.**

### Phase 2 — AI Worker (Distributed Claim-Based)
Stateless, re-entrant worker Edge Function. Atomic claim-based concurrency (`FOR UPDATE SKIP LOCKED`). LLM integration via Anthropic Messages API. Run rollups, error handling, multi-provider support. Batched pack protocol. **Code-complete, pending API key activation.**

### Phase 3 — Frontend Cleanup
Split Upload.tsx, remove dead pages, add old-route redirects, breadcrumbs, route-entity membership validation. Deletion/lifecycle operations for documents, runs, schemas, projects. **Complete.**

### Phase 4 — Grid Layout & Toolbar
Layout compression (merge 4 header sections into 44px bar). Grid fills viewport. Unified Apply Schema control. Density toggle (compact/comfortable). Column visibility menu. Block type filter. **Complete.**

### Phase 5 — Multi-File Upload
Dropzone integration (max 10 files). Parallel ingest calls. Per-file status display. Realtime document status on Project Detail. **Complete.**

### Phase 5B — Project-Level Bulk Operations
"Apply Schema to All Documents." "Run All Pending" with concurrent dispatch. "Confirm All" project-wide. "Export All (ZIP)" with per-document JSONL. Project-level progress dashboard (overlay summary bar). **Complete.**

### Phase 6 — Review & Confirm UX (Staging Layer)
Grid staging indicators. Inline editing of staged overlays. Per-block and bulk confirm/reject. Export respects confirmation status. RLS and RPC hardening. **Complete.**

### Phase 7 — Export & Reconstruction
Enhanced export options (CSV, Parquet). Document reconstruction via mdast track using confirmed `revised_content` fields. Reconstruct Edge Function assembles revised text ordered by `block_index`. **Pending.**

### Phase 8 — Third-Party Integrations
Neo4j graph construction from graph-aware schemas. Webhook POST on run completion. DuckDB/Parquet analytical export. **Pending.**

### Phase 9 — Infrastructure & Polish
GCP conversion service fix. Code-splitting. Testing (Vitest + RTL). Error boundaries. CI/CD pipeline. Auth lifecycle (email confirmation, forgot password, OAuth). Security hardening. Accessibility. **Pending.**

## Dependency graph

```
Phase 1 (DB foundations)
  → Phase 2 (Worker) — needs staging columns + RPCs
    → Phase 5B (Bulk ops) — needs working worker
      → Phase 6 (Review UX) — needs staging data to review
        → Phase 7 (Export) — needs confirmed overlays
        → Phase 8 (Integrations) — needs export pipeline

Phase 3 (Frontend) — parallel with Phase 2
Phase 4 (Grid) — parallel with Phase 2
Phase 5 (Upload) — parallel with Phase 2

Phase 9 (Polish) — after core pipeline stable
```

## Critical path

Phase 1 → 2 → 5B → 6 → 7/8 is the critical path. Phases 3, 4, 5 can proceed in parallel with Phase 2.
