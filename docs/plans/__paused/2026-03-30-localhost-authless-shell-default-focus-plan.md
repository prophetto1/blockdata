# Localhost Authless Shell And Default Focus Implementation Plan

**Goal:** Allow localhost app routes to open without login when `VITE_AUTH_BYPASS=true`, with stable default context for AGChain surfaces and optional default project focus for BlockData surfaces, while preserving all normal authenticated behavior when the bypass flag is off.

**Architecture:** Reuse the existing frontend-only `VITE_AUTH_BYPASS` route bypass instead of inventing a second auth toggle, centralize all bypass/default-context logic in one frontend helper, keep platform-api, Supabase schema, and edge functions unchanged, synthesize a local AGChain benchmark focus when no session exists, and support BlockData default focus only when a real project id is provided through env because there is no anonymous way to derive a per-user `Default Project` UUID.

**Tech Stack:** React, TypeScript, Vite env flags, existing Supabase browser client, existing platform-api client helpers, Vitest.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-30

### Platform API

None.

This is a frontend-only localhost behavior change. Existing authenticated endpoints remain unchanged and are reused as-is when a real session exists. The AGChain benchmark list endpoint at `/agchain/benchmarks` remains `require_user_auth`, and the current `platformApiFetch()` token requirement remains intact.

### Observability

None.

This change does not create a new owned backend runtime seam and does not alter existing platform-api or edge-function execution. Existing frontend operational-readiness reporting is sufficient, but the frontend readiness summary must expose the new bypass-default env values so localhost state is inspectable from the UI.

### Database Migrations

None.

No Postgres schema, RLS policy, seed data, or migration changes are required.

### Edge Functions

None.

This work does not add or modify any Supabase edge functions.

### Frontend Surface Area

The implementation must touch the following frontend seams:

- [web/src/lib/devAuthBypass.ts](E:/writing-system/web/src/lib/devAuthBypass.ts) (new): single source of truth for `VITE_AUTH_BYPASS` plus optional localhost default-context env vars.
- [web/src/auth/AuthGuard.tsx](E:/writing-system/web/src/auth/AuthGuard.tsx): replace inline env check with the shared helper.
- [web/src/pages/superuser/SuperuserGuard.tsx](E:/writing-system/web/src/pages/superuser/SuperuserGuard.tsx): reuse the same helper so dev bypass behavior stays consistent.
- [web/src/lib/operationalReadiness.ts](E:/writing-system/web/src/lib/operationalReadiness.ts): expose bypass mode and fallback-default values in the readiness summary.
- [web/src/lib/agchainProjectFocus.ts](E:/writing-system/web/src/lib/agchainProjectFocus.ts): allow the shared AGChain focus reader to return a localhost fallback slug when bypass is active and storage is empty.
- [web/src/hooks/agchain/useAgchainProjectFocus.ts](E:/writing-system/web/src/hooks/agchain/useAgchainProjectFocus.ts): on unauthenticated fetch failure under bypass mode, synthesize a one-item AGChain project list from env defaults instead of surfacing a broken focus state.
- [web/src/components/layout/AgchainShellLayout.tsx](E:/writing-system/web/src/components/layout/AgchainShellLayout.tsx): show a stable anonymous-localhost label and suppress sign-out affordances when bypass mode is active without a session.
- [web/src/lib/projectFocus.ts](E:/writing-system/web/src/lib/projectFocus.ts): extend the shared BlockData focus reader to honor an optional env-provided default project id and name.
- [web/src/hooks/useProjectFocus.ts](E:/writing-system/web/src/hooks/useProjectFocus.ts): when RPC/table loading fails under bypass mode, synthesize one project option only if a real env-provided project id exists; otherwise preserve the current null-focus behavior.
- [web/src/components/layout/AppLayout.tsx](E:/writing-system/web/src/components/layout/AppLayout.tsx): render an anonymous-localhost shell label and suppress sign-out affordances when bypass mode is active without a session.
- [web/src/pages/FlowsIndexRedirect.tsx](E:/writing-system/web/src/pages/FlowsIndexRedirect.tsx): stop using the file-local storage reader and route through the shared focus helper so bypass defaults apply consistently.

The implementation must add or update tests in these files:

