# Pass Work - 2026-0213-1740-execute-consolidated-remaining-actions-backlog

Source: `dev-todos/specs/0213-consolidated-remaining-actions.md`  
Plan: `dev-todos/implementation-plans/2026-0213-1740-execute-consolidated-remaining-actions-backlog.md`

## Pass 1: Extraction

| Item # | Source | Verbatim (abbrev) | Type |
|---|---|---|---|
| 1 | 2.1 | "Define adapter interface and profile versioning." | action |
| 2 | 2.1 | "Build one deterministic reference adapter (`docling -> KG flatten v1`)." | action |
| 3 | 2.1 | "Add deterministic output tests for adapter outputs." | test |
| 4 | 2.2 | "Pin Pandoc package version in `services/conversion-service/Dockerfile`..." | action |
| 5 | 2.2 | "Review temporary runtime rollout policy state ... and lock intended production values." | action |
| 6 | 3.1 | "Document `prompt_config` convention in schema spec." | action |
| 7 | 3.1 | "Confirm `ANTHROPIC_API_KEY` is configured in deployed Supabase secrets..." | test |
| 8 | 3.1 | "Verify concurrent worker invocations do not double-process blocks." | test |
| 9 | 3.1 | "Verify end-to-end run flow ... overlays reach `ai_complete`..." | test |
| 10 | 3.1 | "Add storage cleanup for document delete path (or formalize deferred policy + cleanup job)." | action |
| 11 | 3.2 | "Implement enhanced export variants (confirmed only, all, CSV, per-document)." | action |
| 12 | 3.2 | "Implement `reconstruct` edge function..." | action |
| 13 | 3.2 | "Add reconstructed markdown download action in `DocumentDetail` toolbar." | action |
| 14 | 3.3 | "Build integrations page (`/app/integrations`) with integration cards." | action |
| 15 | 3.3 | "Implement Neo4j integration..." | action |
| 16 | 3.3 | "Implement webhook integration..." | action |
| 17 | 3.3 | "Implement DuckDB/Parquet export integration." | action |
| 18 | 3.4 | "Revalidate and fix conversion service access-policy issue ... (`Cloud Run 403`)..." | action |
| 19 | 3.4 | "Add code splitting (`React.lazy`, AG Grid chunk isolation)." | action |
| 20 | 3.4 | "Add testing baseline (Vitest + RTL + initial suite)." | action |
| 21 | 3.4 | "Add React error boundary and realtime reconnection handling." | action |
| 22 | 3.4 | "Add CI/CD baseline (lint, typecheck, build)." | action |
| 23 | 3.4 | "Complete auth lifecycle features (email confirmation, password reset, OAuth providers)." | action |
| 24 | 3.4 | "Add account settings page for lifecycle/admin user controls." | action |
| 25 | 3.4 | "Complete security hardening pass (CSP, rate limiting, session expiry handling)." | action |
| 26 | 4 | "Recommended Execution Order" (Immediate hardening -> core value -> expansion -> ops polish). | policy |
| 27 | 5 | "Track open work updates in this file only." | policy |

Non-actionable in this source:
- Authority/migration provenance lines at top are context metadata.
- "0209 last verified..." and "0213 evidence record..." notes are planning context, not direct outputs.

## Pass 2: Repo State Check

