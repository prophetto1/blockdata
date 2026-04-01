# Deployed Worker Entry Login Plan

**Goal:** Let external workers open one deployed login URL and enter the app as a shared worker account without manually typing credentials, while preserving the existing auth/session system and making the behavior easy to disable later.

**Architecture:** Reuse the existing Supabase password sign-in flow and existing browser session persistence, keep the public route at `/login`, and add a temporary query-param worker-entry mode on the existing login page that auto-submits a shared worker account from Vite env only when the worker link matches the configured slug. No platform-api, database, edge-function, or auth-architecture changes are introduced.

**Tech Stack:** React, TypeScript, React Router, Vite env vars, existing Supabase browser client, Vitest.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-30

### Platform API

None.

This plan does not add, modify, or depend on any platform-api endpoint. The worker-entry flow stays entirely inside the existing frontend login surface and uses the current browser-side Supabase auth client.

### Observability

None.

No new traces, metrics, or structured logs are required for this temporary flow.

### Database Migrations

None.

This plan does not add tables, columns, RLS changes, seed data, or migrations.

### Edge Functions

None.

This plan does not add or modify any Supabase edge functions.

### Frontend Surface Area

The implementation must touch only these frontend files:

- [web/src/pages/LoginSplit.tsx](E:/writing-system/web/src/pages/LoginSplit.tsx): add temporary worker-entry query handling, optional `next` handling, one-attempt auto-sign-in, and graceful fallback to the current login UI on mismatch or failure.
- [web/src/pages/LoginSplit.test.tsx](E:/writing-system/web/src/pages/LoginSplit.test.tsx): add coverage for worker-entry auto-login success, disabled-or-mismatch fallback, and redirect-target behavior.

The implementation must reuse these existing seams as-is:

- [web/src/auth/AuthContext.tsx](E:/writing-system/web/src/auth/AuthContext.tsx): keep `signIn()` and session state ownership here. Do not move auth ownership out of the existing provider.
- [web/src/lib/supabase.ts](E:/writing-system/web/src/lib/supabase.ts): keep existing `persistSession: true`, `autoRefreshToken: true`, and `detectSessionInUrl: true` behavior unchanged.
- [web/src/router.tsx](E:/writing-system/web/src/router.tsx): keep the public login route at `/login`; do not add a second auth surface unless implementation proves the query-param path is impossible.

### Locked Product Decisions

- The shared-worker entry point stays on the existing login page, not a new auth subsystem.
- The temporary worker URL shape is `https://<deployed-host>/login?worker=<slug>` with optional `&next=/app/...`.
- Auto-login is attempted only when all of the following are true:
  - `VITE_TEMP_WORKER_LOGIN_ENABLED === 'true'`
  - `VITE_TEMP_WORKER_LOGIN_SLUG` is present
  - `VITE_TEMP_WORKER_LOGIN_EMAIL` is present
  - `VITE_TEMP_WORKER_LOGIN_PASSWORD` is present
  - the page query param `worker` exactly matches the configured slug
  - no session already exists
  - the page is not already attempting the worker sign-in
- The implementation uses the existing password login flow through the current frontend auth layer. It does not fabricate a session, bypass the auth guard, or create an anonymous mode.
- The worker link may carry a `next` target. The target is honored only when it starts with `/`; otherwise the redirect target falls back to `/app`.
- If the worker slug is missing, mismatched, disabled, or the sign-in attempt fails, the page falls back to the normal login screen instead of redirecting or breaking.
- The feature is temporary and must be removable by disabling the env flag and redeploying. Password rotation of the shared worker account remains an immediate revocation option.
- The code consumes an already-existing shared worker account from deploy env. It does not create or manage the account in code.

### Locked Acceptance Contract

- Opening the deployed worker link with no existing session attempts exactly one automatic password sign-in into the shared worker account.
- On successful worker auto-login, the user lands in `/app` or the validated `next` target without manual form entry.
- After successful worker auto-login, a normal browser refresh stays signed in because the existing Supabase client session persistence remains unchanged.
- If a valid session already exists, opening the worker link immediately resolves into the same target without requiring the login form.
- If the feature flag is off, the slug is wrong, or the shared credentials are absent, `/login?worker=<slug>` behaves like the normal login page and does not auto-sign-in.
- Disabling the env flag and redeploying restores the current manual login behavior without backend or schema rollback work.

