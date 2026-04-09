# Husky Hooks Implementation Plan

**Goal:** Adopt Husky as the repo-local hook runner, migrate the existing unmanaged `pre-push` TypeScript gate into checked-in hooks, and implement a path-scoped hook system that covers the 10 priority operational/development seams plus the foundational hygiene guards this repo now requires.

**Architecture:** Keep Husky owned at the repo root through the npm workspace root, use `.husky/` as the checked-in entrypoint surface, and route all non-trivial logic through Node helper scripts under `scripts/husky/` and `scripts/repo-hygiene/`. Keep fast deterministic checks in `pre-commit`, medium/heavier path-scoped suites in `pre-push`, and leave Docker-backed Supabase replay and deploy behavior in CI.

**Tech Stack:** Husky, npm workspaces, POSIX shell hook entrypoints, Node.js helper scripts, existing Vitest suites, existing pytest suites, existing Supabase workflow guardrail tests, PowerShell bootstrap/dev-control scripts.

**Status:** Draft
**Author:** Codex
**Date:** 2026-04-07

**Primary requirement sources:** `docs/plans/common/hooks-implementation/top-areas-for-hooks.md`, `jon/2026-04-07-planner-handoff-checklist-for-husky-backend-contract.md`, `package.json`, `.github/workflows/supabase-db-validate.yml`, `.github/workflows/migration-history-hygiene.yml`, `I:\hook-systems\husky\docs\index.md`, `I:\hook-systems\husky\docs\how-to.md`

## Evaluation Findings Addressed In This Revision

This revision is a targeted structural rewrite responding to the pre-implementation evaluation findings.

1. The hardcoded-path policy now locks the exact blocking scope, the exact review-only scope, and the exact machine-specific doc exception list instead of leaving those choices to implementation.
2. The protected-push policy now locks the exact protected branch set and the exact remote-ref patterns that must block locally.
3. The secret-scan policy now locks the exact blocking classes, placeholder escapes, and the one permitted suppression mechanism.
4. Runtime cost guidance is now numeric and stage-specific rather than qualitative.
5. The zero-cases for Platform API and edge functions are now backed by explicit route and function inventories.
6. The execution section is now split into smaller tasks so no task still hides multiple large design decisions.

## Source Of Truth

1. `docs/plans/common/hooks-implementation/top-areas-for-hooks.md` is the priority source for the 10 domain-specific hook families this repo most needs.
2. `jon/2026-04-07-planner-handoff-checklist-for-husky-backend-contract.md` is the backend-contract and path-portability planning source.
3. `package.json`, `web/package.json`, `.github/workflows/supabase-db-validate.yml`, `.github/workflows/migration-history-hygiene.yml`, and `.github/workflows/deploy-edge-functions.yml` define the existing command and CI guardrail reality that local hooks must mirror or intentionally leave CI-only.
4. Husky is the selected hook runner because it uses `core.hooksPath`, supports Windows/macOS/Linux, and fits this repo’s root npm workspace model without keeping logic trapped in unmanaged `.git/hooks/`.

## Revalidated Current State

1. The repo root is already the correct installation surface for Husky because `package.json` is the npm workspace root for `web` and `web-docs`, but there is currently no `prepare` script and no Husky dependency.
2. There is already one unmanaged local hook at `.git/hooks/pre-push` that runs `cd "$(git rev-parse --show-toplevel)/web"` followed by `npx tsc -b --noEmit`. That behavior must survive migration into `.husky/pre-push`.
3. Supabase validation is already encoded in CI through `npm run test:workflow-guardrails`, `npm run test:supabase-extension-replay-guardrails`, and `npm run test:supabase-migration-reconciliation-contract`, while `supabase db start` and `supabase db reset` remain CI-owned because they require local Supabase runtime and Docker.
4. Platform API bootstrap/dev recovery already has contract tests in `services/platform-api/tests/test_dev_bootstrap_contract.py` and `services/platform-api/tests/test_procfile_startup.py`.
5. Telemetry truthfulness already has backend verification in `services/platform-api/tests/test_observability.py` and `services/platform-api/tests/test_observability_contract.py`; `web/src/pages/ObservabilityTelemetry.tsx` already has a direct test at `web/src/pages/ObservabilityTelemetry.test.tsx`, while `web/src/pages/ObservabilityTraces.tsx` still needs direct frontend coverage.
6. The top-priority frontend/backend seams already have substantial regression coverage:
   - readiness: `web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx`, `web/src/hooks/useOperationalReadiness.test.tsx`, `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`, `services/platform-api/tests/test_runtime_readiness_service.py`, `services/platform-api/tests/test_admin_runtime_readiness_routes.py`
   - bucket CORS/browser upload: `web/src/lib/storageUploadService.test.ts`, `services/platform-api/tests/test_runtime_action_service.py`, `services/platform-api/tests/test_storage_routes.py`
   - pipeline/index builder: `web/src/pages/PipelineServicesPage.test.tsx`, `web/src/pages/IndexBuilderPage.test.tsx`, `web/src/hooks/useIndexBuilderJob.test.ts`, `web/src/hooks/usePipelineSourceSet.test.ts`, `web/src/components/pipelines/PipelineCatalogPanel.test.tsx`, `services/platform-api/tests/test_pipelines_routes.py`
   - shared selector: `web/src/components/shell/ProjectSwitcher.test.tsx`, `web/src/components/shell/ProjectFocusSelectorPopover.test.tsx`, `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`, `web/src/components/layout/AgchainShellLayout.test.tsx`, `web/src/components/shell/TopCommandBar.test.tsx`
   - AGChain focus sync: `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx`, `web/src/lib/agchainProjectFocus.test.ts`, `web/src/components/agchain/AgchainWorkspaceSync.test.tsx`, `web/src/pages/agchain/AgchainProjectsPage.test.tsx`, `web/src/pages/agchain/AgchainOverviewPage.test.tsx`
   - AGChain provider/model surfaces: `services/platform-api/tests/test_agchain_model_providers.py`, `services/platform-api/tests/test_agchain_models.py`, `web/src/pages/agchain/AgchainModelsPage.test.tsx`, `web/src/components/agchain/models/AgchainProviderCredentialModal.test.tsx`, `web/src/components/agchain/models/AgchainProviderCredentialsTable.test.tsx`
