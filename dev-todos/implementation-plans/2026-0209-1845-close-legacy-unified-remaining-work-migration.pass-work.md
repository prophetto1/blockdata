# Pass Work - 2026-0209-1845-close-legacy-unified-remaining-work-migration

Source: `dev-todos/specs/0209-unified-remaining-work.md`  
Plan: `dev-todos/implementation-plans/2026-0209-1845-close-legacy-unified-remaining-work-migration.md`

## Pass 1: Extraction

| Item # | Source | Verbatim (abbrev) | Type |
|---|---|---|---|
| 1 | Migration note | "Remaining open actions ... now consolidated in `dev-todos/0213-consolidated-remaining-actions.md`." | policy |
| 2 | Checklist Phase 1 | "Document `prompt_config` convention in schema spec" (open/deferred). | action |
| 3 | Checklist Phase 2 | "Set `ANTHROPIC_API_KEY` in Supabase secrets" (open). | test |
| 4 | Checklist Phase 2 | "Test: concurrent worker invocations don't double-process blocks" (open). | test |
| 5 | Checklist Phase 2 | "Test: create run -> trigger worker -> overlays reach `ai_complete` -> run status updates" (open). | test |
| 6 | Checklist Phase 3 | "Storage cleanup on document delete" (open/deferred). | action |
| 7 | Checklist Phase 7 | "Enhanced export options (confirmed only, all, CSV, per-doc)" (open). | action |
| 8 | Checklist Phase 7 | "`reconstruct` edge function..." (open). | action |
| 9 | Checklist Phase 7 | "Download reconstructed markdown from DocumentDetail toolbar" (open). | action |
| 10 | Checklist Phase 8 | "Integrations page (`/app/integrations`) with card layout" (open). | action |
| 11 | Checklist Phase 8 | "Neo4j ... push confirmed overlays" (open). | action |
| 12 | Checklist Phase 8 | "Webhook ... trigger on run confirmation" (open). | action |
| 13 | Checklist Phase 8 | "DuckDB/Parquet ... export confirmed data" (open). | action |
| 14 | Checklist Phase 9 | "Fix GCP conversion service 403" (open). | action |
| 15 | Checklist Phase 9 | "Code-splitting (React.lazy, AG Grid chunk)" (open). | action |
| 16 | Checklist Phase 9 | "Testing framework (Vitest + RTL) + initial test suite" (open). | action |
| 17 | Checklist Phase 9 | "React Error Boundary + Realtime reconnection" (open). | action |
| 18 | Checklist Phase 9 | "CI/CD (GitHub Actions: lint, typecheck, build)" (open). | action |
| 19 | Checklist Phase 9 | "Auth lifecycle: email confirmation, forgot password, OAuth providers" (open). | action |
| 20 | Checklist Phase 9 | "Account settings page" (open). | action |
| 21 | Checklist Phase 9 | "Security audit (CSP, rate limiting, session expiry)" (open). | action |

Non-actionable in this source:
- Completed checklist items (`[x]`) are historical completion evidence for this source.
- Earlier phase design prose (Phases 1-9) is implementation context already reflected in checklist/open items and migration note.

## Pass 2: Repo State Check

