# Plan: Test-Driven Hardening of Existing Features

**Filed:** 2026-02-10
**Status:** Draft plan
**Priority:** High (stabilize before building new features)
**Rationale:** Phases 1-6 are implemented. Rather than pushing into Phases 7-9 (export variants, integrations, polish), harden what exists first. Every feature path should have automated coverage before adding new surface area.

---

## Testing Stack

| Tool | Purpose |
|---|---|
| **Vitest** | Unit + integration test runner (Vite-native, fast) |
| **React Testing Library (RTL)** | Component rendering + interaction tests |
| **MSW (Mock Service Worker)** | Mock Supabase API calls without hitting real DB |
| **Playwright** | End-to-end browser tests for critical flows |

Setup: `vitest` + `@testing-library/react` + `@testing-library/user-event` + `msw` + `playwright`

---

## Feature Inventory: What Needs Coverage

### Tier 1 — Core Data Paths (highest risk, test first)

These are the paths where bugs cause data loss or corruption.

| # | Feature | Entry Point | Key Files | What to Test |
|---|---|---|---|---|
| 1.1 | **Upload + ingest (MD)** | Upload.tsx → `ingest` edge fn | `Upload.tsx`, `ingest/index.ts`, `process-md.ts`, `_shared/markdown.ts` | Single file upload, multi-file batch, file type rejection, max 10 limit, per-file status transitions (ready→uploading→ingested), duplicate upload idempotency, project_id association |
| 1.2 | **Upload + ingest (non-MD)** | Upload.tsx → `ingest` → conversion service | `process-convert.ts`, `conversion-complete/index.ts`, `_shared/docling.ts` | Status transitions (ready→uploading→uploaded→converting), conversion_failed handling, callback processing, docling vs mdast track selection |
| 1.3 | **Schema upload** | Schemas.tsx → `schemas` edge fn | `Schemas.tsx`, `schemas/index.ts` | Valid JSON upload, schema_ref dedup (idempotent), invalid JSON rejection, schema_uid conflict (409) |
| 1.4 | **Run creation** | DocumentDetail → `runs` edge fn | `DocumentDetail.tsx`, `runs/index.ts`, `create_run_v2` RPC | Creates run + pending overlay rows atomically, validates document ownership, validates ingested status, correct total_blocks count |
| 1.5 | **Worker processing** | Worker edge fn | `worker/index.ts`, `claim_overlay_batch` RPC | Atomic claim (no double-processing), status transitions (pending→claimed→ai_complete), writes to overlay_jsonb_staging (not confirmed), run rollup updates, failure handling + retry, cancellation check |
| 1.6 | **Confirm overlays** | BlockViewerGrid → `confirm_overlays` RPC | `BlockViewerGrid.tsx`, migration 009 RPC | Atomic copy staging→confirmed, stamps confirmed_at/by, per-block confirm, bulk confirm, reject-to-pending |
| 1.7 | **Export JSONL** | DocumentDetail → `export-jsonl` edge fn | `export-jsonl/index.ts` | Only exports confirmed overlays, correct v3.0 canonical shape, blocks without confirmed data get null user_defined, pairing rules respected |

### Tier 2 — Frontend Interactions (medium risk)

| # | Feature | Key Files | What to Test |
|---|---|---|---|
| 2.1 | **Auth flow** | `Login.tsx`, `Register.tsx`, `AuthCallback.tsx`, `lib/supabase.ts` | Login, register, sign out, session persistence, redirect after login, protected route guard |
| 2.2 | **Projects CRUD** | `Projects.tsx`, `ProjectDetail.tsx` | Create project, edit name/description, delete project (cascade confirmation), project list loading |
| 2.3 | **Document detail + grid** | `DocumentDetail.tsx`, `BlockViewerGrid.tsx` | Block loading + pagination, run selector, column visibility toggle, view mode toggle, block type filter, type-specific cell renderers |
| 2.4 | **Inline editing** | `BlockViewerGrid.tsx`, `useOverlays.ts` | Double-click staged cell → edit → save via RPC, type coercion (number/boolean/enum), revert on failure, non-editable for non-staged rows |
| 2.5 | **Bulk actions** | `ProjectDetail.tsx` | Apply Schema to All (skips already-bound docs), Run All Pending (multi-round dispatch), Confirm All (per-run RPC calls), Export All ZIP (file download) |
| 2.6 | **Realtime updates** | `ProjectDetail.tsx`, `useOverlays.ts` | Document status updates after upload, overlay status updates during worker processing |

### Tier 3 — Edge Cases + Error Handling (lower risk but important)

| # | Feature | What to Test |
|---|---|---|
| 3.1 | **Idempotency** | Re-uploading same file returns existing row, re-uploading same schema returns existing row |
| 3.2 | **Stale conversion cleanup** | pg_cron marks stale `converting` rows as `conversion_failed` after 5 minutes |
| 3.3 | **Route guards** | Legacy flat routes redirect to project-scoped URLs, document project_id mismatch redirects, 404 handling |
| 3.4 | **Concurrent workers** | Two workers claiming from same run don't overlap (SKIP LOCKED), partial batch success |
| 3.5 | **Deletion cascades** | Delete document → blocks + overlays gone, delete run → overlays gone, delete project → everything gone |
| 3.6 | **RLS enforcement** | User A can't see User B's documents/runs/overlays via PostgREST |