### Locked Platform API Surface

#### New platform-api endpoints: `0`

None.

#### Existing platform-api endpoints modified: `0`

None.

#### Existing platform-api endpoints reused as-is: `0`

None.

### Locked Observability Surface

#### New traces: `0`

None.

#### New metrics: `0`

None.

#### Existing observability surface reused: `0`

None.

### Locked Inventory Counts

#### Database

- New migrations: `0`
- Modified migrations: `0`

#### Frontend

- New source files: `0`
- Modified source files: `1`

#### Tests

- New test files: `0`
- Modified existing test files: `1`

#### Documentation

- New plan files: `1`

### Locked File Inventory

#### New files

- [docs/plans/2026-03-30-deployed-worker-entry-login-plan.md](E:/writing-system/docs/plans/2026-03-30-deployed-worker-entry-login-plan.md)

#### Modified files

- [web/src/pages/LoginSplit.tsx](E:/writing-system/web/src/pages/LoginSplit.tsx)
- [web/src/pages/LoginSplit.test.tsx](E:/writing-system/web/src/pages/LoginSplit.test.tsx)

### Frozen Seam Contract

- [web/src/auth/AuthContext.tsx](E:/writing-system/web/src/auth/AuthContext.tsx) remains the single source of truth for frontend auth state and password sign-in.
- [web/src/lib/supabase.ts](E:/writing-system/web/src/lib/supabase.ts) remains unchanged and continues to own persisted browser session behavior.
- [web/src/router.tsx](E:/writing-system/web/src/router.tsx) keeps `/login` as the only public password-login entry surface for this feature.
- No platform-api, Postgres, edge-function, or RLS seam is allowed to change for this work.

### Explicit Risks Accepted In This Plan

- The worker slug is a convenience gate, not a real secret boundary, because the deployed client bundles its own behavior. This is acceptable for the current temporary pre-launch use case.
- Anyone with the active worker link becomes the same shared account until the flag is disabled or the shared password is rotated.
- Shared worker state is shared state. Personal attribution inside the app is not preserved for these sessions.

### Completion Criteria

- A deployed URL of the form `/login?worker=<slug>` can get an external worker into the app without manual credential entry.
- The shared worker session persists across refreshes using the existing Supabase browser client behavior.
- Turning the feature off requires only env removal or disablement plus redeploy, with no code-path rollback outside this frontend seam.
- The login page still behaves normally for manual users when the worker link path is not active.
- Frontend Vitest coverage for the modified login page passes.

## Task 1: Add temporary worker-entry mode to the existing login page

- In [web/src/pages/LoginSplit.tsx](E:/writing-system/web/src/pages/LoginSplit.tsx), read `worker`, `next`, and `auth_error` from the current query string.
- Add a small local helper that resolves the redirect target: honor `next` only when it begins with `/`, otherwise use `/app`.
- Add Vite env reads for:
  - `VITE_TEMP_WORKER_LOGIN_ENABLED`
  - `VITE_TEMP_WORKER_LOGIN_SLUG`
  - `VITE_TEMP_WORKER_LOGIN_EMAIL`
  - `VITE_TEMP_WORKER_LOGIN_PASSWORD`
- When the page is not auth-loading, has no session, and the configured worker-link conditions match, attempt one automatic `signIn(sharedEmail, sharedPassword)`.
- During the attempt, show a loading state instead of requiring interaction with the form.
- On success, navigate to the resolved target.
- On failure, surface the error on the page and leave the normal login form usable.
- Preserve the existing manual sign-in flow for all non-worker cases.

## Task 2: Add focused login-page tests for the worker flow

- Extend [web/src/pages/LoginSplit.test.tsx](E:/writing-system/web/src/pages/LoginSplit.test.tsx) to cover:
  - successful worker auto-login and redirect
  - disabled flag or slug mismatch causing no auto-login attempt
  - validated `next` redirect target
  - fallback to `/app` when `next` is absent or invalid
- Keep existing login-page tests intact so current manual login behavior stays covered.

## Task 3: Verify the temporary worker-entry behavior

- Run `cd web && npm run test -- src/pages/LoginSplit.test.tsx`.
- Run `cd web && npm run build`.
- In deployed environment, verify:
  - `/login?worker=<slug>` signs in automatically
  - refresh remains signed in
  - disabling the feature flag returns the route to normal login behavior
