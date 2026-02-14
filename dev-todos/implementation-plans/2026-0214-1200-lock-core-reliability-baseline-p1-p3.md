# 2026-0214-1200-lock-core-reliability-baseline-p1-p3

filename (UID): `2026-0214-1200-lock-core-reliability-baseline-p1-p3.md`
problem: P1-P3 reliability work is partially executed, but gate closure can drift unless format, worker, and config-boundary evidence are re-validated as one implementation slice.
solution: Execute and verify P1-P3 as one chained implementation plan that re-checks format reliability, worker runtime reliability, and config ownership boundaries with explicit pass/fail closure.
scope: Priorities 1-3 from the core priority queue, including format matrix, worker/run behavior, and config-registry boundary enforcement.

## Included Implementation Rules

1. Priority dependency order is fixed: P2 starts only after P1 passes; P3 starts only after P2 passes.
2. Required format matrix is `md`, `txt`, `docx`, `pdf`, `pptx`, `xlsx`, `html`, `csv`.
3. Worker reliability verification must include happy path, retry/terminal failure, cancellation, no-key fallback, and invalid-key handling.
4. Config boundary closure must resolve default drift (`model`, `temperature`, `max_tokens`), provider `base_url` parity, and deterministic claim ordering (`block_index`).
5. Evidence updates are mandatory before gate state can move to `Passed`.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Run the full required format matrix in one controlled pass and append a dated run entry with command context and logs so the run can be reproduced exactly. | Updated `dev-todos/_complete/0211-source-format-smoke-results.md` and new run logs under `scripts/logs/` (repo state: evidence docs exist) |
| 2 | If any format fails, implement root-cause fixes, rerun failed formats, and then rerun the full matrix to confirm no regressions in required formats. | Updated `dev-todos/_complete/0211-source-format-reliability-matrix.md` with dated verified state for all required formats (repo state: file exists) |
| 3 | Execute deterministic worker reliability scenarios and record run IDs, transition checks, and overlay truth validation outputs for each required scenario class. | Updated `dev-todos/_complete/0211-worker-runtime-reliability.md` with scenario evidence and run IDs (repo state: file exists) |
| 4 | Re-validate config-registry and ownership boundary rules by checking default-value parity, `base_url` contract, and `block_index` ordering semantics in migrations/function code, then document resolved state. | Updated `dev-todos/_complete/0211-admin-config-registry.md` with code/migration references for each resolved boundary item (repo state: file exists) |
| 5 | Update priority gate state for P1-P3 in the canonical tracker only after Actions 1-4 evidence is complete, and include blocker notes if any criterion is not met. | Updated `dev-todos/action-plans/0211-core-priority-queue-and-optimization-plan.md` gate rows for P1-P3 (repo state: file exists) |
| 6 | Publish one closure artifact that links all P1-P3 evidence files, states binary pass/fail per priority, and records unresolved risk items (if any). | `dev-todos/_complete/2026-0214-p1-p3-pass-confirmation.md` (repo state: missing) |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Format lock: all required formats are verified with dated evidence and no unverified required format remains.
2. Worker lock: all required worker reliability scenario classes have run evidence and matching pass/fail outcomes.
3. Config-boundary lock: default parity, `base_url`, and `block_index` contract checks are documented as resolved or explicitly blocked.
4. Tracker lock: P1-P3 gate rows in the canonical priority tracker match evidence outcomes.
5. Evidence lock: closure artifact links every evidence document used for P1-P3.
6. Final-output lock: `dev-todos/_complete/2026-0214-p1-p3-pass-confirmation.md` exists and provides binary priority outcomes.