---

## Recommended Execution Order

### Phase A: Setup (1-2 hours)

1. Install test dependencies:
   ```bash
   cd web && npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
   ```

2. Configure Vitest in `vite.config.ts`:
   ```ts
   test: {
     environment: 'jsdom',
     globals: true,
     setupFiles: ['./src/test/setup.ts'],
   }
   ```

3. Create `src/test/setup.ts` with RTL matchers + MSW server setup

4. Create MSW handlers for core Supabase endpoints:
   - `POST /functions/v1/ingest` → mock ingest responses
   - `POST /functions/v1/schemas` → mock schema upload
   - `POST /functions/v1/runs` → mock run creation
   - `GET /functions/v1/export-jsonl` → mock JSONL export
   - `POST /rest/v1/rpc/*` → mock RPCs (confirm_overlays, etc.)
   - `GET /rest/v1/documents_v2` → mock document queries
   - `GET /rest/v1/blocks_v2` → mock block queries

### Phase B: Unit Tests — Pure Logic (fast wins)

| File to Test | Test File | What |
|---|---|---|
| `lib/schema-fields.ts` | `schema-fields.test.ts` | `extractSchemaFields()` with various schema shapes (string, enum, number, boolean, nested, array) |
| `lib/edge.ts` | `edge.test.ts` | `edgeJson()` and `edgeFetch()` error handling, auth header injection |
| `_shared/hash.ts` | `hash.test.ts` | `sha256Hex()` determinism, `concatBytes()` |
| `_shared/markdown.ts` | `markdown.test.ts` | Block extraction from various mdast structures, block_type mapping, char_span correctness |
| `_shared/docling.ts` | `docling.test.ts` | Block extraction from DoclingDocument JSON fixtures, tree traversal, label→block_type mapping, table serialization |

### Phase C: Component Tests — UI Behavior

| Component | Test File | Key Scenarios |
|---|---|---|
| `Upload.tsx` | `Upload.test.tsx` | Add files via click, add via drag, reject bad file types, max 10 enforcement, upload all → parallel calls, per-file retry, clear all |
| `BlockViewerGrid.tsx` | `BlockViewerGrid.test.tsx` | Renders blocks, pagination, type filter, column visibility, staging banner visible when staged overlays exist, inline edit calls RPC, confirm/reject buttons |
| `ProjectDetail.tsx` | `ProjectDetail.test.tsx` | Loads project + docs + schemas, Apply Schema to All creates runs, summary badges reflect overlay counts, delete project shows confirmation |
| `DocumentDetail.tsx` | `DocumentDetail.test.tsx` | Loads document metadata, run selector, export button calls edge function, delete document |

### Phase D: Integration Tests — End-to-End Data Flows

These test full request→response cycles with MSW intercepting the Supabase calls.

| Flow | Steps | Assertions |
|---|---|---|
| Upload → View | Upload .md file → poll documents → navigate to DocumentDetail → verify blocks rendered | Blocks appear in grid, block_type badges correct, pagination works |
| Schema → Run → Overlays | Upload schema → select document → create run → verify overlay rows created | Run appears in selector, overlay status column shows "pending" for all blocks |
| Worker → Review → Confirm | Mock worker processing → overlays transition to ai_complete → staging banner appears → confirm all → overlays become confirmed | Status badges update, confirmed cells lose staging indicator, export includes confirmed data |
| Bulk Operations | Upload 3 docs → Apply Schema to All → Run All Pending → Confirm All → Export All ZIP | Correct number of runs created, all overlays processed, ZIP contains 3 JSONL files |

### Phase E: Playwright E2E (optional, highest-value flows)

| Test | What |
|---|---|
| `auth.spec.ts` | Register → login → see projects → sign out → redirect to login |
| `upload-to-export.spec.ts` | Login → create project → upload .md → wait for ingested → view blocks → export JSONL → verify file content |
| `schema-run-flow.spec.ts` | Login → upload schema → navigate to document → create run → verify pending overlays in grid |

---

## Success Criteria

- All Tier 1 paths have at least one happy-path test + one error-path test
- All Tier 2 components have rendering + basic interaction tests
- CI runs `vitest` on every PR (Phase 9.5, but can set up early)
- Test suite runs in under 30 seconds (no real network calls)
- Zero known data-path bugs before adding new features

---

## What This Replaces

Instead of building Phases 7-9 next, this plan hardens Phases 1-6:

| Instead of | Do this |
|---|---|
| Phase 7: Enhanced export options | Test existing export thoroughly, then add variants |
| Phase 8: Integrations | Test bulk operations + export, then build connectors |
| Phase 9: Polish (code-splitting, CI, error boundaries) | Set up test infrastructure first, polish follows naturally |

The schema wizard (separate issue doc) can proceed in parallel with testing — it's a new page, not a modification of existing code.