7. Five frontend verification seams are in scope for this Husky rollout so the hook families have real commands to run:
   - modified existing coverage: `web/src/pages/ObservabilityTelemetry.test.tsx`
   - new coverage: `web/src/pages/ObservabilityTraces.test.tsx`
   - new coverage: `web/src/hooks/useIndexBuilderList.test.ts`
   - new coverage: `web/src/pages/agchain/AgchainAiProvidersPage.test.tsx`
   - new coverage: `web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.test.tsx`
8. `scripts/path-normalizer/normalize-hardcoded-paths.mjs` now works better than before, but its repo-wide report still over-reports doc/provenance paths. Phase 1 Husky blocking must therefore target code/config/scripts first and treat approved operational-doc exceptions as review-only.
9. Edge functions are real repo assets under `supabase/functions/`, but local deploy/validation is still CI-owned by `.github/workflows/deploy-edge-functions.yml`. There is no cheap existing local edge-function hook command that matches the current efficiency target, so edge-function local enforcement is an explicit phase-1 zero-case.
10. The current protected branch set is backed by repo evidence: the local branch inventory shows only `master`, and `.github/workflows/supabase-db-deploy.yml` deploys production migrations only from pushes to `master`.

### Platform API

No platform API endpoints are added, modified, or consumed as runtime contract changes in this plan.

Hooks in this plan may invoke existing platform API tests, but that is verification-only reuse of the current backend surface, not an API change.

Locked route inventory backing that zero-case:

- `admin_config_docling.py`
- `admin_runtime_readiness.py`
- `admin_services.py`
- `admin_storage.py`
- `agchain_benchmarks.py`
- `agchain_datasets.py`
- `agchain_models.py`
- `agchain_operations.py`
- `agchain_organization_model_providers.py`
- `agchain_project_model_providers.py`
- `agchain_settings.py`
- `agchain_tools.py`
- `agchain_workspaces.py`
- `auth_access.py`
- `auth_oauth.py`
- `connections.py`
- `conversion.py`
- `crews.py`
- `embeddings.py`
- `functions.py`
- `health.py`
- `jobs.py`
- `load_runs.py`
- `parse.py`
- `pipelines.py`
- `plugin_execution.py`
- `secrets.py`
- `storage.py`
- `telemetry.py`
- `variables.py`

Sensitive route groups the local hook families may verify against, but must not redesign:

- readiness/admin: `admin_runtime_readiness.py`
- storage/browser upload: `storage.py`, `admin_storage.py`
- telemetry: `telemetry.py`
- pipelines: `pipelines.py`
- AGChain provider/model surfaces: `agchain_models.py`, `agchain_organization_model_providers.py`, `agchain_project_model_providers.py`

### Observability

No new OpenTelemetry spans, metrics, logs, exporters, or runtime instrumentation are added.

Justification: this is repo-local workflow enforcement, not a runtime observability feature. The only telemetry-related work in scope is protecting existing telemetry truthfulness through tests and page coverage.

### Database Migrations

No database migrations.

Justification: local hooks should enforce existing migration invariants, not create new schema or migration behavior.

### Edge Functions

No edge functions are created or modified.

Phase-1 zero-case: edge-function deploy remains CI-owned and no new local edge-function hook is introduced until there is a cheap deterministic local validation command worth running pre-push.

Locked edge-function inventory backing that zero-case:

- `admin-config`
- `admin-database-browser`
- `admin-integration-catalog`
- `admin-services`
- `agent-config`
- `assistant-chat`
- `conversion-complete`
- `dropbox-import`
- `export-jsonl`
- `extract-readiness`
- `flows`
- `generate-citations`
- `google-drive-import`
- `ingest`
- `kestra-flows`
- `manage-document`
- `manage-overlays`
- `parse-profile-readiness`
- `provider-connections`
- `runs`
- `schemas`
- `test-api-key`
- `trigger-parse`
- `upload-policy`
- `user-api-keys`
- `worker`

Support entries intentionally excluded from the phase-1 deployable-function count:

- `_shared`
- `README.md`

### Frontend Surface Area

No new user-visible pages, routes, components, hooks, or services are added.

Verification-only frontend additions in scope:

| Type | Count | Files |
| --- | --- | --- |
| New frontend test modules | `4` | `web/src/pages/ObservabilityTraces.test.tsx`, `web/src/hooks/useIndexBuilderList.test.ts`, `web/src/pages/agchain/AgchainAiProvidersPage.test.tsx`, `web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.test.tsx` |
| Modified frontend test modules | `1` | `web/src/pages/ObservabilityTelemetry.test.tsx` |

### Frontend Implications Of This Hook Rollout

1. There are no new frontend product features, but frontend developers will experience new local enforcement whenever they change shell, observability, pipeline, index-builder, AGChain provider, or readiness files.
2. The rollout intentionally adds frontend test coverage only where the current plan depends on that coverage for honest hook enforcement; it does not authorize visual redesign or new route behavior.
3. Frontend markdown/docs are review-only for hardcoded-path enforcement in phase 1 unless they are one of the explicit machine-specific operational doc exceptions locked below.
4. The highest-friction frontend families are expected to be the selector, Index Builder, and AGChain provider/model surfaces, so their hook tasks are split into separate execution units rather than bundled into one large implementation block.

## Pre-Implementation Contract

