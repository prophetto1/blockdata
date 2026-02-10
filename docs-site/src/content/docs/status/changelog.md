---
title: Changelog
description: Completed milestones and verified platform changes.
sidebar:
  order: 2
---

## 2026-02-10

### AI Settings & Frontend
- AI Settings page implemented (API key management, model defaults, temperature, max tokens)
- Marketing pages cleaned up
- Migrations 012-016 applied (overlay permissions hardening, anon RPC revoke)
- Frontend build unblocked (removed missing Settings route import)

### Phase 6 — Review & Confirm Hardening
- Migration 015: Overlay permissions — authenticated UPDATE restricted to `overlay_jsonb_staging`
- Migration 016: Revoke anon execute on Phase 6 RPCs
- Privilege audit verified: anon has no UPDATE, Phase 6 RPCs limited to authenticated/service_role

## 2026-02-09

### Unified Remaining Work
- Comprehensive 9-phase roadmap document created
- Projects hierarchy plan and assessment completed
- Staging vs confirmed overlay design specified (Option A selected)
- Downstream integration pipelines documented

### Grid Improvements
- All immutable + overlay columns visible
- 2-level density toggle (compact/comfortable)

## 2026-02-08

### v2 Database Migration Complete
All 9 migration steps completed:
1. v2 contract locked (immutable fields, block types, pairing rules)
2. Repo migrations synced with live DB
3. `runs_v2` + `block_overlays_v2` tables created
4. `create_run_v2` RPC implemented
5. RLS policies for Phase 2 tables
6. pg_cron extended to v2 documents
7. All 5 Edge Functions cut over to v2 reads/writes
8. 4 smoke tests updated to v2
9. Final cutover — v1 tables frozen with reject-write triggers

### Docling Track
- Implementation complete for non-MD document support
- `supabase/functions/_shared/docling.ts` utility created
- Deterministic JSON serialization (`sort_keys=True`)
- Smoke test defaults to `.docx` fixture
- Conversion service deployment pending (outside Supabase)

## 2026-02-07

### Product Definition v2.0
- PRD locked (vision, users, capabilities, success criteria)
- Technical specification v3.0 (canonical output contract)
- Immutable fields specification (20 fields, deterministic formulas)
- Block types specification (16-type enum, hybrid extraction)
- User-defined schema use cases (4 detailed illustrations)

## Earlier

### Platform Foundation
- Supabase project initialized with Auth, Storage, Realtime
- 5 Edge Functions deployed (ingest, conversion-complete, export-jsonl, schemas, runs)
- React + Mantine frontend with AG Grid block viewer
- Multi-page marketing site (Landing, How It Works, Use Cases, Integrations)
- Dark/light theme support
- Project hierarchy with breadcrumb navigation
