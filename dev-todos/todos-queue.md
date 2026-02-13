# Todos Queue (Canonical Execution Order)

**Date:** 2026-02-13  
**Status:** Active queue  
**Rule:** At most 2 items can be `In Progress` at once.

---

## In Progress

- [ ] `P7-001` In-wizard JSON escape hatch.

## Next Up

- [ ] `P7-002` Nested object parity in wizard or deterministic advanced routing.
- [ ] `P7-003` Conflict UX hardening (`schema_ref` + `schema_uid` duplicates).
- [ ] `P7-004` Priority 7 gate evidence capture.
- [ ] `P7-005` Mark Priority 7 passed in queue/gate trackers.
- [ ] `P8-001` Export variants (confirmed/all/CSV/per-document).

## Later

- [ ] `P8-002` `reconstruct` edge function (mdast).
- [ ] `P8-003` Reconstructed markdown download from `DocumentDetail`.
- [ ] `P8-004` Staged vs confirmed lifecycle verification.
- [ ] `P8-005` Priority 8 evidence + gate update.
- [ ] `UX-001` ProjectDetail 3-column layout (`documents | schema+actions | runs`).
- [ ] `UX-002` Fix schema-selected document count scoping mismatch.
- [ ] `UX-003` Hide/replace zero-state overlay badges when no runs exist.
- [ ] `P9-001` Testing baseline.
- [ ] `P9-002` Error boundary + realtime reconnection.
- [ ] `P9-003` CI/CD baseline.
- [ ] `P9-004` Auth lifecycle completion.
- [ ] `P9-005` Security hardening pass.
- [ ] `P9-007` Code-splitting pass (`React.lazy`, AG Grid chunk isolation).
- [ ] `P9-008` Account settings page completion.
- [ ] `ING-001` Downstream adapter interface/profile versioning.
- [ ] `ING-002` Deterministic reference adapter + tests.
- [ ] `ING-003` Pandoc version pin.
- [ ] `ING-004` Runtime policy lock for rollout keys.
- [ ] `ING-005` Worker concurrency and run-flow verification.
- [ ] `ING-006` Storage cleanup strategy for delete path.
- [ ] `ING-007` `artifact_size_bytes` metadata backfill/fix.
- [ ] `ING-008` `prompt_config` schema convention documentation + contract alignment.
- [ ] `ING-009` Verify deployed `ANTHROPIC_API_KEY` secret for live worker path.
- [ ] `ING-010` Revalidate/close historical conversion-service `Cloud Run 403` issue.
- [ ] `INT-001` Integrations app-route parity + page skeleton (`/app/integrations`).
- [ ] `INT-002` Neo4j integration.
- [ ] `INT-003` Webhook integration.
- [ ] `INT-004` DuckDB/Parquet integration.
- [ ] `INT-005` Agents + MCP configuration foundation (build-only; feature-flagged; no runtime binding).
- [ ] `ASST-001` Internal assistant / phase-2 integrations (deferred).
- [ ] `ASST-002` Copilot dock UI framework.
- [ ] `ASST-003` `schema-assist` backend edge function.
- [ ] `ASST-004` Wizard + copilot integration.
- [ ] `ASST-005` Visual system pass for assistant surfaces.
- [ ] `ASST-006` Assistant QA/observability/rollout.
- [ ] `OPT-001` Tier 3 optimization: retrieval-augmented instruction context.
- [ ] `OPT-002` Tier 4 optimization: async batch API processing path.
- [ ] `OPT-003` Model routing by block profile.
- [ ] `OPT-004` Pre-filtering for non-actionable blocks.

---

## Queue Update Rule

1. When an item is completed, move it to `dev-todos/todos-done-log.md`.
2. Pull the next highest-priority item from `dev-todos/todos-backlog.md` into `In Progress`.
3. Keep `In Progress` focused and short.