| Item # | Expected Output | Exists? | Location / Evidence | Notes |
|---|---|---|---|---|
| 1-3 | Phase 4 adapter interface + deterministic reference adapter + tests | no | No adapter implementation files found in source tree for this scope; deferred status referenced in `dev-todos/_complete/0213-ingest-tracks-pandoc-and-representation-artifacts-plan.md` | Still open. |
| 4 | Pinned Pandoc in conversion Dockerfile | no | `services/conversion-service/Dockerfile` installs `pandoc` without version pin | Still open. |
| 5 | Runtime policy lock for ingest-track keys | partial | Policy keys seeded in `supabase/migrations/20260213153000_019_ingest_tracks_policy_pandoc_representation.sql` | Review/lock evidence artifact missing. |
| 6 | `prompt_config` convention documented | yes | `docs/specs/0210-batched-worker-protocol.md` contains prompt_config contract sections | Implemented in docs, still needs closure linkage to consolidated backlog. |
| 7 | Deployed `ANTHROPIC_API_KEY` verified | partial | Repo cannot confirm deployed secret state; runtime references exist in docs and functions | Requires environment verification artifact. |
| 8 | Worker concurrency no-double-processing verification | partial | `supabase/migrations/20260210053649_010_claim_overlay_batch_rpc.sql` (`FOR UPDATE SKIP LOCKED`), `supabase/functions/worker/index.ts` claims via `claim_overlay_batch` | Mechanism exists; explicit verification evidence still needed. |
| 9 | End-to-end run flow verification | partial | Worker/run paths exist (`supabase/functions/runs/index.ts`, `supabase/functions/worker/index.ts`) | Source asks for explicit verification evidence. |
| 10 | Storage cleanup behavior for document delete | partial | `supabase/migrations/20260210060852_011_delete_rpcs.sql` explicitly says no storage cleanup | Requires implementation or formal deferred policy. |
| 11 | Enhanced export variants | partial | JSONL exports exist (`supabase/functions/export-jsonl/index.ts`, project ZIP export in `web/src/pages/ProjectDetail.tsx`) | CSV/all/per-document matrix still incomplete. |
| 12 | `reconstruct` edge function | no | `supabase/functions/reconstruct` path missing | Open. |
| 13 | Reconstructed markdown download action | no | `web/src/pages/DocumentDetail.tsx` has export JSONL, no reconstruct download action | Open. |
| 14 | `/app/integrations` app page | no | Router lacks `/app/integrations` app route; only public `/integrations` marketing route in `web/src/router.tsx` | Open. |
| 15-17 | Neo4j/webhook/DuckDB integrations | no | No app integration implementation in `supabase/functions`/`web/src/pages` for this scope | Open. |
| 18 | Cloud Run 403 revalidation/fix | partial | Source-of-truth must be live env check; repo-only proof unavailable | Needs explicit environment evidence. |
| 19 | Code splitting | partial | No explicit `React.lazy` strategy found in web app routes | Open/partial. |
| 20 | Frontend test baseline | no | No web test files found under `web/src` and no test tooling scripts in `web/package.json` | Open. |
| 21 | Error boundary + realtime reconnect handling | partial | No dedicated error-boundary component found; some realtime code exists elsewhere | Open/partial. |
| 22 | CI/CD baseline | no | `.github/workflows` directory not present | Open. |
| 23 | Auth lifecycle completion | partial | Email confirmation flow present in `web/src/pages/Register.tsx`; password reset/OAuth paths not found | Partial. |
| 24 | Account settings lifecycle controls | partial | `web/src/pages/Settings.tsx` exists for provider settings; dedicated lifecycle/admin controls page not found | Partial/open. |
| 25 | Security hardening pass | partial | No consolidated CSP/rate-limit/session-expiry artifact found in current repo | Open/partial. |
| 26-27 | Ordered execution and canonical tracking behavior | partial | Order defined in source; enforcement artifact/tracking closure not yet published | Needs closure artifact. |

## Pass 3: Draft

Draft plan written to:
- `dev-todos/implementation-plans/2026-0213-1740-execute-consolidated-remaining-actions-backlog.md`

## Pass 4: Completeness Audit

| Item # | Covered By | Status |
|---|---|---|
| 1 | Action 1 | covered |
| 2 | Action 1 | covered |
| 3 | Action 1 | covered |
| 4 | Action 2 | covered |
| 5 | Action 2 | covered |
| 6 | Action 3 | covered |
| 7 | Action 3 | covered |
| 8 | Action 3 | covered |
| 9 | Action 3 | covered |
| 10 | Action 3 | covered |
| 11 | Action 4 | covered |
| 12 | Action 4 | covered |
| 13 | Action 4 | covered |
| 14 | Action 5 | covered |
| 15 | Action 5 | covered |
| 16 | Action 5 | covered |
| 17 | Action 5 | covered |
| 18 | Action 6 | covered |
| 19 | Action 6 | covered |
| 20 | Action 6 | covered |
| 21 | Action 6 | covered |
| 22 | Action 6 | covered |
| 23 | Action 6 | covered |
| 24 | Action 6 | covered |
| 25 | Action 6 | covered |
| 26 | Rule 2 + Actions 1-6 | covered |
| 27 | Rule 1 + Action 7 | covered |

Result: 27/27 actionable items tracked. 0 missing. 0 invented actions.

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
- Pass 1 actionable extracted: 27
- Covered: 27
- Orphans (non-actionable): 2
- Flagged vague: 0

