# 2026-0213-1740-execute-consolidated-remaining-actions-backlog

filename (UID): `2026-0213-1740-execute-consolidated-remaining-actions-backlog.md`  
problem: Remaining platform work is consolidated into one active backlog, but execution is fragmented across deferred ingest-adapter work, validation gaps, missing reconstruction/integrations, and incomplete ops hardening.  
solution: Execute the consolidated backlog as one controlled implementation slice, grouped by dependency order, with explicit outputs and evidence for each migrated action group from 0213 and 0209.  
scope: deferred Phase 4 adapter bootstrap, runtime hardening, export/reconstruction, integrations, and ops/security completion items listed in the consolidated source.

## Included Implementation Rules

1. This source is the canonical tracker for migrated open actions from 0213 and 0209.
2. Execution order is fixed: immediate hardening -> core product value -> platform expansion -> ops polish.
3. Items requiring live-environment validation (for example deployed secrets and Cloud Run policy behavior) must produce explicit verification evidence, not assumptions.
4. When an item is intentionally deferred, the deferral policy and cleanup path must be explicit and auditable.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Deliver deferred Phase 4 adapter bootstrap by defining a versioned adapter interface contract, implementing one deterministic reference adapter (`docling -> KG flatten v1`), and adding deterministic output tests that validate stable adapter output for fixed inputs. | New adapter contract/spec + reference adapter implementation and deterministic tests under source/integration modules with evidence summary `dev-todos/_complete/2026-0213-phase4-adapter-bootstrap.md` (repo state before action: source marks this phase deferred with no adapter implementation). |
| 2 | Close ingest-track blockers by pinning Pandoc package version in `services/conversion-service/Dockerfile` and locking intended production values for `upload.track_enabled.pandoc` and `upload.allowed_extensions` with documented runtime policy evidence. | Updated `services/conversion-service/Dockerfile` (pinned Pandoc) and policy-lock evidence `dev-todos/_complete/2026-0213-ingest-policy-lock.md` (repo state before action: Dockerfile installs unpinned `pandoc`; policy review remains open). |
| 3 | Complete worker/runtime validation bundle: document `prompt_config` convention status, verify worker concurrency no-double-processing behavior, verify full run lifecycle to `ai_complete` rollup, verify deployed `ANTHROPIC_API_KEY` readiness in target environment, and define/document storage-cleanup behavior for document deletion (implemented or deferred with job policy). | Consolidated validation artifact `dev-todos/_complete/2026-0213-worker-runtime-validation.md` plus any required code/policy updates (repo state before action: concurrency protections exist via `claim_overlay_batch`; deployed-secret state and storage cleanup policy are not closed in repo evidence). |
| 4 | Complete export/reconstruction value path by implementing enhanced export variants (confirmed-only/all/CSV/per-document options where missing), adding `reconstruct` edge function for confirmed `revised_content`, and wiring reconstructed markdown download action into `DocumentDetail` UI toolbar. | New/updated export + reconstruction artifacts in `supabase/functions/` and `web/src/pages/DocumentDetail.tsx`, with proof in `dev-todos/_complete/2026-0213-export-reconstruct-closure.md` (repo state before action: JSONL exports exist, but reconstruct edge function and reconstructed-download UI are missing). |
| 5 | Build platform integrations implementation slice by adding `/app/integrations` app page and implementing Neo4j, webhook, and DuckDB/Parquet integration configuration/execution paths with confirmed-overlay push semantics. | New integrations page and integration modules/functions with evidence in `dev-todos/_complete/2026-0213-integrations-closure.md` (repo state before action: only marketing integrations page exists; app integrations route/components are missing). |
| 6 | Execute ops hardening closure: revalidate/fix Cloud Run 403 status if present, add code splitting strategy, add frontend test baseline, add error boundary/realtime reconnection handling, add CI/CD baseline, complete auth lifecycle gaps, add account settings lifecycle controls, and complete security hardening pass (CSP/rate limiting/session expiry handling). | Ops closure artifact `dev-todos/_complete/2026-0213-ops-hardening-closure.md` plus corresponding code/config additions (repo state before action: no web test suite, no repo workflow directory, no app error boundary component, and several lifecycle/security items remain open). |
| 7 | Publish final consolidated backlog closure report that maps every checklist item from the source doc to concrete output artifacts and pass/fail state, and update source-tracking references to reflect done/remaining items with evidence links. | `dev-todos/_complete/2026-0213-consolidated-remaining-actions-closure.md` with one row per source checklist item and artifact links. |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Adapter lock: Phase 4 adapter interface, reference adapter, and deterministic tests are delivered.
2. Ingest-policy lock: Pandoc pin and runtime-policy lock evidence are complete.
3. Runtime-validation lock: worker concurrency/E2E/deployed-secret/delete-cleanup outcomes are evidenced.
4. Export-reconstruct lock: enhanced exports and reconstruct workflow are implemented and UI-exposed.
5. Integration lock: `/app/integrations` and three integration classes are implemented for app workflow.
6. Ops lock: testing, CI/CD, lifecycle, and security hardening outcomes are all evidenced.
7. Final-output lock: consolidated closure artifact maps all source checklist items to binary outcomes.

