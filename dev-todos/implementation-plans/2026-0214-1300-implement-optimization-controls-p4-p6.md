# 2026-0214-1300-implement-optimization-controls-p4-p6

filename (UID): `2026-0214-1300-implement-optimization-controls-p4-p6.md`
problem: P4-P6 optimization features can regress output quality or runtime determinism unless benchmark parity, batching correctness, and policy snapshot controls are verified together.
solution: Execute P4-P6 as one implementation chain with baseline measurement, controlled optimization rollout, parity verification, and policy/audit controls.
scope: Prompt caching, adaptive multi-block batching, and admin/superuser optimization controls for worker runtime.

## Included Implementation Rules

1. Optimization changes must be measured against a fixed baseline dataset and schema.
2. Prompt caching requires an explicit rollback path and ON/OFF benchmark comparison.
3. Batching behavior must preserve deterministic block mapping and overflow split/retry correctness.
4. Policy controls must be snapshot at run creation to prevent mid-run drift.
5. Policy changes must be auditable and visible.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Capture a pre-change benchmark baseline for token/cost/quality on fixed schema/document inputs and store raw logs plus summary values so later optimization runs are comparable. | New timestamped benchmark logs under `scripts/logs/` and baseline summary update in `dev-todos/_complete/0211-worker-optimization-benchmark-results.md` (repo state: benchmark doc exists) |
| 2 | Implement and verify prompt caching in worker runtime with explicit rollback control, then run ON/OFF paired benchmarks using identical inputs and record token/cost deltas. | Updated `supabase/functions/worker/index.ts` and benchmark evidence in `dev-todos/_complete/0211-worker-optimization-benchmark-results.md` (repo state: worker file exists; implementation/evidence require refresh run) |
| 3 | Run material parity comparison between baseline and caching-enabled outputs and document mismatch counts with exception notes when mismatches are non-zero. | Material parity section update in `dev-todos/_complete/0211-worker-optimization-benchmark-results.md` with explicit mismatch counts (repo state: doc exists) |
| 4 | Implement or re-validate adaptive batching for extraction and revision-heavy workloads, including deterministic block mapping and overflow split/retry safeguards, then record call-count and correctness outcomes. | Updated `supabase/functions/worker/index.ts`, `dev-todos/_complete/0211-priority5-adaptive-batching-prep-spec.md`, and batching benchmark logs under `scripts/logs/` (repo state: files exist; evidence refresh required) |
| 5 | Implement or re-validate admin optimization controls for caching mode, batching limits, and safety margins with run-time snapshot enforcement and policy audit visibility. | Verified artifacts in `supabase/migrations/20260212114500_018_admin_runtime_policy_controls.sql`, `supabase/functions/admin-config/index.ts`, `web/src/pages/SuperuserSettings.tsx`, and `dev-todos/_complete/0211-admin-optimization-controls-spec.md` (repo state: artifacts exist) |
| 6 | Publish a closure artifact that links all P4-P6 benchmark and control evidence, reports rollback readiness, and states binary pass/fail for each priority. | `dev-todos/_complete/2026-0214-p4-p6-pass-confirmation.md` (repo state: missing) |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Baseline lock: a reproducible baseline benchmark exists with raw logs and summary metrics.
2. Caching lock: ON/OFF caching benchmarks are recorded and rollback control is verified.
3. Parity lock: material mismatch counts are explicitly measured and documented.
4. Batching lock: batching benchmarks show deterministic mapping with no correctness violations.
5. Policy-control lock: optimization controls are snapshot-driven and policy audit visibility is verified.
6. Evidence lock: closure artifact links benchmark logs, specs, and runtime control artifacts.
7. Final-output lock: `dev-todos/_complete/2026-0214-p4-p6-pass-confirmation.md` exists with binary pass/fail outcomes.
