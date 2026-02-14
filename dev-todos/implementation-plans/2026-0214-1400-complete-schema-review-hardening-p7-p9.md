# 2026-0214-1400-complete-schema-review-hardening-p7-p9

filename (UID): `2026-0214-1400-complete-schema-review-hardening-p7-p9.md`
problem: P7-P9 remain the release-critical tail and can stall because schema UX closure, review/export lifecycle closure, and hardening/ops baseline closure are tracked across mixed notes.
solution: Execute P7-P9 as one implementation chain that closes schema workflow gaps, validates review/export behavior, completes hardening checks, and produces a final assistant activation decision artifact.
scope: Schema core workflow completion, review/export lifecycle closure, hardening + ops baseline, and assistant activation decision for P7-P9.

## Included Implementation Rules

1. P8 cannot begin until P7 is passed; P9 cannot begin until P8 is passed.
2. Wizard-first schema flow must preserve worker/grid contract compatibility (`properties`, `prompt_config`).
3. Conflict behavior must include deterministic `409` handling and recovery path evidence.
4. Review/export behavior must be validated for both project-level and document-level flows.
5. Hardening baseline must include automated high-risk checks, failure runbook coverage, and security/RLS/CI verification.
6. Assistant activation decision is allowed only after P1-P9 evidence indicates no unresolved critical blockers.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Close remaining wizard-first schema workflow gaps (including required path coverage, save/fork behavior, and worker/grid contract compatibility checks) and record exact implementation references used for closure. | Updated schema implementation files under `web/src/` and status update in `dev-todos/action-plans/meta-configurator-integration/status.md` (repo state: status file exists; closure evidence update required) |
| 2 | Execute reproducible conflict-path verification for schema save conflict (`409`) including recovery steps, command/test evidence, and expected UI/API outcomes. | `dev-todos/_complete/2026-0214-schema-conflict-path-verification.md` (repo state: missing) |
| 3 | Complete staged-vs-confirmed review and export lifecycle verification for project-level and document-level flows, and publish pass/fail outcomes with known-limit callouts. | `dev-todos/_complete/2026-0214-review-export-lifecycle-verification.md` (repo state: missing) |
| 4 | Implement or re-run hardening baseline checks (high-risk automated tests, failure-signature runbooks, RLS/security/CI checks) and record deterministic evidence outputs. | `dev-todos/_complete/2026-0214-hardening-ops-baseline-verification.md` (repo state: missing) |
| 5 | Update canonical priority tracker states for P7-P9 only after Actions 1-4 evidence exists, and record blockers inline if any pass criterion remains unmet. | Updated `dev-todos/action-plans/0211-core-priority-queue-and-optimization-plan.md` P7-P9 gate rows (repo state: file exists) |
| 6 | Produce final assistant activation decision artifact using completed P1-P9 evidence and unresolved critical blocker count as the only decision inputs. | `dev-todos/_complete/2026-0214-assistant-activation-decision.md` (repo state: missing) |

## Completion Logic

This plan is complete only when all conditions below are true:

1. P7 lock: schema core workflow closure evidence exists and contract compatibility checks pass.
2. Conflict lock: conflict-path verification file exists and demonstrates deterministic `409` handling with recovery.
3. P8 lock: review/export lifecycle verification exists for both project-level and document-level paths.
4. P9 lock: hardening/ops baseline verification exists with test, runbook, and security/RLS/CI evidence.
5. Tracker lock: canonical priority tracker reflects P7-P9 outcomes that match evidence files.
6. Decision lock: assistant activation artifact is based on evidence-only pass/fail and blocker counts.
7. Final-output lock: `dev-todos/_complete/2026-0214-assistant-activation-decision.md` exists with explicit go/no-go result.