- [web/src/lib/devAuthBypass.test.ts](E:/writing-system/web/src/lib/devAuthBypass.test.ts) (new)
- [web/src/auth/AuthGuard.test.tsx](E:/writing-system/web/src/auth/AuthGuard.test.tsx) (new)
- [web/src/pages/superuser/SuperuserGuard.test.tsx](E:/writing-system/web/src/pages/superuser/SuperuserGuard.test.tsx) (new)
- [web/src/lib/agchainProjectFocus.test.ts](E:/writing-system/web/src/lib/agchainProjectFocus.test.ts)
- [web/src/hooks/agchain/useAgchainProjectFocus.test.tsx](E:/writing-system/web/src/hooks/agchain/useAgchainProjectFocus.test.tsx)
- [web/src/components/layout/AgchainShellLayout.test.tsx](E:/writing-system/web/src/components/layout/AgchainShellLayout.test.tsx)
- [web/src/lib/projectFocus.test.ts](E:/writing-system/web/src/lib/projectFocus.test.ts)
- [web/src/components/layout/AppLayout.test.tsx](E:/writing-system/web/src/components/layout/AppLayout.test.tsx)

### Locked Product Decisions

- The localhost authless mode is controlled by the existing `VITE_AUTH_BYPASS=true` flag. No second top-level bypass flag is introduced.
- This is explicitly a frontend-only localhost convenience mode. It does not create anonymous platform-api or anonymous Supabase data access.
- AGChain gets an automatic authless fallback because benchmark slugs are stable and the targeted routes are currently shell/placeholder surfaces. Default fallback values are:
  - `VITE_AUTH_BYPASS_DEFAULT_AGCHAIN_BENCHMARK_SLUG`, default `legal-10`
  - `VITE_AUTH_BYPASS_DEFAULT_AGCHAIN_BENCHMARK_NAME`, default `Legal-10`
- BlockData cannot derive a canonical `Default Project` anonymously because the underlying project UUID is user-scoped. Therefore BlockData default focus must be env-backed when the developer wants a non-null project context:
  - `VITE_AUTH_BYPASS_DEFAULT_BLOCKDATA_PROJECT_ID`
  - `VITE_AUTH_BYPASS_DEFAULT_BLOCKDATA_PROJECT_NAME`, default `Default Project`
- If `VITE_AUTH_BYPASS_DEFAULT_BLOCKDATA_PROJECT_ID` is absent, BlockData routes must remain accessible but unfocused. They may show existing “no project selected” states; they must not redirect to `/login` or get stuck in focus loops.
- The implementation must not fabricate a fake Supabase session or bearer token. Any attempt to impersonate a real authenticated user locally would blur the line between anonymous shell access and actual protected data access.
- Shell layouts must not show a blank or broken user section when bypass mode is active without a session. They must render a clear local-dev label and hide sign-out actions that cannot succeed meaningfully.

### Locked Acceptance Contract

- With `VITE_AUTH_BYPASS=true` and no saved session, opening `http://localhost:5374/app/agchain/prompts` must render the AGChain shell instead of redirecting to `/login`.
- Under the same conditions, `/app/agchain` must resolve through [router.tsx](E:/writing-system/web/src/router.tsx) into `/app/agchain/overview` using the authless AGChain default benchmark focus.
- The AGChain project switcher and AGChain placeholder pages must display the fallback benchmark name instead of “Choose an AGChain project.”
- With `VITE_AUTH_BYPASS=true`, no session, and `VITE_AUTH_BYPASS_DEFAULT_BLOCKDATA_PROJECT_ID` set, BlockData focus readers must resolve that id through the shared focus helper instead of remaining null.
- With `VITE_AUTH_BYPASS=true`, no session, and no BlockData default-project env id, BlockData shell routes must remain reachable and the focus state must stay null without redirect loops or crashes.
- With `VITE_AUTH_BYPASS` unset or `false`, existing login redirects, superuser gating, project-focus loading, and AGChain benchmark loading behavior must remain unchanged.

### Locked Platform API Surface

#### New platform-api endpoints: `0`

None.

#### Existing platform-api endpoints modified: `0`

None.

#### Existing platform-api endpoints reused as-is: `1`

- `GET /agchain/benchmarks`
  - Reused unchanged when a real authenticated session exists.
  - Not called as a required success path during anonymous localhost fallback.

### Locked Observability Surface

#### New traces: `0`

None.

#### New metrics: `0`

None.

#### Existing observability surface reused: `1`