No major hook-stage, path-scope, hardcoded-path-policy, or runtime-cost decision may be improvised during implementation. If the hook runner, blocking rules, or CI-vs-local split changes materially, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. Husky is the repo-local hook runner for this rollout. Raw unmanaged `.git/hooks/`, Atlas, `pre-commit`, and Lefthook are out of scope for implementation.
2. The repo root `package.json` owns Husky installation through `prepare` because the root is the canonical npm workspace boundary.
3. The current unmanaged `.git/hooks/pre-push` TypeScript gate is migrated into `.husky/pre-push` with behavior preserved before any new heavy hook families are layered on top.
4. Hook logic lives in checked-in Node helpers under `scripts/husky/` and `scripts/repo-hygiene/`; the shell files in `.husky/` stay thin.
5. The hook system is path-scoped. It must not devolve into “run everything on every push.”
6. `pre-commit` is reserved for fast deterministic checks that do not require Docker, local Supabase startup, or broad test-suite fanout.
7. `pre-push` is the highest local cost stage in scope. It may run targeted Vitest/pytest suites and existing Node workflow guardrail tests, but it must not run `supabase db start`, `supabase db reset`, or any deploy command.
8. Hardcoded path enforcement in the first rollout blocks new machine-specific absolute paths in code, config, scripts, and hook files. Intentional machine-specific operational docs are allowed only through an explicit exception list owned by a checked-in policy module.
9. `desktop.ini` cleanup must include both the work tree and the Git metadata directory, because `.git` pollution is part of the actual failure mode this repo has already experienced.
10. The 10 hook priorities from `docs/plans/common/hooks-implementation/top-areas-for-hooks.md` remain the domain-specific source of truth. This plan adds the foundational hygiene/guard layers needed to make those 10 practical.
11. Tool-generated Husky bootstrap files under `.husky/_/**` are allowed but are not part of the human-authored locked inventory; the plan locks only the authored entrypoints and scripts.
12. Edge-function local enforcement remains a zero-case in phase 1. CI deploy remains the safety net for that surface.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. `npm install` or `npm run prepare` at the repo root installs Husky and `git config --get core.hooksPath` returns `.husky`.
2. The old unmanaged `web` TypeScript `pre-push` guard now runs from `.husky/pre-push` and still blocks pushes on type errors.
3. `desktop.ini` pollution is cleaned automatically by checked-in hooks on `pre-commit`, `post-checkout`, `post-merge`, and `post-rewrite`.
4. New machine-specific hardcoded paths in blocking-scope files are blocked locally, while only the two explicit doc/runbook exceptions locked in this plan remain review-only.
5. Secret leakage patterns and protected-push rules are enforced locally according to the exact `Secret Scan Contract` and `Protected Push Contract` in this document.
6. The 10 priority hook families from `top-areas-for-hooks.md` are implemented as real path-scoped hook groups with exact watch paths and exact commands.
7. The five currently missing frontend test modules named in this plan exist and are wired into the relevant hook groups.
8. Supabase migration/workflow changes trigger the three existing Node guardrail suites locally, while `supabase db start` and `supabase db reset` remain CI-only.
9. End-to-end verification proves that each authored hook entrypoint runs, the routing script chooses the expected groups for representative path changes, and the documented bypass/CI behavior is honest.

### Locked Platform API Surface

No platform API contract changes.

Verification-only backend suites reused by hooks:

1. `cd services/platform-api && pytest -q tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py`
2. `cd services/platform-api && pytest -q tests/test_runtime_action_service.py tests/test_storage_routes.py`
3. `cd services/platform-api && pytest -q tests/test_dev_bootstrap_contract.py tests/test_procfile_startup.py`
4. `cd services/platform-api && pytest -q tests/test_observability.py tests/test_observability_contract.py`
5. `cd services/platform-api && pytest -q tests/test_pipelines_routes.py`
6. `cd services/platform-api && pytest -q tests/test_agchain_model_providers.py tests/test_agchain_models.py`

### Locked Observability Surface

No new traces, metrics, or logs are added.

Allowed hook output:

- Hook group names selected for the current change set
- Files/path groups matched
- Commands executed
- Exit codes and concise failure summaries

Forbidden scope creep:

- No OpenTelemetry instrumentation additions
- No exporter or sink changes
- No local hook analytics/telemetry system

### Locked Hook Surface

#### Authored Husky entrypoints

1. `.husky/pre-commit`
2. `.husky/pre-push`
3. `.husky/post-checkout`
4. `.husky/post-merge`
5. `.husky/post-rewrite`

#### Locked hook families

