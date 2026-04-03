# Web Build Regressions Blocking Live Auth/Secrets Rollout

**Goal:** Restore a successful production web build for the current `master` commit so the already-approved live auth/secrets rollout plan can run against an actually current deployment instead of the older pre-auth/secrets production alias.

**Architecture:** Do not change the auth/secrets product contract in this plan. Fix only the unrelated frontend TypeScript/test regressions currently breaking `npm --prefix web run build` on Vercel, then hand control back to the existing live rollout plan for runtime verification of `/app/secrets`, `/app/settings/secrets`, `/secrets`, `/variables`, and `platform.crypto.fallback.count`.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Vercel production deploys.

**Status:** Draft
**Date:** 2026-03-27

## Starting Evidence

- Live Supabase is now updated: `public.user_variables` exists, the hardening migration is applied, RLS is enabled, browser roles have no direct table privileges, and `name <> upper(name)` returns `0`.
- `blockdata.run` is still serving the old production frontend:
  - `/app/secrets` renders the legacy Secrets placeholder surface instead of redirecting to `/app/settings/secrets`.
  - `/app/settings/secrets` returns the app 404 surface.
  - authenticated fetches to `/platform-api/secrets` and `/platform-api/variables` return the SPA HTML shell rather than API JSON.
- The latest production deploy attempts for project `blockdata` are failing on the current `master` commit `1574714`.
- The latest failed Vercel build log shows these blocking errors:
  - `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx`: `output_contract` type mismatch (`string | null` vs `string`)
  - `web/src/hooks/agchain/useAgchainBenchmarkSteps.ts`: unused `AgchainBenchmarkStepRow` import
  - `web/src/pages/project-assets-sync.test.tsx`: unused `uploadedDoc` variable
  - `web/src/pages/project-assets-sync.test.tsx`: mocked props no longer satisfy the component contract (`clearSelection`, `selectedDocs` missing)

## Manifest

### Platform API

- No platform-api changes in this plan.

### Database Migrations

- No database migration changes in this plan.

### Edge Functions

- No edge function changes in this plan.

### Frontend

- Fix the current web-build blockers in:
  - `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx`
  - `web/src/hooks/agchain/useAgchainBenchmarkSteps.ts`
  - `web/src/pages/project-assets-sync.test.tsx`

### Tests and Verification

- Reproduce the failure locally with `npm --prefix web run build`.
- If the touched test file still owns meaningful behavior, run targeted Vitest coverage for `project-assets-sync.test.tsx`.
- Re-run `npm --prefix web run build` until it passes locally.
- After the fix is deployed, confirm a new production Vercel deployment for `blockdata` reaches `Ready`.
- Once the deployment is ready, resume `docs/plans/2026-03-27-live-supabase-auth-secrets-rollout-and-completion-evidence-plan.md`.

## Locked Product Decisions

1. This plan does not change the auth/secrets feature contract, routing contract, compatibility alias contract, or observability contract. Those remain owned by the approved auth/secrets and live-rollout plans.
2. This plan does not redesign the Agchain benchmark surface or the project-assets-sync surface. It only restores compile/test contract alignment so the web app can build again.
3. No new feature work, refactors, or unrelated cleanup may be folded into this fix while production deployability is blocked.

## Locked Acceptance Contract

1. `npm --prefix web run build` passes locally on the fixed branch.
2. The previously failing Vercel production deployment path succeeds for the current code and reaches `Ready`.
3. `blockdata.run` or its active production alias serves the current app bundle rather than the stale pre-auth/secrets bundle.
4. The separate live auth/secrets rollout plan can then continue from browser/API/observability verification; this plan is not complete if build issues are merely worked around locally without a successful production deployment.

## Locked Inventory

- New files: `0`
- Modified existing frontend files: `3`
- Modified existing platform-api files: `0`
- Modified existing migration files: `0`
- New tests: `0`

If implementation reveals that one of the above compile failures can only be resolved in an additional shared owning type/helper file, stop and revise this plan before editing it.

## Risks and Drift Rules

- If `npm --prefix web run build` exposes more errors in the same three files after the first fixes land, continue.
- If it exposes new blocking errors in unrelated files or systems, stop and draft a separate follow-up plan instead of silently expanding scope.
- Do not treat a successful local build as sufficient if Vercel production still fails.

## Tasks

### Task 1: Reproduce and localize the current production build failures

- Run `npm --prefix web run build`.
- Confirm the local failures match the Vercel log before editing code.
- Record any additional errors. If they are outside the three declared files, stop and revise the plan.

### Task 2: Restore Agchain benchmark type compatibility

- In `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx`, align the data passed into the typed consumer so `output_contract` matches the declared contract without weakening unrelated type guarantees.
- In `web/src/hooks/agchain/useAgchainBenchmarkSteps.ts`, remove or correctly use the unused `AgchainBenchmarkStepRow` import so the build no longer fails on `TS6133`.

### Task 3: Restore `project-assets-sync` test compatibility

- In `web/src/pages/project-assets-sync.test.tsx`, remove the unused `uploadedDoc` local.
- Update the mocked props object so it satisfies the current component contract, including `clearSelection` and `selectedDocs`.
- Preserve the intended test behavior; do not delete assertions simply to satisfy the compiler.

### Task 4: Verify local build health

- Re-run `npm --prefix web run build`.
- If useful after the test mock fix, run targeted Vitest for `web/src/pages/project-assets-sync.test.tsx`.
- Do not proceed until the local web build is clean.

### Task 5: Verify production deployability and hand back to the rollout plan

- Push or otherwise trigger the normal production deployment flow.
- Confirm the newest production deployment for `blockdata` reaches `Ready`.
- Confirm the production alias is serving the current bundle, not the older placeholder/404 auth-secrets surfaces.
- Resume `docs/plans/2026-03-27-live-supabase-auth-secrets-rollout-and-completion-evidence-plan.md` for the live browser/API/observability checks.

## Completion Criteria

- This plan is complete only when the web build is clean locally and a new production deployment is `Ready`.
- Live auth/secrets runtime evidence is explicitly deferred back to the rollout plan; do not mark the overall auth/secrets work complete from this plan alone.
