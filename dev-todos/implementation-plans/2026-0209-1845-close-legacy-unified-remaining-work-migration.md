# 2026-0209-1845-close-legacy-unified-remaining-work-migration

filename (UID): `2026-0209-1845-close-legacy-unified-remaining-work-migration.md`  
problem: `0209-unified-remaining-work.md` contains a mixed state of completed and open checklist items, while open actions were later migrated to a consolidated backlog file, creating parallel-source risk and tracking ambiguity.  
solution: Close this legacy source as an implementation slice by verifying migration fidelity to the consolidated backlog, preserving unresolved items as executable outputs, and marking legacy status boundaries explicitly.  
scope: migration-fidelity audit from 0209 checklist to 0213 consolidated backlog, unresolved-item execution binding, and legacy-source closure evidence.

## Included Implementation Rules

1. Open actions in 0209 that remain unresolved must be tracked through the consolidated source (`0213-consolidated-remaining-actions.md`) with one-to-one mapping.
2. Already completed checklist items in 0209 remain historical evidence and are not re-implemented.
3. Environment-only checks (deployed secrets, Cloud Run policy behavior) require explicit verification artifacts, not inferred completion.
4. Legacy file can remain in repo, but must be marked as non-canonical for open-work tracking once migration fidelity is proven.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Build a one-to-one migration map between unresolved 0209 checklist items and their corresponding consolidated backlog entries, proving no open item was dropped during migration and noting any naming/wording normalization. | `dev-todos/_complete/2026-0209-to-0213-open-item-mapping.md` with row-level mapping and status. |
| 2 | For unresolved worker/runtime checks from 0209 (secret readiness, concurrency verification, end-to-end run verification, storage cleanup policy), bind each item to concrete evidence outputs and update closure status using current repo/runtime findings. | Updated evidence entries in `dev-todos/_complete/2026-0213-worker-runtime-validation.md` and mapping file references (repo state before action: these items remain open in 0209 checklist). |
| 3 | For unresolved Phase 7-9 product/ops work from 0209 (export variants, reconstruct function, integrations, CI/testing/security/auth polish), align execution ownership to consolidated backlog plan outputs and record explicit remain/open vs done states per item. | Consolidated closure matrix section in `dev-todos/_complete/2026-0213-consolidated-remaining-actions-closure.md` with 0209-origin marker per item. |
| 4 | Apply legacy-closure labeling in the 0209 source so future tracking does not split across files, while preserving historical completion context and migration note for auditability. | Updated `dev-todos/specs/0209-unified-remaining-work.md` header/status block marking it as legacy-tracking source with canonical pointer to consolidated backlog. |
| 5 | Publish final migration-closure artifact with binary outcomes: mapped items count, dropped-items count, unresolved-items count, and canonical tracking pointer verification. | `dev-todos/_complete/2026-0209-unified-remaining-work-closure.md`. |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Mapping lock: every unresolved 0209 checklist item is mapped to consolidated backlog tracking.
2. Runtime-check lock: unresolved runtime/env verification items have explicit evidence outcomes.
3. Product/ops lock: unresolved Phase 7-9 items are bound to consolidated execution artifacts.
4. Legacy-label lock: 0209 file is explicitly labeled non-canonical for open tracking.
5. Final-output lock: migration-closure artifact reports binary mapping/coverage outcomes.