| Family | Hook stage | Changed-path scope | Command contract |
| --- | --- | --- | --- |
| Repo metadata cleanup | `pre-commit`, `post-checkout`, `post-merge`, `post-rewrite` | any repo touch | `node scripts/repo-hygiene/remove-desktop-ini.mjs --write` |
| Hardcoded path prohibition | `pre-commit` | staged blocking-scope files plus review-only doc classes | `node scripts/husky/check-hardcoded-paths.mjs --staged` |
| Secret leakage scan | `pre-commit` | staged files | `node scripts/husky/check-secrets.mjs --staged` on added lines only |
| Frontend build-safety foundation | `pre-commit` and `pre-push` | `web/**` | `cd web && npx eslint <changed-web-files>` on `pre-commit`; `cd web && npx tsc -b --noEmit` on `pre-push` |
| Protected push / unsafe push | `pre-push` | any push | `node scripts/husky/check-protected-push.mjs` blocks direct updates to `refs/heads/master` and remote deletes |
| Supabase migration history + linked-dev schema parity | `pre-push` | `supabase/migrations/**`, `supabase/seed.sql`, `supabase/config.toml`, `.github/workflows/supabase-db-validate.yml`, `.github/workflows/supabase-db-deploy.yml`, `.github/workflows/migration-history-hygiene.yml`, `scripts/tests/supabase-*.test.mjs`, `package.json` | `npm run test:workflow-guardrails && npm run test:supabase-extension-replay-guardrails && npm run test:supabase-migration-reconciliation-contract` |
| Superuser Operational Readiness contract | `pre-push` | `services/platform-api/app/api/routes/admin_runtime_readiness.py`, `services/platform-api/app/services/runtime_readiness.py`, `services/platform-api/app/observability/runtime_readiness_metrics.py`, `web/src/lib/operationalReadiness.ts`, `web/src/hooks/useOperationalReadiness.ts`, `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`, `web/src/pages/superuser/SuperuserOperationalReadiness.tsx` | `cd services/platform-api && pytest -q tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py` and `cd web && npm run test -- src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/hooks/useOperationalReadiness.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx` |
| BlockData browser-upload / GCS / bucket-CORS seams | `pre-push` | `ops/gcs/user-storage-cors.json`, `services/platform-api/app/services/runtime_action_service.py`, `services/platform-api/app/api/routes/storage.py`, `services/platform-api/app/services/runtime_readiness.py`, `web/src/lib/storageUploadService.ts`, `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`, `web/src/pages/superuser/SuperuserOperationalReadiness.tsx` | `cd services/platform-api && pytest -q tests/test_runtime_action_service.py tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py tests/test_storage_routes.py` and `cd web && npm run test -- src/lib/storageUploadService.test.ts src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx` |
| Local platform-api bootstrap + dev recovery tooling | `pre-push` | `scripts/start-platform-api.ps1`, `scripts/platform-api-dev-control.ps1`, `package.json` platform-api scripts, `services/platform-api/start-dev.sh` | `cd services/platform-api && pytest -q tests/test_dev_bootstrap_contract.py tests/test_procfile_startup.py` |
| Telemetry truthfulness / observability status | `pre-push` | `services/platform-api/app/api/routes/telemetry.py`, `services/platform-api/app/observability/**`, `services/platform-api/OBSERVABILITY.md`, `web/src/pages/ObservabilityTelemetry.tsx`, `web/src/pages/ObservabilityTraces.tsx` | `cd services/platform-api && pytest -q tests/test_observability.py tests/test_observability_contract.py` and `cd web && npm run test -- src/pages/ObservabilityTelemetry.test.tsx src/pages/ObservabilityTraces.test.tsx` |
| Pipeline Services operational proof | `pre-push` | `services/platform-api/app/api/routes/pipelines.py`, `services/platform-api/app/services/pipeline_storage.py`, `services/platform-api/app/workers/pipeline_jobs.py`, `web/src/pages/PipelineServicesPage.tsx`, `web/src/components/pipelines/PipelineCatalogPanel.tsx` | `cd services/platform-api && pytest -q tests/test_pipelines_routes.py` and `cd web && npm run test -- src/pages/PipelineServicesPage.test.tsx src/components/pipelines/PipelineCatalogPanel.test.tsx` |
| Index Builder one-page workbench integrity | `pre-push` | `web/src/pages/IndexBuilderPage.tsx`, `web/src/hooks/useIndexBuilderJob.ts`, `web/src/hooks/usePipelineSourceSet.ts`, `web/src/hooks/useIndexBuilderList.ts`, `web/src/components/pipelines/IndexBuilderHeader.tsx` | `cd web && npm run test -- src/pages/IndexBuilderPage.test.tsx src/hooks/useIndexBuilderJob.test.ts src/hooks/usePipelineSourceSet.test.ts src/hooks/useIndexBuilderList.test.ts` |
| Shared selector contract across BlockData and AGChain | `pre-push` | `web/src/components/shell/ProjectSwitcher.tsx`, `web/src/components/shell/ProjectFocusSelectorPopover.tsx`, `web/src/components/shell/TopCommandBar.tsx`, `web/src/components/shell/TopCommandBar.css`, `web/src/components/agchain/AgchainProjectSwitcher.tsx`, `web/src/components/layout/AgchainShellLayout.tsx` | `cd web && npm run test -- src/components/shell/ProjectSwitcher.test.tsx src/components/shell/ProjectFocusSelectorPopover.test.tsx src/components/shell/TopCommandBar.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx src/components/layout/AgchainShellLayout.test.tsx` |
| AGChain focus-sync + registry/create flow | `pre-push` | `web/src/hooks/agchain/useAgchainProjectFocus.ts`, `web/src/lib/agchainProjectFocus.ts`, `web/src/components/agchain/AgchainWorkspaceSync.test.tsx`, `web/src/pages/agchain/AgchainProjectsPage.tsx`, `web/src/pages/agchain/AgchainOverviewPage.tsx` | `cd web && npm run test -- src/hooks/agchain/useAgchainProjectFocus.test.tsx src/lib/agchainProjectFocus.test.ts src/components/agchain/AgchainWorkspaceSync.test.tsx src/pages/agchain/AgchainProjectsPage.test.tsx src/pages/agchain/AgchainOverviewPage.test.tsx` |
| AGChain provider credentials + org/project/admin model-surface split | `pre-push` | `services/platform-api/app/api/routes/agchain_models.py`, `services/platform-api/app/api/routes/agchain_organization_model_providers.py`, `services/platform-api/app/api/routes/agchain_project_model_providers.py`, `services/platform-api/app/domain/agchain/provider_registry.py`, `services/platform-api/app/domain/agchain/provider_credentials.py`, `web/src/pages/agchain/AgchainModelsPage.tsx`, `web/src/pages/agchain/AgchainAiProvidersPage.tsx`, `web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.tsx`, `web/src/components/agchain/models/**` | `cd services/platform-api && pytest -q tests/test_agchain_model_providers.py tests/test_agchain_models.py` and `cd web && npm run test -- src/pages/agchain/AgchainModelsPage.test.tsx src/pages/agchain/AgchainAiProvidersPage.test.tsx src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.test.tsx src/components/agchain/models/AgchainProviderCredentialModal.test.tsx src/components/agchain/models/AgchainProviderCredentialsTable.test.tsx src/pages/agchain/AgchainPageArchitecture.test.ts` |

### Locked Inventory Counts

#### Repo automation

- New authored Husky entrypoint files: `5`
- New repo helper scripts: `8`
- New repo helper test modules: `5`
- Modified repo config/docs files: `2`

#### Frontend verification

- New frontend regression test modules: `4`
- Modified frontend regression test modules: `1`
- Modified frontend product pages/components/hooks/services: `0`

#### Backend/runtime

- New platform API files: `0`
- Modified platform API files: `0`
- New migrations: `0`
- New edge functions: `0`

### Locked File Inventory

#### New files

1. `.husky/pre-commit`
2. `.husky/pre-push`
3. `.husky/post-checkout`
4. `.husky/post-merge`
5. `.husky/post-rewrite`
6. `scripts/repo-hygiene/remove-desktop-ini.mjs`
7. `scripts/husky/changed-files.mjs`
8. `scripts/husky/hook-groups.mjs`
9. `scripts/husky/hook-runner.mjs`
10. `scripts/husky/path-policy.mjs`
11. `scripts/husky/check-hardcoded-paths.mjs`
12. `scripts/husky/check-secrets.mjs`
13. `scripts/husky/check-protected-push.mjs`
14. `scripts/tests/remove-desktop-ini.test.mjs`
15. `scripts/tests/husky-hook-routing.test.mjs`
16. `scripts/tests/husky-hardcoded-paths.test.mjs`
17. `scripts/tests/husky-secret-scan.test.mjs`
18. `scripts/tests/husky-protected-push.test.mjs`
19. `web/src/pages/ObservabilityTraces.test.tsx`
20. `web/src/hooks/useIndexBuilderList.test.ts`
21. `web/src/pages/agchain/AgchainAiProvidersPage.test.tsx`
22. `web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.test.tsx`