- [web/src/lib/operationalReadiness.ts](E:/writing-system/web/src/lib/operationalReadiness.ts)
  - Extend the readiness summary so the UI can report whether bypass mode is enabled and which authless fallback defaults are active.

### Locked Inventory Counts

#### Database

- New migrations: `0`
- Modified migrations: `0`

#### Frontend

- New source files: `1`
- Modified source files: `10`

#### Tests

- New test files: `3`
- Modified existing test files: `5`

#### Documentation

- New plan files: `1`

### Locked File Inventory

#### New files

- [web/src/lib/devAuthBypass.ts](E:/writing-system/web/src/lib/devAuthBypass.ts)
- [web/src/lib/devAuthBypass.test.ts](E:/writing-system/web/src/lib/devAuthBypass.test.ts)
- [web/src/auth/AuthGuard.test.tsx](E:/writing-system/web/src/auth/AuthGuard.test.tsx)
- [web/src/pages/superuser/SuperuserGuard.test.tsx](E:/writing-system/web/src/pages/superuser/SuperuserGuard.test.tsx)
- [docs/plans/2026-03-30-localhost-authless-shell-default-focus-plan.md](E:/writing-system/docs/plans/2026-03-30-localhost-authless-shell-default-focus-plan.md)

#### Modified files

- [web/src/auth/AuthGuard.tsx](E:/writing-system/web/src/auth/AuthGuard.tsx)
- [web/src/pages/superuser/SuperuserGuard.tsx](E:/writing-system/web/src/pages/superuser/SuperuserGuard.tsx)
- [web/src/lib/operationalReadiness.ts](E:/writing-system/web/src/lib/operationalReadiness.ts)
- [web/src/lib/agchainProjectFocus.ts](E:/writing-system/web/src/lib/agchainProjectFocus.ts)
- [web/src/hooks/agchain/useAgchainProjectFocus.ts](E:/writing-system/web/src/hooks/agchain/useAgchainProjectFocus.ts)
- [web/src/components/layout/AgchainShellLayout.tsx](E:/writing-system/web/src/components/layout/AgchainShellLayout.tsx)
- [web/src/lib/projectFocus.ts](E:/writing-system/web/src/lib/projectFocus.ts)
- [web/src/hooks/useProjectFocus.ts](E:/writing-system/web/src/hooks/useProjectFocus.ts)
- [web/src/components/layout/AppLayout.tsx](E:/writing-system/web/src/components/layout/AppLayout.tsx)
- [web/src/pages/FlowsIndexRedirect.tsx](E:/writing-system/web/src/pages/FlowsIndexRedirect.tsx)
- [web/src/lib/agchainProjectFocus.test.ts](E:/writing-system/web/src/lib/agchainProjectFocus.test.ts)
- [web/src/hooks/agchain/useAgchainProjectFocus.test.tsx](E:/writing-system/web/src/hooks/agchain/useAgchainProjectFocus.test.tsx)
- [web/src/components/layout/AgchainShellLayout.test.tsx](E:/writing-system/web/src/components/layout/AgchainShellLayout.test.tsx)
- [web/src/lib/projectFocus.test.ts](E:/writing-system/web/src/lib/projectFocus.test.ts)
- [web/src/components/layout/AppLayout.test.tsx](E:/writing-system/web/src/components/layout/AppLayout.test.tsx)

### Frozen Seam Contract

- [web/src/auth/AuthGuard.tsx](E:/writing-system/web/src/auth/AuthGuard.tsx) and [web/src/pages/superuser/SuperuserGuard.tsx](E:/writing-system/web/src/pages/superuser/SuperuserGuard.tsx) continue to use a pure frontend env gate. They must not call backend auth probes when bypass mode is active.
- [web/src/lib/platformApi.ts](E:/writing-system/web/src/lib/platformApi.ts) and [web/src/lib/edge.ts](E:/writing-system/web/src/lib/edge.ts) remain unchanged. Anonymous localhost mode must avoid depending on them for success in the authless AGChain focus path.
- [web/src/lib/projectFocus.ts](E:/writing-system/web/src/lib/projectFocus.ts) remains the canonical shared reader for BlockData focus. File-local copies of the storage logic are not allowed after this change.
- [web/src/lib/agchainProjectFocus.ts](E:/writing-system/web/src/lib/agchainProjectFocus.ts) remains the canonical shared reader for AGChain focus.

### Explicit Risks Accepted In This Plan