| Item # | Expected Output | Exists? | Location / Evidence | Notes |
|---|---|---|---|---|
| 1 | Consolidated open-action source exists | partial | `dev-todos/specs/0213-consolidated-remaining-actions.md` exists, but migration note still points to old path (`dev-todos/0213-consolidated-remaining-actions.md`) | Needs path-fidelity cleanup. |
| 2 | `prompt_config` convention documented | yes | `docs/specs/0210-batched-worker-protocol.md` prompt_config contract sections | Implemented in docs; 0209 checklist still marks deferred. |
| 3 | Deployed `ANTHROPIC_API_KEY` verified | partial | Runtime references exist; deployed secret cannot be proven from repo alone | Needs environment evidence. |
| 4 | Double-process concurrency test | partial | `claim_overlay_batch` uses `FOR UPDATE SKIP LOCKED` (`supabase/migrations/20260210053649_010_claim_overlay_batch_rpc.sql`) | Mechanism exists; explicit test evidence pending. |
| 5 | End-to-end run verification | partial | `supabase/functions/runs/index.ts`, `supabase/functions/worker/index.ts` | Needs explicit smoke/evidence artifact. |
| 6 | Storage cleanup on delete | partial | `supabase/migrations/20260210060852_011_delete_rpcs.sql` explicitly says no storage cleanup | Open/deferred policy not closed. |
| 7 | Export variants closure | partial | Run JSONL + project ZIP export exists (`supabase/functions/export-jsonl/index.ts`, `web/src/pages/ProjectDetail.tsx`) | Full variant matrix still open. |
| 8 | `reconstruct` edge function | no | `supabase/functions/reconstruct` missing | Open. |
| 9 | Reconstruct download in DocumentDetail | no | `web/src/pages/DocumentDetail.tsx` has JSONL export only | Open. |
| 10 | `/app/integrations` app page | no | No authenticated `/app/integrations` route in `web/src/router.tsx` | Open. |
| 11-13 | Neo4j/webhook/DuckDB integration implementations | no | No corresponding app/backend integration modules for this scope | Open. |
| 14 | Cloud Run 403 remediation verification | partial | Requires live environment evidence | Open/unknown from repo-only view. |
| 15 | Code splitting strategy | partial | No explicit `React.lazy` strategy found in app routes | Open/partial. |
| 16 | Web testing baseline | no | No web test suite files/scripts found | Open. |
| 17 | Error boundary + realtime reconnect closure | partial | No dedicated `ErrorBoundary` component found; reconnect behavior not evidenced as closure | Open/partial. |
| 18 | CI/CD baseline | no | `.github/workflows` missing | Open. |
| 19 | Auth lifecycle completion | partial | Email confirmation exists in auth flows; password reset/OAuth not found | Partial. |
| 20 | Account settings page | partial | `web/src/pages/Settings.tsx` exists but not full lifecycle/admin-controls page from checklist intent | Partial. |
| 21 | Security audit closure | partial | No consolidated CSP/rate-limit/session-expiry closure artifact found | Open/partial. |

## Pass 3: Draft

Draft plan written to:
- `dev-todos/implementation-plans/2026-0209-1845-close-legacy-unified-remaining-work-migration.md`

## Pass 4: Completeness Audit

| Item # | Covered By | Status |
|---|---|---|
| 1 | Rule 1 + Action 1 + Action 4 | covered |
| 2 | Action 2 | covered |
| 3 | Rule 3 + Action 2 | covered |
| 4 | Action 2 | covered |
| 5 | Action 2 | covered |
| 6 | Action 2 | covered |
| 7 | Action 3 | covered |
| 8 | Action 3 | covered |
| 9 | Action 3 | covered |
| 10 | Action 3 | covered |
| 11 | Action 3 | covered |
| 12 | Action 3 | covered |
| 13 | Action 3 | covered |
| 14 | Action 3 | covered |
| 15 | Action 3 | covered |
| 16 | Action 3 | covered |
| 17 | Action 3 | covered |
| 18 | Action 3 | covered |
| 19 | Action 3 | covered |
| 20 | Action 3 | covered |
| 21 | Action 3 | covered |

Result: 21/21 actionable items tracked. 0 missing. 0 invented actions.

## Pass 5: Guideline Compliance Check

- [x] Filename pattern compliant
- [x] Header fields complete
- [x] Included rules embedded in plan
- [x] Actions in 3-column table
- [x] Full-sentence action descriptions
- [x] Tangible outputs for every action
- [x] Action chain produces downstream work
- [x] Last action is final artifact
- [x] Completion logic has binary locks
- [x] No sign-off/governance process actions
- [x] No invented process-doc outputs
- [x] Vertical-slice scope coverage

Summary counts:
- Pass 1 actionable extracted: 21
- Covered: 21
- Orphans (non-actionable): 2
- Flagged vague: 0