#### Modified files

1. `package.json`
2. `__start-here/2026-04-07-dual-pc-setup-internal-readme.md`
3. `web/src/pages/ObservabilityTelemetry.test.tsx`

#### Tool-managed but intentionally unlocked

1. `.husky/_/**`

These files may be generated or refreshed by Husky itself after `prepare`. They are not the human-authored surface being locked by this plan.

## Frozen Hook Contracts

### Hook Runtime Budget Contract

| Stage or family class | Target runtime | Hard cap | Notes |
| --- | --- | --- | --- |
| metadata cleanup or protected-push guard | `<= 2s` | `5s` | Should feel instantaneous |
| staged hardcoded-path scan | `<= 5s` | `10s` | Blocking scope only; no repo-wide markdown walk |
| staged secret scan | `<= 5s` | `10s` | Added lines only |
| staged frontend lint family | `<= 15s` | `25s` | Changed `web/**` files only |
| total `pre-commit` hook time | `<= 25s` | `45s` | If a representative run exceeds the hard cap, implementation must stop and revise |
| migrated `web` TypeScript `pre-push` gate | `<= 45s` | `75s` | Existing local behavior must be preserved |
| one focused frontend or backend family suite | `<= 75s` | `120s` | Path-scoped suite only |
| Supabase guardrail trio | `<= 120s` | `180s` | Still local-safe because it does not start Docker |
| total `pre-push` hook time for one family | `<= 3m` | `5m` | Representative single-family run |
| total `pre-push` hook time for multi-family changes | `<= 6m` | `10m` | If normal developer workflows exceed the hard cap, revise the plan before continuing |

1. `pre-commit` must never depend on Docker, Supabase local startup, remote services, or full-repo fanout.
2. `pre-push` may be heavier than `pre-commit`, but it must remain path-scoped and deterministic.
3. `supabase db start`, `supabase db reset`, and any deploy command remain CI-only regardless of local machine health.

### Hardcoded Path Policy Contract

1. Blocking scope is limited to staged files in these classes: `.husky/**`, `scripts/**/*.mjs`, `scripts/**/*.js`, `scripts/**/*.ps1`, `scripts/**/*.sh`, `web/**/*.ts`, `web/**/*.tsx`, `services/platform-api/**/*.py`, `supabase/**/*.sql`, `*.json`, `*.toml`, `*.yml`, and `*.yaml`.
2. Review-only scope is limited to staged `*.md`, `*.mdx`, and `*.txt` files. Phase 1 may report those paths, but it must not fail the commit unless another blocking rule also fires.
3. Canonical allowed forms are repo-relative forward-slash paths and placeholder machine-path examples such as `/path/to/...`, `<repo-root>/...`, and empty env-var assignments in example files.
4. New absolute Windows machine paths are forbidden by default in blocking-scope files.
5. The exact machine-specific operational doc exception list is:
   - `__start-here/2026-04-07-dual-pc-setup-internal-readme.md`
   - `docs/sessions/0407/ai-tool-directory-inventory.md`
6. Those two files may document real local machine paths, interpreter paths, synced-drive paths, and tool-install paths because they are operational inventory/runbook artifacts. No other file may introduce new machine-specific absolute paths without a plan revision first.
7. `scripts/husky/path-policy.mjs` must encode this contract exactly; implementation may not widen the exception set on its own.
8. The first Husky rollout must not use the current noisy full audit report as a blind blocking document for all Markdown; it must use changed-file classification plus the exact exception list above.

### Protected Push Contract

1. The protected branch set for phase 1 is exactly one remote ref: `refs/heads/master`.
2. `scripts/husky/check-protected-push.mjs` must block any push update whose remote target is `refs/heads/master`, including `HEAD:master`, `local-branch:master`, and `master:master`.
3. It must also block any remote delete operation for branches or tags, because those are high-blast-radius push actions that do not belong in routine local workflow.
4. The phase-1 hook does not need to infer CLI flags that Git does not expose cleanly to `pre-push`; the mandatory blocking scope is the exact remote-ref patterns above.

### Secret Scan Contract