- This does not deliver full anonymous parity for the whole site. Many BlockData pages still call authenticated Supabase reads and will remain partial without a real session even if route access and focus resolution are fixed.
- Existing `VITE_AUTH_BYPASS` behavior already bypasses superuser gating. This plan preserves that local-dev behavior instead of narrowing it.
- A developer who wants real BlockData project-scoped behavior without logging in must supply a real `VITE_AUTH_BYPASS_DEFAULT_BLOCKDATA_PROJECT_ID`; there is no safe universal fallback UUID.

### Completion Criteria

- The frontend can be started locally with `VITE_AUTH_BYPASS=true` and no cached session, and `/app/agchain/prompts` loads without a login redirect.
- `/app/agchain` redirects into `/app/agchain/overview` with a non-null AGChain fallback benchmark context.
- AGChain shell/header areas show a stable anonymous-localhost identity label rather than blank auth state.
- BlockData shell/header areas show a stable anonymous-localhost identity label rather than blank auth state.
- BlockData focus readers consistently use the shared helper; no duplicated local-storage parsing remains in [FlowsIndexRedirect.tsx](E:/writing-system/web/src/pages/FlowsIndexRedirect.tsx).
- All new and modified Vitest coverage passes, and turning the bypass flag off preserves current authenticated behavior.

## Task 1: Centralize localhost auth-bypass configuration

**File(s):** [web/src/lib/devAuthBypass.ts](E:/writing-system/web/src/lib/devAuthBypass.ts), [web/src/lib/devAuthBypass.test.ts](E:/writing-system/web/src/lib/devAuthBypass.test.ts), [web/src/auth/AuthGuard.tsx](E:/writing-system/web/src/auth/AuthGuard.tsx), [web/src/auth/AuthGuard.test.tsx](E:/writing-system/web/src/auth/AuthGuard.test.tsx), [web/src/pages/superuser/SuperuserGuard.tsx](E:/writing-system/web/src/pages/superuser/SuperuserGuard.tsx), [web/src/pages/superuser/SuperuserGuard.test.tsx](E:/writing-system/web/src/pages/superuser/SuperuserGuard.test.tsx), [web/src/lib/operationalReadiness.ts](E:/writing-system/web/src/lib/operationalReadiness.ts)

**Step 1:** Write failing tests for the shared dev-bypass helper covering enabled/disabled mode and env-backed AGChain/BlockData defaults.
**Step 2:** Implement the shared helper in `web/src/lib/devAuthBypass.ts` and wire `AuthGuard` plus `SuperuserGuard` to consume it instead of inline `import.meta.env` checks.
**Step 3:** Add/adjust readiness summary entries so localhost bypass status and fallback defaults are visible in the existing operational-readiness UI.
**Step 4:** Run the new guard/helper tests and fix any regressions until they pass.
**Step 5:** Commit the isolated auth-bypass helper/guard change.

**Test command:** `cd web && npm run test -- --run src/lib/devAuthBypass.test.ts src/auth/AuthGuard.test.tsx src/pages/superuser/SuperuserGuard.test.tsx`
**Expected output:** Vitest reports all three targeted suites passing with no new failures.

**Commit:** `test: lock localhost auth bypass helper and guards`

## Task 2: Make AGChain placeholder routes resolve anonymous default focus

**File(s):** [web/src/lib/agchainProjectFocus.ts](E:/writing-system/web/src/lib/agchainProjectFocus.ts), [web/src/hooks/agchain/useAgchainProjectFocus.ts](E:/writing-system/web/src/hooks/agchain/useAgchainProjectFocus.ts), [web/src/components/layout/AgchainShellLayout.tsx](E:/writing-system/web/src/components/layout/AgchainShellLayout.tsx), [web/src/lib/agchainProjectFocus.test.ts](E:/writing-system/web/src/lib/agchainProjectFocus.test.ts), [web/src/hooks/agchain/useAgchainProjectFocus.test.tsx](E:/writing-system/web/src/hooks/agchain/useAgchainProjectFocus.test.tsx), [web/src/components/layout/AgchainShellLayout.test.tsx](E:/writing-system/web/src/components/layout/AgchainShellLayout.test.tsx)

