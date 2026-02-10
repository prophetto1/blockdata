---
title: Status
description: Current platform state, the 9-phase roadmap, and completed milestones.
sidebar:
  label: Overview
  order: 0
---

## Current state

**Backend:** 5 Supabase Edge Functions deployed and working (ingest, conversion-complete, export-jsonl, schemas, runs). v2 schema active with 16 migrations applied. Realtime enabled on overlays. Worker Edge Function implemented, pending ANTHROPIC_API_KEY secret for activation.

**Frontend:** Live at blockdata.run. React + Mantine + AG Grid. Auth, project hierarchy, document upload, block viewer with dynamic schema columns, run management, review/confirm workflow, dark/light theme.

**Conversion:** Docling conversion service code-complete, Docker deployed to Cloud Run. PDF pipeline pending runtime verification (GCP org policy 403 on allUsers IAM binding).

**Database:** Phase 6 code-complete. Staging/confirmed columns, confirm/reject RPCs, overlay permissions hardened. v1 tables frozen with reject-write triggers.

## Immediate blockers

1. **ANTHROPIC_API_KEY** — Worker needs this secret set in Supabase to activate
2. **Cloud Run 403** — GCP org policy prevents public access; needs policy override or alternate deployment
3. **PDF E2E verification** — New conversion service image built but Cloud Run traffic not switched

## Phase summary

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Database & Architecture Foundations | Complete |
| 2 | AI Worker (Distributed Claim-Based) | Code-complete |
| 3 | Frontend Cleanup | Complete |
| 4 | Grid Layout & Toolbar | Complete |
| 5 | Multi-File Upload | Complete |
| 5B | Project-Level Bulk Operations | Complete |
| 6 | Review & Confirm UX (Staging Layer) | Complete |
| 7 | Export & Reconstruction | Pending |
| 8 | Third-Party Integrations | Pending |
| 9 | Infrastructure & Polish | Pending |

See [Roadmap](/docs/status/roadmap/) for the full phase breakdown and [Changelog](/docs/status/changelog/) for completed milestones.
