# 2026-0213-1710-enforce-config-source-authority-contract

filename (UID): `2026-0213-1710-enforce-config-source-authority-contract.md`  
problem: Configuration truth is split across superseded documents, migrations, runtime code, and decision-log statuses, so teams can apply conflicting defaults and precedence assumptions.  
solution: Implement one enforceable source-authority contract, align baseline defaults and decision statuses to that contract, and add merge-time guardrails that require evidence-backed config changes.  
scope: config authority ordering, decision-log status normalization, runtime baseline reconciliation, legacy-doc labeling, and reproducible evidence artifacts.

## Included Implementation Rules

1. Configuration behavior authority order is fixed: implemented artifacts (migrations/runtime/completion evidence) -> implemented decision entries -> proposed entries -> historical references.
2. Proposed entries cannot be treated as current runtime truth.
3. Every config-default change requires authority citations, precedence statement, and migration/runtime/UI alignment proof.
4. Legacy documents can remain for context but must be explicitly labeled as historical when values are no longer authoritative.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Create the missing canonical authority contract artifact and make the superseded-pointer path valid by publishing one canonical source-authority document that defines tier order, terminology, and allowed evidence types, then update this source document reference path so it resolves to a real file in the current repo layout. | New `dev-todos/specs/0213-canonical-spec-authority-contract.md` plus corrected reference in `dev-todos/specs/0213-config-source-authority-reconciliation.md` (repo state before action: superseded path `dev-todos/plans/0213-canonical-spec-authority-contract.md` is missing). |
| 2 | Normalize decision-log authority signals by updating config decision entries (including `CFG-004`) to explicit implemented/proposed state, with status definitions that match runtime behavior and migration state, so decisions can be programmatically interpreted during review. | Updated `dev-todos/specs/0213-config-decision-log.md` with explicit status normalization and `CFG-004` resolution note (repo state before action: source doc points to outdated `dev-todos/config-decision-log.md` path). |
| 3 | Reconcile runtime baseline values against canonical authority by validating `models.platform_default_max_tokens` and related fallback semantics across migrations and runtime code, then documenting the final authoritative baseline and fallback behavior in one evidence note. | Reconciliation artifact `dev-todos/_complete/2026-0213-config-baseline-authority-reconciliation.md` with citations to `supabase/migrations/20260212114500_018_admin_runtime_policy_controls.sql`, `supabase/migrations/20260213204000_024_default_max_tokens_4096.sql`, and `supabase/functions/runs/index.ts` (repo state before action: conflicting historical references still exist). |
| 4 | Add merge guardrails for config changes by introducing a required config-change evidence template (authority citations + precedence statement + alignment proof + done-log/changelog line) and integrating it into repo documentation so config PRs cannot claim behavior changes without traceable authority. | New `dev-todos/specs/config-change-evidence-template.md` and update to contributor/review guidance docs that enforce the template for config changes (repo state before action: guardrail is described but not implemented as a reusable artifact). |
| 5 | Execute a legacy-doc hygiene pass that labels superseded 0209/0210-era config baselines as historical where still present, and records missing/moved historical paths so future reviewers do not treat absent legacy files as active authority. | Updated historical docs under `dev-todos/specs/` (or explicit missing-path registry) plus `dev-todos/_complete/2026-0213-config-doc-hygiene-pass.md` (repo state before action: several referenced legacy paths no longer exist under prior locations). |
| 6 | Publish final authority closure evidence proving that all open resolution items in the source document are closed with binary outcomes and that config reviews can now deterministically identify source-of-truth. | `dev-todos/_complete/2026-0213-config-source-authority-closure.md` with binary pass/fail for baseline confirmation, `CFG-004` status, and historical-labeling completion. |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Authority-contract lock: canonical authority-contract document exists and superseded references resolve.
2. Decision-status lock: `CFG-004` and related config entries are explicitly statused and consistent with runtime evidence.
3. Baseline lock: platform default token baseline is reconciled across migrations/runtime and documented.
4. Guardrail lock: reusable config-change evidence template is published and referenced in review workflow.
5. Hygiene lock: historical baseline labels (or explicit missing-path registry) are completed for legacy references.
6. Final-output lock: closure artifact exists with binary outcomes for all open resolutions.