**Step 1:** Extend the AGChain focus reader tests so bypass mode without storage returns the configured fallback slug instead of null.
**Step 2:** Extend the hook tests so an unauthenticated benchmark-fetch failure under bypass mode produces a one-item fallback project list with the configured slug/name.
**Step 3:** Implement the AGChain focus-reader and hook fallback behavior without changing the authenticated `fetchAgchainBenchmarks()` path.
**Step 4:** Update `AgchainShellLayout` and its tests so anonymous bypass mode renders a stable localhost identity label and no broken sign-out affordance.
**Step 5:** Run the targeted AGChain focus/layout tests and commit once they pass.

**Test command:** `cd web && npm run test -- --run src/lib/agchainProjectFocus.test.ts src/hooks/agchain/useAgchainProjectFocus.test.tsx src/components/layout/AgchainShellLayout.test.tsx`
**Expected output:** Vitest reports all three targeted suites passing, including the new authless-fallback cases.

**Commit:** `test: add agchain authless fallback focus`

## Task 3: Make BlockData focus readers honor optional bypass defaults

**File(s):** [web/src/lib/projectFocus.ts](E:/writing-system/web/src/lib/projectFocus.ts), [web/src/hooks/useProjectFocus.ts](E:/writing-system/web/src/hooks/useProjectFocus.ts), [web/src/components/layout/AppLayout.tsx](E:/writing-system/web/src/components/layout/AppLayout.tsx), [web/src/pages/FlowsIndexRedirect.tsx](E:/writing-system/web/src/pages/FlowsIndexRedirect.tsx), [web/src/lib/projectFocus.test.ts](E:/writing-system/web/src/lib/projectFocus.test.ts), [web/src/components/layout/AppLayout.test.tsx](E:/writing-system/web/src/components/layout/AppLayout.test.tsx)

**Step 1:** Add failing tests for `readFocusedProjectId()` covering env-backed default id/name behavior under bypass mode and no-default behavior when the env id is absent.
**Step 2:** Implement the shared BlockData focus-reader fallback and update `useProjectFocus()` so RPC failures under bypass mode synthesize one project option only when a real env project id exists.
**Step 3:** Replace the file-local storage reader in `FlowsIndexRedirect.tsx` with the shared helper so direct route loads honor the same bypass defaults.
**Step 4:** Update `AppLayout` and its tests so anonymous bypass mode renders a stable localhost identity label and suppresses broken sign-out affordances.
**Step 5:** Run the targeted BlockData focus/layout tests and commit once they pass.

**Test command:** `cd web && npm run test -- --run src/lib/projectFocus.test.ts src/components/layout/AppLayout.test.tsx`
**Expected output:** Vitest reports both targeted suites passing with the new bypass-default coverage.

**Commit:** `test: add blockdata authless default focus`

## Task 4: Verify localhost route behavior end to end

**File(s):** [web/src/router.tsx](E:/writing-system/web/src/router.tsx), [web/src/pages/agchain/AgchainPromptsPage.tsx](E:/writing-system/web/src/pages/agchain/AgchainPromptsPage.tsx), [web/src/pages/AppHome.tsx](E:/writing-system/web/src/pages/AppHome.tsx)

**Step 1:** Create or update `.env.local` with `VITE_AUTH_BYPASS=true`, AGChain fallback values, and a BlockData default project id only if a real local project id is available.
**Step 2:** Run the targeted Vitest suites from Tasks 1-3 together to confirm no cross-surface regressions.
**Step 3:** Start the frontend with `cd web && npm run dev` and manually verify `/app/agchain`, `/app/agchain/prompts`, and one BlockData shell route such as `/app/assets`.
**Step 4:** Turn `VITE_AUTH_BYPASS` off, restart the frontend, and confirm `/app/agchain/prompts` returns to the normal login-gated flow.
**Step 5:** Commit the verified localhost-authless route behavior.

**Test command:** `cd web && npm run test -- --run src/lib/devAuthBypass.test.ts src/auth/AuthGuard.test.tsx src/pages/superuser/SuperuserGuard.test.tsx src/lib/agchainProjectFocus.test.ts src/hooks/agchain/useAgchainProjectFocus.test.tsx src/components/layout/AgchainShellLayout.test.tsx src/lib/projectFocus.test.ts src/components/layout/AppLayout.test.tsx`
**Expected output:** Vitest reports all targeted suites passing; manual verification confirms authless AGChain access on localhost and no-login regressions when the bypass flag is disabled again.

**Commit:** `test: verify localhost authless shell behavior`
