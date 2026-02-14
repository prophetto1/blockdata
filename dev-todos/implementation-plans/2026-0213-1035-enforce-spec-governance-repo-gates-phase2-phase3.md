# 2026-0213-1035-enforce-spec-governance-repo-gates-phase2-phase3

filename (UID): `2026-0213-1035-enforce-spec-governance-repo-gates-phase2-phase3.md`
problem: Phase 2 and Phase 3 enforcement controls are not active in repo merge paths, so governance drift can bypass local checks.
solution: Implement mandatory repo enforcement through hooks, CI gates, owner approval controls, drift checks, and hard verification minima with reproducible merge-path evidence.
scope: Spec enforcement Phase 2 and Phase 3 delivery only.

## Included Implementation Rules

1. Local hooks run fast deterministic checks on commit and push through `.githooks`.
2. CI hard gate `spec-gate` is required for merge.
3. Governance path changes require CODEOWNERS approval and PR gate summary disclosure.
4. DriftGate must block changes when source anchors drift without RTM revalidation.
5. High-risk contract types (`edge_endpoint`, `rpc`, `migration/table/index/rls/grant`) require strict verification minima before `Verified`.
6. Compliance outputs must be stored as deterministic report artifacts per run.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Add local hook scripts and configure them to run fast deterministic governance checks before commit and push, including failure-mode output that tells contributors which gate failed. | `.githooks/pre-commit` and `.githooks/pre-push` (repo state: missing) |
| 2 | Add CI workflow `.github/workflows/spec-gate.yml` that runs full compile and gate validation on pull requests and fails workflow status when any required gate fails. | `.github/workflows/spec-gate.yml` (repo state: missing) |
| 3 | Add governance ownership and disclosure controls by creating `.github/CODEOWNERS` entries for `spec-governance/**` and generated spec outputs, plus a PR template section requiring gate summary and evidence links. | `.github/CODEOWNERS` and `.github/pull_request_template.md` (repo state: CODEOWNERS missing; PR template currently unspecified) |
| 4 | Extend gate implementation to include DriftGate and contract-type verification minima for high-risk types, and emit machine-readable failure details into report output. | Updated `spec-governance/scripts/spec-gate.ps1` and `spec-governance/out/report.json` schema including drift/minima failures (repo state: gate script missing) |
| 5 | Execute failing and passing enforcement simulations across local hooks and CI path, then publish an evidence record showing merge-blocking behavior, owner-approval enforcement, and drift/minima failure cases. | `dev-todos/_complete/2026-0213-spec-enforcement-phase2-3-evidence.md` (repo state: missing) |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Hook lock: pre-commit and pre-push hooks run deterministic enforcement checks and fail on violations.
2. CI lock: pull requests run `spec-gate` and cannot pass with gate violations.
3. Ownership lock: governance-file changes require CODEOWNERS review before merge.
4. Drift lock: anchor drift is detected and blocks pass status until RTM revalidation.
5. Verification-minima lock: high-risk contract types cannot pass verification without required evidence fields.
6. Evidence lock: enforcement simulation evidence file exists with both failing and passing cases captured.
7. Final-output lock: Phase 2+3 evidence confirms merge-blocking behavior is active and reproducible.