1. The secret scanner runs on staged added lines only; it must not scan the whole repo.
2. The exact blocking classes for phase 1 are:
   - PEM or SSH private-key material such as `-----BEGIN ... PRIVATE KEY-----`
   - JSON or multiline credential blobs containing a real `private_key`
   - non-empty assignments to these known secret env vars: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AZURE_OPENAI_API_KEY`
   - token-like literals with these known prefixes when they are not obvious placeholders: `ghp_`, `github_pat_`, `sk-`, `xoxb-`, `AIza`
3. The exact allowed placeholder forms for examples and templates are: empty string values, `<...>` placeholders, `YOUR_*_HERE`, `changeme`, `example`, `fake`, `dummy`, `test`, and `/path/to/...`.
4. The only file-class exemption is example/template material such as `.env.example`, `*.example`, and `*.template`, and only when the value remains blank or placeholder-shaped.
5. The only explicit suppression mechanism allowed in phase 1 is a preceding-line comment containing exactly `husky: allow-secret-example`. That suppression is allowed only in docs, tests, and example/template artifacts, never in production code or runtime config.
6. There is no blanket exemption for docs, fixtures, or generated examples. Real secret material must still block if it appears there.

### CI Mirror Contract

1. Husky is a local fast-feedback layer, not the only enforcement layer.
2. The three existing Supabase workflow guardrail suites remain in CI even after local hooks are added.
3. Hook bypass remains possible with `--no-verify` or `HUSKY=0`, so CI must continue to prove the authoritative contract.

### Edge Function Contract

1. No edge-function deploy or runtime validation hook is added in phase 1.
2. Edge-function changes remain protected by CI until there is a cheap local command worthy of `pre-push`.

## Explicit Risks Accepted In This Plan

1. Husky is locally bypassable. This plan accepts that because CI remains the final authority.
2. The first hardcoded-path rollout intentionally avoids blocking every Markdown path mention because the current audit tooling still over-reports operational/provenance docs.
3. Multi-family changes may still make `pre-push` feel heavy; that is accepted as long as the runner stays path-scoped and avoids full-repo suites.
4. Windows GUI environments may require Husky startup-file notes if PATH resolution becomes a problem; this is documentation work, not a reason to keep unmanaged `.git/hooks/`.

## Completion Criteria

1. Husky is installed at the repo root and `core.hooksPath` resolves to `.husky`.
2. The migrated `.husky/pre-push` still enforces the old `web` TypeScript gate.
3. All 15 locked hook families are implemented with path-scoped routing.
4. The five locked missing frontend test files exist and are used by the correct hook groups.
5. The repo-local helper tests pass.
6. Representative manual checks prove `pre-commit`, `pre-push`, `post-checkout`, `post-merge`, and `post-rewrite` all execute the expected authored runner logic.
7. The local setup/readme documentation tells developers how Husky is installed, how to re-run `prepare`, and what remains CI-only.

## Implementation Tasks

Implementation should use `test-driven-development` for each new helper script, `systematic-debugging` for any failing command-routing or shell-environment issue, and `verification-before-completion` before any completion claim.

## Task 1: Install Husky at the repo root and create authored hook entrypoints

**File(s):** `package.json`, `.husky/pre-commit`, `.husky/pre-push`, `.husky/post-checkout`, `.husky/post-merge`, `.husky/post-rewrite`

**Step 1:** Add `husky` as a root devDependency and add a root `prepare` script that runs Husky from the repo root.
**Step 2:** Run the prepare/install flow once so `core.hooksPath` becomes `.husky`.
**Step 3:** Create thin hook entrypoints that forward to `node scripts/husky/hook-runner.mjs <hook-name>`.

**Test command:** `npm install && npm run prepare && git config --get core.hooksPath`
**Expected output:** Husky installs without error and `git config` returns exactly `.husky`.

**Commit:** `chore(husky): install husky and add hook entrypoints`

## Task 2: Add the shared change-detection and hook-group router

**File(s):** `scripts/husky/changed-files.mjs`, `scripts/husky/hook-groups.mjs`, `scripts/husky/hook-runner.mjs`, `scripts/tests/husky-hook-routing.test.mjs`

**Step 1:** Implement changed-file detection for staged changes on `pre-commit` and push-range changes on `pre-push`.
**Step 2:** Encode the 15 locked hook families as data in `hook-groups.mjs`, including stage, watched paths, and command arrays.
**Step 3:** Write routing tests that prove representative change sets activate the expected families and skip unrelated ones.

**Test command:** `node --test scripts/tests/husky-hook-routing.test.mjs`
**Expected output:** The Node test runner reports that staged-file and push-range examples select the correct hook groups.

**Commit:** `feat(husky): add path-scoped hook router`

## Task 3: Add repo metadata cleanup and wire it into the metadata hooks

**File(s):** `scripts/repo-hygiene/remove-desktop-ini.mjs`, `scripts/tests/remove-desktop-ini.test.mjs`, `.husky/pre-commit`, `.husky/post-checkout`, `.husky/post-merge`, `.husky/post-rewrite`

**Step 1:** Implement a cleanup CLI that removes `desktop.ini` from both the work tree and the resolved Git metadata directory.
**Step 2:** Cover the CLI with tests for work-tree and `.git` cleanup behavior.
**Step 3:** Call the cleanup CLI from the four metadata-sensitive hook stages.

**Test command:** `node --test scripts/tests/remove-desktop-ini.test.mjs`
**Expected output:** Tests prove `desktop.ini` is deleted from both work-tree and `.git` fixtures while non-matching files remain.

**Commit:** `feat(hygiene): add desktop.ini cleanup hooks`

## Task 4: Add hardcoded-path policy enforcement

**File(s):** `scripts/husky/path-policy.mjs`, `scripts/husky/check-hardcoded-paths.mjs`, `scripts/tests/husky-hardcoded-paths.test.mjs`

**Step 1:** Encode the canonical allowed-path policy and explicit operational-doc exception list in `path-policy.mjs`.
**Step 2:** Implement `check-hardcoded-paths.mjs` using the existing path-normalizer logic so staged code/config/scripts are blocking and approved doc exceptions are review-only.
**Step 3:** Add tests proving blocking behavior for code/config/scripts and non-blocking behavior for explicit doc exceptions.

**Test command:** `node --test scripts/tests/husky-hardcoded-paths.test.mjs`
**Expected output:** Tests show forbidden machine-local paths are blocked in code-like files and approved doc exceptions are surfaced according to policy.

**Commit:** `feat(husky): enforce hardcoded path policy`

## Task 5: Add the staged secret-scan guard

**File(s):** `scripts/husky/check-secrets.mjs`, `scripts/tests/husky-secret-scan.test.mjs`

**Step 1:** Implement the exact blocking rules, placeholder escapes, and suppression token locked in the `Secret Scan Contract`.
**Step 2:** Wire the secret scanner into the `pre-commit` hook family routing.
**Step 3:** Add focused tests that prove real secret material blocks and allowed placeholders stay non-blocking.

**Test command:** `node --test scripts/tests/husky-secret-scan.test.mjs`
**Expected output:** Tests prove PEM keys, real token-like values, and non-empty secret env-var assignments block while placeholder examples do not.

**Commit:** `feat(husky): add staged secret scan guard`

## Task 6: Add the protected-push guard

**File(s):** `scripts/husky/check-protected-push.mjs`, `scripts/tests/husky-protected-push.test.mjs`

**Step 1:** Implement `pre-push` stdin parsing so the guard sees local ref, local SHA, remote ref, and remote SHA for each push line.
**Step 2:** Enforce the exact `Protected Push Contract`: block updates to `refs/heads/master` and block remote delete operations.
**Step 3:** Add focused tests for direct `master` pushes, `HEAD:master`, allowed feature-branch pushes, and remote deletes.

**Test command:** `node --test scripts/tests/husky-protected-push.test.mjs`
**Expected output:** Tests prove direct `master` pushes and deletes block while normal feature-branch pushes pass.

**Commit:** `feat(husky): add protected push guard`

## Task 7: Migrate the frontend build-safety foundation

**File(s):** `.husky/pre-commit`, `.husky/pre-push`, `scripts/husky/hook-groups.mjs`

**Step 1:** Preserve the existing `web` TypeScript `pre-push` check exactly inside the routed Husky runner.
**Step 2:** Add the `web` lint family for changed frontend files at `pre-commit`.
**Step 3:** Verify unrelated changes do not trigger frontend lint or typecheck families.

**Test command:** `cd web && npm run lint && npx tsc -b --noEmit`
**Expected output:** Lint and typecheck complete successfully on a clean tree, and the routed hook groups only match when `web/**` changes are present.

**Commit:** `feat(husky): migrate frontend build safety gates`

## Task 8: Add the Supabase migration and parity hook family

**File(s):** `scripts/husky/hook-groups.mjs`

**Step 1:** Add the locked Supabase migration and workflow watch paths to the `pre-push` router.
**Step 2:** Wire those paths to the three existing Node workflow guardrail suites and keep Docker-backed Supabase replay out of local hooks.
**Step 3:** Verify that migration and workflow-only changes trigger the family while unrelated changes do not.

**Test command:** `npm run test:workflow-guardrails && npm run test:supabase-extension-replay-guardrails && npm run test:supabase-migration-reconciliation-contract`
**Expected output:** All three guardrail suites pass from the repo root.

**Commit:** `feat(husky): add supabase workflow guardrail family`

## Task 9: Add the Superuser Operational Readiness hook family

**File(s):** `scripts/husky/hook-groups.mjs`

**Step 1:** Add the locked readiness watch-path family and command pair.
**Step 2:** Verify the backend and frontend readiness suites run only for readiness-related changes.
**Step 3:** Confirm bucket-CORS or storage-only changes do not trigger the readiness family by themselves.

**Test command:** `cd services/platform-api && pytest -q tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py && cd ../../web && npm run test -- src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/hooks/useOperationalReadiness.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx`
**Expected output:** Readiness backend and frontend suites pass, and the router keeps this family separate from storage-specific checks.

**Commit:** `feat(husky): add readiness hook family`

## Task 10: Add the BlockData browser-upload and bucket-CORS hook family

**File(s):** `scripts/husky/hook-groups.mjs`

**Step 1:** Add the locked browser-upload, GCS, and bucket-CORS watch-path family and command pair.
**Step 2:** Verify that readiness-only changes do not unnecessarily fan out into the storage route set.
**Step 3:** Confirm the family still covers the shared readiness page when storage-related changes alter the operational diagnostics surface.

**Test command:** `cd services/platform-api && pytest -q tests/test_runtime_action_service.py tests/test_storage_routes.py tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py && cd ../../web && npm run test -- src/lib/storageUploadService.test.ts src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx`
**Expected output:** Backend storage and readiness suites pass together with the frontend upload and readiness coverage.

**Commit:** `feat(husky): add bucket cors hook family`

## Task 11: Add the local platform-api bootstrap and dev-recovery hook family

**File(s):** `scripts/husky/hook-groups.mjs`

**Step 1:** Add the local platform-api bootstrap and dev-recovery watch-path family.
**Step 2:** Wire it to the existing bootstrap contract tests only.
**Step 3:** Verify unrelated backend route changes do not trigger this family.

**Test command:** `cd services/platform-api && pytest -q tests/test_dev_bootstrap_contract.py tests/test_procfile_startup.py`
**Expected output:** Bootstrap and dev-recovery contract tests pass and the routing stays limited to the startup/control files.

**Commit:** `feat(husky): add platform api bootstrap hook family`

## Task 12: Add the telemetry truthfulness hook family

**File(s):** `scripts/husky/hook-groups.mjs`, `web/src/pages/ObservabilityTelemetry.test.tsx`, `web/src/pages/ObservabilityTraces.test.tsx`

**Step 1:** Add the telemetry and observability watch-path family using the existing backend observability tests.
**Step 2:** Create the missing frontend telemetry page tests.
**Step 3:** Wire the new frontend tests into the telemetry family and verify the family remains limited to telemetry and observability surfaces.

**Test command:** `cd services/platform-api && pytest -q tests/test_observability.py tests/test_observability_contract.py && cd ../../web && npm run test -- src/pages/ObservabilityTelemetry.test.tsx src/pages/ObservabilityTraces.test.tsx`
**Expected output:** Backend observability and frontend telemetry suites pass.

**Commit:** `feat(husky): add telemetry truthfulness hook family`

## Task 13: Add the Pipeline Services operational-proof hook family

**File(s):** `scripts/husky/hook-groups.mjs`

**Step 1:** Add the Pipeline Services watch-path family and command pair.
**Step 2:** Verify only pipeline storage, job, and UI surfaces trigger this family.
**Step 3:** Confirm this family does not pull in Index Builder or selector suites by default.

**Test command:** `cd services/platform-api && pytest -q tests/test_pipelines_routes.py && cd ../../web && npm run test -- src/pages/PipelineServicesPage.test.tsx src/components/pipelines/PipelineCatalogPanel.test.tsx`
**Expected output:** Pipeline backend and frontend suites pass and the family stays isolated.

**Commit:** `feat(husky): add pipeline services hook family`

## Task 14: Add the Index Builder integrity hook family

**File(s):** `scripts/husky/hook-groups.mjs`, `web/src/hooks/useIndexBuilderList.test.ts`

**Step 1:** Add the Index Builder watch-path family and command pair.
**Step 2:** Create the missing `useIndexBuilderList` test.
**Step 3:** Verify Index Builder changes trigger only the intended workbench integrity suites.

**Test command:** `cd web && npm run test -- src/pages/IndexBuilderPage.test.tsx src/hooks/useIndexBuilderJob.test.ts src/hooks/usePipelineSourceSet.test.ts src/hooks/useIndexBuilderList.test.ts`
**Expected output:** Index Builder regression suites pass, including the newly added list-hook test.

**Commit:** `feat(husky): add index builder hook family`

## Task 15: Add the shared selector contract hook family

**File(s):** `scripts/husky/hook-groups.mjs`

**Step 1:** Add the shared selector watch-path family across BlockData and AGChain shell files.
**Step 2:** Verify selector and shell changes trigger this family even when the change originated from the AGChain lane.
**Step 3:** Confirm unrelated pipeline or AGChain provider changes do not trigger selector tests.

**Test command:** `cd web && npm run test -- src/components/shell/ProjectSwitcher.test.tsx src/components/shell/ProjectFocusSelectorPopover.test.tsx src/components/shell/TopCommandBar.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx src/components/layout/AgchainShellLayout.test.tsx`
**Expected output:** Selector and shell regression suites pass.

**Commit:** `feat(husky): add shared selector hook family`

## Task 16: Add the AGChain focus-sync and registry-create hook family

**File(s):** `scripts/husky/hook-groups.mjs`

**Step 1:** Add the AGChain focus-sync and registry-create watch-path family.
**Step 2:** Wire it to the existing AGChain focus, workspace-sync, and overview/project page tests.
**Step 3:** Verify provider-model or shared-selector-only changes do not trigger this family.

**Test command:** `cd web && npm run test -- src/hooks/agchain/useAgchainProjectFocus.test.tsx src/lib/agchainProjectFocus.test.ts src/components/agchain/AgchainWorkspaceSync.test.tsx src/pages/agchain/AgchainProjectsPage.test.tsx src/pages/agchain/AgchainOverviewPage.test.tsx`
**Expected output:** AGChain focus-sync and registry-create suites pass.

**Commit:** `feat(husky): add agchain focus sync hook family`

## Task 17: Add the AGChain provider and model-surface hook family

**File(s):** `scripts/husky/hook-groups.mjs`, `web/src/pages/agchain/AgchainAiProvidersPage.test.tsx`, `web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.test.tsx`

**Step 1:** Add the provider and model-surface watch-path family using the existing backend provider/model tests.
**Step 2:** Create the missing project-level and organization-level AI provider page tests.
**Step 3:** Wire the new frontend tests into the provider/model family and verify the family stays separate from AGChain focus-sync.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_model_providers.py tests/test_agchain_models.py && cd ../../web && npm run test -- src/pages/agchain/AgchainModelsPage.test.tsx src/pages/agchain/AgchainAiProvidersPage.test.tsx src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.test.tsx src/components/agchain/models/AgchainProviderCredentialModal.test.tsx src/components/agchain/models/AgchainProviderCredentialsTable.test.tsx src/pages/agchain/AgchainPageArchitecture.test.ts`
**Expected output:** AGChain provider, model, and credential suites pass in backend and frontend layers.

**Commit:** `feat(husky): add agchain provider hook family`

## Task 18: Document setup and run end-to-end verification

**File(s):** `package.json`, `__start-here/2026-04-07-dual-pc-setup-internal-readme.md`

**Step 1:** Document the Husky install model, the `prepare` re-run path, the protected-push rule, the hardcoded-path exception list, and the meaning of the major hook families.
**Step 2:** Document what remains CI-only, including local Supabase replay, `supabase db start`, `supabase db reset`, and edge-function deploy behavior.
**Step 3:** Run the repo helper tests plus representative backend and frontend suites and manually exercise at least one metadata hook and one `pre-push` family.

**Test command:** `node --test scripts/tests/remove-desktop-ini.test.mjs scripts/tests/husky-hook-routing.test.mjs scripts/tests/husky-hardcoded-paths.test.mjs scripts/tests/husky-secret-scan.test.mjs scripts/tests/husky-protected-push.test.mjs && npm run test:workflow-guardrails && npm run test:supabase-extension-replay-guardrails && npm run test:supabase-migration-reconciliation-contract && cd services/platform-api && pytest -q tests/test_dev_bootstrap_contract.py tests/test_procfile_startup.py tests/test_observability.py tests/test_observability_contract.py tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py tests/test_runtime_action_service.py tests/test_storage_routes.py tests/test_pipelines_routes.py tests/test_agchain_model_providers.py tests/test_agchain_models.py && cd ../../web && npm run test -- src/pages/ObservabilityTelemetry.test.tsx src/pages/ObservabilityTraces.test.tsx src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/hooks/useOperationalReadiness.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx src/lib/storageUploadService.test.ts src/pages/PipelineServicesPage.test.tsx src/components/pipelines/PipelineCatalogPanel.test.tsx src/pages/IndexBuilderPage.test.tsx src/hooks/useIndexBuilderJob.test.ts src/hooks/usePipelineSourceSet.test.ts src/hooks/useIndexBuilderList.test.ts src/components/shell/ProjectSwitcher.test.tsx src/components/shell/ProjectFocusSelectorPopover.test.tsx src/components/shell/TopCommandBar.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx src/components/layout/AgchainShellLayout.test.tsx src/hooks/agchain/useAgchainProjectFocus.test.tsx src/lib/agchainProjectFocus.test.ts src/components/agchain/AgchainWorkspaceSync.test.tsx src/pages/agchain/AgchainProjectsPage.test.tsx src/pages/agchain/AgchainOverviewPage.test.tsx src/pages/agchain/AgchainModelsPage.test.tsx src/pages/agchain/AgchainAiProvidersPage.test.tsx src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.test.tsx src/components/agchain/models/AgchainProviderCredentialModal.test.tsx src/components/agchain/models/AgchainProviderCredentialsTable.test.tsx src/pages/agchain/AgchainPageArchitecture.test.ts`
**Expected output:** Helper tests, workflow guardrails, backend suites, and frontend suites all pass; representative Husky entrypoints execute the authored runner paths.

**Commit:** `docs(husky): document setup and verify hook system`

## Execution Handoff

When this plan is approved, the implementer must:

1. Read the whole plan before touching code.
2. Follow the locked hook surface and inventory exactly.
3. Stop and revise the plan if a hook family needs a different stage, a different path policy, or a different CI/local split than what is locked here.
4. Use `verification-before-completion` before any claim that the Husky rollout is complete, passing, or safe.
