# Social Auth Login Repair Implementation Plan

**Goal:** Make the existing Google and GitHub social-login flow operational for the hosted Supabase project `dbdzzhshmigewyprahej`, add an owned `platform-api` observability seam around the OAuth roundtrip, and unblock end-to-end signup verification for the storage workstream.

**Architecture:** Keep hosted Supabase Auth as the actual OAuth and session authority, but add `services/platform-api` as the app-owned OAuth observability control plane. The browser creates a tracked OAuth attempt before `signInWithOAuth()`, stores short-lived attempt credentials in `sessionStorage`, returns through Supabase's `/auth/v1/callback`, and posts callback/session/profile/result events back to `platform-api`. Persist those attempt lifecycles in a new `auth_oauth_attempts` table, centralize auth redirect origin selection instead of relying on arbitrary `window.location.origin`, preserve the existing `/login` -> `/auth/callback` -> `/auth/welcome` -> `/app` routing contract, and surface callback failures in the UI so misconfiguration is diagnosable instead of silent.

**Tech Stack:** Supabase Auth, Supabase Postgres migrations, FastAPI, OpenTelemetry, React 19, React Router 7, Vite, Vitest, pytest.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-21

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| POST | `/auth/oauth/attempts` | Create a tracked Google or GitHub OAuth attempt before redirecting to Supabase Auth | New |
| POST | `/auth/oauth/attempts/{attempt_id}/events` | Record callback, session, profile-branch, and final-result events for an OAuth attempt | New |
| GET | `/admin/auth/oauth/providers/status` | Read hosted provider enablement and expected redirect-origin readiness | New |
| GET | `/admin/auth/oauth/attempts/recent` | Read recent OAuth attempts for superuser diagnosis | New |

#### New endpoint contracts

`POST /auth/oauth/attempts`

- Auth: anonymous browser allowed
- Request: `{ provider: 'google' | 'github', redirect_origin: string, next_path?: string | null }`
- Response: `{ attempt_id: string, attempt_secret: string, expires_at: string }`
- Touches: `public.auth_oauth_attempts`

`POST /auth/oauth/attempts/{attempt_id}/events`

- Auth: anonymous-or-authenticated browser allowed; request must include the `attempt_secret` returned at creation time
- Request: `{ attempt_secret: string, event: 'callback_received' | 'session_detected' | 'profile_missing' | 'profile_present' | 'completed' | 'failed', result?: 'welcome' | 'app' | 'login_error' | null, failure_category?: 'provider_disabled' | 'callback_error' | 'no_session' | 'profile_lookup_failed' | 'unexpected' | null, callback_error_code?: string | null, profile_state?: 'missing' | 'present' | null, http_status_code?: number | null }`
- Response: `{ ok: true, status: 'started' | 'callback_received' | 'session_detected' | 'completed' | 'failed' }`
- Touches: `public.auth_oauth_attempts`

`GET /admin/auth/oauth/providers/status`

- Auth: `require_superuser`
- Request: no body
- Response: `{ google_enabled: boolean, github_enabled: boolean, supabase_callback_url: string, expected_redirect_origins: string[], checked_at: string }`
- Touches: hosted Supabase Auth `/auth/v1/settings`; `services/platform-api` runtime settings for expected redirect origins

`GET /admin/auth/oauth/attempts/recent`

- Auth: `require_superuser`
- Request: query `limit` with default `50` and max `200`
- Response: `{ attempts: Array<{ attempt_id: string, provider: 'google' | 'github', status: string, result: string | null, failure_category: string | null, redirect_origin: string, created_at: string, callback_received_at: string | null, finalized_at: string | null, duration_ms: number | null }> }`
- Touches: `public.auth_oauth_attempts`

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `auth.oauth.attempt.create` | `services/platform-api/app/api/routes/auth_oauth.py:create_oauth_attempt` | Trace the start of each social-login attempt |
| Trace span | `auth.oauth.attempt.event` | `services/platform-api/app/api/routes/auth_oauth.py:record_oauth_attempt_event` | Trace callback, session detection, profile branch, and final result events |
| Trace span | `auth.oauth.providers.status` | `services/platform-api/app/api/routes/auth_oauth.py:get_oauth_provider_status` | Trace readiness checks against hosted Supabase Auth |
| Trace span | `auth.oauth.attempts.recent` | `services/platform-api/app/api/routes/auth_oauth.py:list_recent_oauth_attempts` | Trace superuser diagnostics reads |
| Metric | `platform.auth.oauth.attempts.count` | `auth_oauth.py` | Count started attempts by provider |
| Metric | `platform.auth.oauth.failures.count` | `auth_oauth.py` | Count failed attempts by provider and failure category |
| Metric | `platform.auth.oauth.attempt.duration_ms` | `auth_oauth.py` | Measure elapsed time from attempt creation to terminal result |
| Structured log | `auth.oauth.attempt.started` | `auth_oauth.py:create_oauth_attempt` | Audit provider, origin-allowed result, and next-path intent |
| Structured log | `auth.oauth.attempt.completed` | `auth_oauth.py:record_oauth_attempt_event` | Audit terminal success result and route target |
| Structured log | `auth.oauth.attempt.failed` | `auth_oauth.py:record_oauth_attempt_event` | Audit failure category and callback error code |
| Structured log | `auth.oauth.providers.status.checked` | `auth_oauth.py:get_oauth_provider_status` | Audit hosted provider readiness checks |

Observability attribute rules:

- Allowed attributes: `auth.provider`, `event`, `result`, `status`, `failure_category`, `callback_error_code`, `profile_state`, `origin_allowed`, `has_next_path`, `http.status_code`, `duration_ms`, `limit`
- Forbidden in trace or metric attributes: `user_id`, `email`, access tokens, refresh tokens, raw OAuth codes, `attempt_secret`, raw redirect URLs, full callback query strings, auth headers

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260321200000_auth_oauth_attempts.sql` | Creates `auth_oauth_attempts` with status/result/failure tracking columns and indexes for recent admin reads | No |

### Edge Functions

No edge functions created or modified.

Existing edge functions such as `ingest`, `google-drive-import`, and `admin-config` are not part of the social-login path. This implementation stays in `platform-api`. If reusing an existing edge function ever looks preferable, stop and confirm with the user first.

### Frontend Surface Area

**New pages:** `0`

**New components:** `0`

**New hooks:** `0`

**New libraries/services:** `2`

| Module | File |
|--------|------|
| `authRedirects` | `web/src/lib/authRedirects.ts` |
| `authOAuthAttempts` | `web/src/lib/authOAuthAttempts.ts` |

**Modified existing app modules:** `4`

| File | What changes |
|------|--------------|
| `web/src/auth/AuthContext.tsx` | Create the tracked OAuth attempt before `signInWithOAuth()`, store attempt credentials in `sessionStorage`, and centralize redirect URL selection |
| `web/src/components/auth/OAuthButtons.tsx` | Preserve direct provider-initiation errors and keep provider loading state aligned with the new attempt-creation step |
| `web/src/pages/LoginSplit.tsx` | Read and display callback-carried auth errors in the existing error banner |
| `web/src/pages/AuthCallback.tsx` | Parse callback errors, post attempt events to `platform-api`, clear attempt state, and keep welcome-vs-app routing deterministic |

**New test modules:** `2`

| File | Purpose |
|------|---------|
| `web/src/lib/authRedirects.test.ts` | Locks redirect-origin selection so login does not drift with dev port changes |
| `web/src/lib/authOAuthAttempts.test.ts` | Locks anonymous attempt creation and event-post payload shape against `platform-api` |

**Modified existing test modules:** `2`

| File | What changes |
|------|--------------|
| `web/src/pages/LoginSplit.test.tsx` | Add coverage for OAuth button render/initiation and callback-propagated error banner state |
| `web/src/pages/AuthCallback.test.tsx` | Cover callback failure, missing session, first-time OAuth routing, returning-user routing, and attempt-event posting |

**Modified supporting files:** `3`

| File | What changes |
|------|--------------|
| `web/.env.example` | Add `VITE_AUTH_REDIRECT_ORIGIN` and clarify that Google Drive Picker env vars are not Supabase social-login settings |
| `.env.example` | Add `AUTH_REDIRECT_ORIGINS` and `VITE_AUTH_REDIRECT_ORIGIN` to shared env documentation |
| `supabase/config.toml` | Align local auth URL configuration and add commented Google/GitHub provider stanzas for local parity |

## Investigation Evidence

- Existing intent doc: `docs/plans/_implemted-awating-qc/2026-03-17-oauth-login.md`
- Mounted auth flow: `web/src/pages/LoginSplit.tsx`, `web/src/pages/AuthCallback.tsx`, `web/src/pages/AuthWelcome.tsx`, `web/src/router.tsx`
- Current hosted provider state: `https://dbdzzhshmigewyprahej.supabase.co/auth/v1/settings` currently reports `google: false` and `github: false`
- Current targeted test state: `npm --prefix web run test -- src/pages/LoginSplit.test.tsx src/pages/AuthCallback.test.tsx` currently fails `AuthCallback.test.tsx` in the valid callback session case
- Existing app observability scope: `services/platform-api/app/main.py` and `services/platform-api/app/observability/otel.py` instrument `platform-api` routes and workers, but the current browser -> Supabase Auth -> browser login path bypasses that runtime completely
- Existing observability UI surface: `web/src/pages/ObservabilityTelemetry.tsx` and `web/src/pages/ObservabilityTraces.tsx` are placeholder pages, not a live trace explorer
- Official redirect rule: Supabase requires `redirectTo` URLs to be in the project Redirect URLs allow-list: https://supabase.com/docs/guides/auth/redirect-urls

## External Systems / Manual Configuration

1. Google Cloud Console OAuth client must use `https://dbdzzhshmigewyprahej.supabase.co/auth/v1/callback` as the authorized callback URL.
2. GitHub OAuth App must use `https://dbdzzhshmigewyprahej.supabase.co/auth/v1/callback` as the callback URL.
3. Supabase Authentication -> Providers must have both Google and GitHub enabled with valid client credentials.
4. Supabase Authentication -> URL Configuration must allow the exact local and production `/auth/callback` URLs this app will use.
5. `platform-api` runtime configuration must set `AUTH_REDIRECT_ORIGINS` to the same expected redirect-origin set the readiness endpoint reports.
6. The canonical production domain must be confirmed during execution before the allow-list is finalized.

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. Hosted Supabase project `dbdzzhshmigewyprahej` remains the actual OAuth and session authority.
2. `platform-api` becomes the owned observability control plane around the Supabase roundtrip; it does not replace Supabase Auth.
3. The provider callback URL remains `https://dbdzzhshmigewyprahej.supabase.co/auth/v1/callback`; do not move the provider callback itself into `platform-api`.
4. The mounted social-login UI remains the existing route stack: `/login`, `/auth/callback`, `/auth/welcome`, `/app`.
5. `AuthWelcome` is still required. Do not "fix" the flow by changing the profile trigger to bypass the welcome page for first-time OAuth users.
6. Google Drive Picker credentials in `web/.env.example` are a separate concern and must not be treated as Supabase social-login configuration.
7. Redirect targets must be explicit and allow-listed. Do not rely on arbitrary `window.location.origin` values from whatever local port happens to be open.
8. OAuth attempt tracking must work before a session exists. Therefore the create-attempt and record-event endpoints must support anonymous callers and must use a short-lived attempt secret rather than JWT-only auth.
9. Attempt credentials must live in `sessionStorage` only and must be cleared on terminal success or failure.
10. If attempt creation succeeds but `supabase.auth.signInWithOAuth()` fails before redirect, the frontend must immediately post a terminal `failed` event for that attempt, clear `sessionStorage`, and surface the initiation error in UI.
11. Superuser operators must be able to diagnose provider readiness and recent failures without depending on raw Supabase dashboard logs.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. `https://dbdzzhshmigewyprahej.supabase.co/auth/v1/settings` reports `google: true` and `github: true`.
2. The Google OAuth client and GitHub OAuth App both use `https://dbdzzhshmigewyprahej.supabase.co/auth/v1/callback` as their callback URL.
3. Supabase Auth URL Configuration includes the exact callback URLs for local development and the canonical production app domain.
4. Clicking either social-login button from `/login` creates an `auth_oauth_attempts` row with `status = 'started'`.
5. Returning through `/auth/callback` records callback/session/profile/result events against that attempt and emits the locked traces, metrics, and structured logs.
6. A first-time OAuth user with `profiles.display_name = null` routes to `/auth/welcome`.
7. A returning OAuth user with `profiles.display_name` set routes to `/app`.
8. A callback failure or provider misconfiguration produces a readable user-facing error and a failed OAuth attempt record with a non-null `failure_category`.
9. If `supabase.auth.signInWithOAuth()` fails before browser redirect, the attempt record is finalized as `failed`, `sessionStorage` is cleared, and the initiation error remains visible on `/login`.
10. `GET /admin/auth/oauth/providers/status` reports hosted provider readiness and the expected redirect-origin list for operators.
11. `GET /admin/auth/oauth/attempts/recent` returns recent attempts with enough state to diagnose the failing branch.
12. A new social-login user can be created and handed off to the storage-signup verification flow without social auth being the blocker.

### Locked Platform API Surface

#### New anonymous browser endpoints: `2`

1. `POST /auth/oauth/attempts`
2. `POST /auth/oauth/attempts/{attempt_id}/events`

#### New superuser-only endpoints: `2`

1. `GET /admin/auth/oauth/providers/status`
2. `GET /admin/auth/oauth/attempts/recent`

#### Existing `platform-api` auth endpoints reused as-is: `0`

### Locked Observability Surface

#### New traces: `4`

1. `auth.oauth.attempt.create`
2. `auth.oauth.attempt.event`
3. `auth.oauth.providers.status`
4. `auth.oauth.attempts.recent`

#### New metrics: `2 counters`, `1 histogram`

1. `platform.auth.oauth.attempts.count`
2. `platform.auth.oauth.failures.count`
3. `platform.auth.oauth.attempt.duration_ms`

#### New structured logs: `4`

1. `auth.oauth.attempt.started`
2. `auth.oauth.attempt.completed`
3. `auth.oauth.attempt.failed`
4. `auth.oauth.providers.status.checked`

Observability attribute rules:

- Allowed attributes: `auth.provider`, `event`, `result`, `status`, `failure_category`, `callback_error_code`, `profile_state`, `origin_allowed`, `has_next_path`, `http.status_code`, `duration_ms`, `limit`
- Forbidden in trace or metric attributes: `user_id`, `email`, access tokens, refresh tokens, raw OAuth codes, `attempt_secret`, raw redirect URLs, full callback query strings, auth headers

### Locked Inventory Counts

#### Database

- New migrations: `1`
- Modified existing migrations: `0`

#### Backend

- New `platform-api` route modules: `1`
- Modified backend modules: `2`
- New backend test modules: `1`
- Modified existing backend test modules: `0`

#### Frontend

- New top-level pages/routes: `0`
- New visual components: `0`
- New non-visual modules: `2`
- Modified existing app modules: `4`
- New frontend test modules: `2`
- Modified existing frontend test modules: `2`
- Modified supporting/config files: `3`

### Locked File Inventory

#### New files

- `supabase/migrations/20260321200000_auth_oauth_attempts.sql`
- `services/platform-api/app/api/routes/auth_oauth.py`
- `services/platform-api/tests/test_auth_oauth.py`
- `web/src/lib/authRedirects.ts`
- `web/src/lib/authOAuthAttempts.ts`
- `web/src/lib/authRedirects.test.ts`
- `web/src/lib/authOAuthAttempts.test.ts`

#### Modified files

- `services/platform-api/app/main.py`
- `services/platform-api/app/core/config.py`
- `web/src/auth/AuthContext.tsx`
- `web/src/components/auth/OAuthButtons.tsx`
- `web/src/pages/LoginSplit.tsx`
- `web/src/pages/AuthCallback.tsx`
- `web/src/pages/LoginSplit.test.tsx`
- `web/src/pages/AuthCallback.test.tsx`
- `web/.env.example`
- `.env.example`
- `supabase/config.toml`

## Frozen Social Auth Contract

The browser auth flow already exists in code. The repair is to make it operational and diagnosable by adding an owned seam around the hosted Supabase roundtrip, not by replacing Supabase Auth.

Do not implement this repair by:

1. moving the provider callback away from Supabase's `/auth/v1/callback`
2. adding a new edge function
3. reusing Google Drive Picker credentials for social login
4. changing profile-trigger behavior to skip `/auth/welcome`
5. storing OAuth attempt credentials in `localStorage`
6. storing raw access tokens, refresh tokens, OAuth codes, or full callback URLs in traces, metrics, or the `auth_oauth_attempts` table
7. treating unlisted dev ports as valid redirect targets

Supabase social auth and Google Drive Picker auth are separate systems. `VITE_GOOGLE_API_KEY`, `VITE_GOOGLE_CLIENT_ID`, and `VITE_GOOGLE_APP_ID` in `web/.env.example` are for the Drive Picker flow, not for `supabase.auth.signInWithOAuth()`.

## Explicit Risks Accepted In This Plan

1. Provider enablement and secrets remain partly manual in Supabase, Google, and GitHub dashboards; code alone cannot guarantee readiness.
2. `auth_oauth_attempts` retention cleanup is deferred in this phase; the table is expected to remain low-volume enough for short-term diagnosis.
3. No dedicated superuser UI for recent OAuth attempts is added in this phase; operators will use the admin endpoints and trace backend directly.
4. Canonical production domain inventory must be confirmed during execution because Vercel API access was unavailable in this investigation session.
5. Preview-domain social auth may remain unsupported after this repair if the operator chooses not to add preview wildcard redirect URLs.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked `platform-api` surface in this plan exists exactly as specified.
2. The locked traces, metrics, and structured logs exist exactly as specified.
3. The `auth_oauth_attempts` table exists exactly as specified and backs the new endpoints.
4. The locked file inventory matches the implemented files exactly.
5. `python -m pytest services/platform-api/tests/test_auth_oauth.py` passes.
6. `npm --prefix web run test -- src/lib/authRedirects.test.ts src/lib/authOAuthAttempts.test.ts src/pages/LoginSplit.test.tsx src/pages/AuthCallback.test.tsx` passes.
7. Manual Google and GitHub sign-in both succeed from an allow-listed local origin.
8. Failed callback/provider states are readable in UI and visible in recent attempts diagnostics.
9. The storage-signup verification workstream can proceed using a newly created social-login user.

---

## Writing Tasks

Execution notes:

- Use `@test-driven-development` for every code change.
- Use `@verification-before-completion` before any success claim.
- Do not start code changes until Task 1 external configuration state is complete enough to produce `google: true` and `github: true` from the hosted settings endpoint.

## Task 1: Lock External Provider Configuration

**File(s):** `supabase/config.toml`, `web/.env.example`, `.env.example`

**Step 1:** In the Supabase dashboard for project `dbdzzhshmigewyprahej`, open Authentication -> Providers and Authentication -> URL Configuration. Record the current provider state and redirect allow-list.

**Step 2:** In Google Cloud Console, configure the OAuth client callback URL as `https://dbdzzhshmigewyprahej.supabase.co/auth/v1/callback`.

**Step 3:** In GitHub Developer Settings, configure the OAuth App callback URL as `https://dbdzzhshmigewyprahej.supabase.co/auth/v1/callback`.

**Step 4:** In Supabase Authentication -> Providers, paste the Google client ID/secret and GitHub client ID/secret, then enable both providers.

**Step 5:** In Supabase Authentication -> URL Configuration, add these exact callback URLs:
- `http://localhost:5374/auth/callback`
- `http://127.0.0.1:5374/auth/callback`
- `http://localhost:5375/auth/callback`
- `http://127.0.0.1:5375/auth/callback`
- `https://<canonical-production-domain>/auth/callback`

**Step 6:** Update `supabase/config.toml` so local CLI auth config mirrors the intended callback allow-list and includes commented env-backed stanzas for `[auth.external.google]` and `[auth.external.github]`.

**Step 7:** Update `web/.env.example` and `.env.example` to add `VITE_AUTH_REDIRECT_ORIGIN=` and `AUTH_REDIRECT_ORIGINS=` plus a note that Google Drive Picker env vars are not social-login credentials.

**Step 8:** Set `AUTH_REDIRECT_ORIGINS` in the actual `platform-api` runtime environment to the same origin set expected by the readiness endpoint.

**Test command:** `curl.exe -s -H "apikey: <anon-key>" -H "Authorization: Bearer <anon-key>" "https://dbdzzhshmigewyprahej.supabase.co/auth/v1/settings"`

**Expected output:** JSON shows `"google":true` and `"github":true` under `"external"`.

**Commit:** `chore(auth): align hosted social login configuration`

## Task 2: Write the Failing Backend OAuth Attempt Tests

**File(s):** `services/platform-api/tests/test_auth_oauth.py`

**Step 1:** Add failing tests for `POST /auth/oauth/attempts` covering accepted providers, invalid providers, and attempt-row creation payload shape.

**Step 2:** Add failing tests for `POST /auth/oauth/attempts/{attempt_id}/events` covering valid secret, invalid secret, expired attempt, successful completion, and failed callback recording.

**Step 3:** Add failing tests for `GET /admin/auth/oauth/providers/status` and `GET /admin/auth/oauth/attempts/recent` covering unauthenticated rejection and superuser success paths.

**Step 4:** Add span/log assertions in the new test module by patching the route tracer/logger so the observability contract is locked before implementation.

**Test command:** `python -m pytest services/platform-api/tests/test_auth_oauth.py`

**Expected output:** New tests fail because the route module and endpoints do not exist yet.

**Commit:** `test(auth): add failing platform api oauth observability tests`

## Task 3: Add the OAuth Attempt Migration

**File(s):** `supabase/migrations/20260321200000_auth_oauth_attempts.sql`

**Step 1:** Create `auth_oauth_attempts` with columns for `attempt_id`, `provider`, `attempt_secret_hash`, `redirect_origin`, `next_path`, `status`, `result`, `failure_category`, `callback_error_code`, `profile_state`, `created_at`, `updated_at`, `expires_at`, `callback_received_at`, `session_detected_at`, and `finalized_at`.

**Step 2:** Add check constraints for valid provider and terminal status values plus indexes for `created_at desc`, `provider`, and `status`.

**Step 3:** Keep this migration additive only; do not rewrite any existing auth or profile tables.

**Test command:** `supabase db reset`

**Expected output:** The new migration applies successfully and the local database resets without migration errors.

**Commit:** `feat(auth): add oauth attempt tracking migration`

## Task 4: Add Platform API Config and Route Skeleton

**File(s):** `services/platform-api/app/core/config.py`, `services/platform-api/app/main.py`, `services/platform-api/app/api/routes/auth_oauth.py`

**Step 1:** Add `AUTH_REDIRECT_ORIGINS` parsing to `services/platform-api/app/core/config.py` so the API can report the expected allow-list it is validating against.

**Step 2:** Create `services/platform-api/app/api/routes/auth_oauth.py` with the router, request/response models, tracer/logger/meter declarations, and placeholder route functions matching the locked API surface.

**Step 3:** Mount the new router in `services/platform-api/app/main.py` before the plugin catch-all routes.

**Test command:** `python -m pytest services/platform-api/tests/test_auth_oauth.py`

**Expected output:** Route import errors disappear, but the new tests still fail on unimplemented behavior.

**Commit:** `feat(auth): add oauth observability route skeleton`

## Task 5: Implement Attempt Creation and Event Recording

**File(s):** `services/platform-api/app/api/routes/auth_oauth.py`

**Step 1:** Implement `POST /auth/oauth/attempts` so it validates the provider, hashes a generated `attempt_secret`, writes the row to `auth_oauth_attempts`, emits `auth.oauth.attempt.create`, increments `platform.auth.oauth.attempts.count`, and logs `auth.oauth.attempt.started`.

**Step 2:** Implement `POST /auth/oauth/attempts/{attempt_id}/events` so it verifies the attempt secret, rejects expired attempts, updates lifecycle timestamps and terminal status, emits `auth.oauth.attempt.event`, records failures in `platform.auth.oauth.failures.count`, and records duration into `platform.auth.oauth.attempt.duration_ms` when the attempt becomes terminal.

**Step 3:** Ensure trace and metric attributes follow the locked allow/forbid rules and that the table never stores raw secrets or OAuth tokens.

**Test command:** `python -m pytest services/platform-api/tests/test_auth_oauth.py`

**Expected output:** Attempt creation and event tests pass.

**Commit:** `feat(auth): implement oauth attempt lifecycle endpoints`

## Task 6: Implement Superuser Readiness and Recent-Attempts Endpoints

**File(s):** `services/platform-api/app/api/routes/auth_oauth.py`

**Step 1:** Implement `GET /admin/auth/oauth/providers/status` so it calls hosted Supabase Auth settings, returns Google/GitHub enabled flags, computes the Supabase callback URL, and returns the expected redirect-origin list from `AUTH_REDIRECT_ORIGINS`.

**Step 2:** Implement `GET /admin/auth/oauth/attempts/recent` so it returns recent attempts ordered by `created_at desc` with the locked response shape and limit handling.

**Step 3:** Emit `auth.oauth.providers.status` and `auth.oauth.attempts.recent` traces plus `auth.oauth.providers.status.checked` structured logs for the readiness endpoint.

**Test command:** `python -m pytest services/platform-api/tests/test_auth_oauth.py`

**Expected output:** Provider-status and recent-attempt tests pass.

**Commit:** `feat(auth): add oauth readiness and diagnostics endpoints`

## Task 7: Write the Failing Frontend OAuth Trace Tests

**File(s):** `web/src/lib/authRedirects.test.ts`, `web/src/lib/authOAuthAttempts.test.ts`, `web/src/pages/LoginSplit.test.tsx`, `web/src/pages/AuthCallback.test.tsx`

**Step 1:** Add failing tests for `authRedirects` that prove redirect URL generation uses `VITE_AUTH_REDIRECT_ORIGIN` when present and otherwise falls back to a known-safe browser origin.

**Step 2:** Add failing tests for `authOAuthAttempts` that lock anonymous attempt-create and event-post request payloads against the new `platform-api` endpoints.

**Step 3:** Update `LoginSplit.test.tsx` and `AuthCallback.test.tsx` so they cover callback error propagation, missing-session handling, first-time OAuth routing, returning-user routing, and clearing attempt state from `sessionStorage`.

**Step 4:** Add failing coverage for the pre-redirect failure path: attempt creation succeeds, `signInWithOAuth()` throws, the frontend posts a terminal `failed` event, clears `sessionStorage`, and preserves the initiation error in UI.

**Test command:** `npm --prefix web run test -- src/lib/authRedirects.test.ts src/lib/authOAuthAttempts.test.ts src/pages/LoginSplit.test.tsx src/pages/AuthCallback.test.tsx`

**Expected output:** New frontend tests fail because the helper modules and callback event flow do not exist yet.

**Commit:** `test(auth): add failing frontend oauth tracing tests`

## Task 8: Implement the Frontend Attempt and Callback Flow

**File(s):** `web/src/lib/authRedirects.ts`, `web/src/lib/authOAuthAttempts.ts`, `web/src/auth/AuthContext.tsx`, `web/src/components/auth/OAuthButtons.tsx`, `web/src/pages/LoginSplit.tsx`, `web/src/pages/AuthCallback.tsx`

**Step 1:** Implement `web/src/lib/authRedirects.ts` and `web/src/lib/authOAuthAttempts.ts` so the browser can build explicit redirect URLs and call the new anonymous `platform-api` endpoints.

**Step 2:** Update `web/src/auth/AuthContext.tsx` so `signInWithOAuth()` first creates the OAuth attempt, stores `attempt_id` and `attempt_secret` in `sessionStorage`, and only then calls `supabase.auth.signInWithOAuth()`.

**Step 3:** If `supabase.auth.signInWithOAuth()` throws before redirect, immediately post a terminal `failed` event with `failure_category = 'unexpected'` or a more specific mapped category, clear `sessionStorage`, and rethrow so the UI still renders the initiation error.

**Step 4:** Update `web/src/pages/AuthCallback.tsx` so it parses callback hash/query errors before calling `supabase.auth.getSession()`, posts `callback_received`, `session_detected`, `profile_missing` or `profile_present`, and `completed` or `failed` events back to `platform-api`, then clears `sessionStorage` on terminal states.

**Step 5:** Update `web/src/pages/LoginSplit.tsx` and `web/src/components/auth/OAuthButtons.tsx` so callback failures remain readable in UI and initiation failures still clear the loading state correctly.

**Test command:** `npm --prefix web run test -- src/lib/authRedirects.test.ts src/lib/authOAuthAttempts.test.ts src/pages/LoginSplit.test.tsx src/pages/AuthCallback.test.tsx`

**Expected output:** PASS

**Commit:** `feat(auth): wire frontend oauth attempt and callback diagnostics`

## Task 9: Verify End-to-End Backend and Frontend Coverage

**File(s):** verify only

**Step 1:** Run the backend test module: `python -m pytest services/platform-api/tests/test_auth_oauth.py`

**Step 2:** Run the targeted frontend test modules: `npm --prefix web run test -- src/lib/authRedirects.test.ts src/lib/authOAuthAttempts.test.ts src/pages/LoginSplit.test.tsx src/pages/AuthCallback.test.tsx`

**Step 3:** Re-run the hosted provider state check: `curl.exe -s -H "apikey: <anon-key>" -H "Authorization: Bearer <anon-key>" "https://dbdzzhshmigewyprahej.supabase.co/auth/v1/settings"`

**Step 4:** With `platform-api` running locally, verify the admin diagnostics endpoints:
- `curl.exe -s -H "Authorization: Bearer <platform_api_m2m_token>" "http://localhost:8000/admin/auth/oauth/providers/status"`
- `curl.exe -s -H "Authorization: Bearer <platform_api_m2m_token>" "http://localhost:8000/admin/auth/oauth/attempts/recent?limit=10"`

**Test command:** `python -m pytest services/platform-api/tests/test_auth_oauth.py && npm --prefix web run test -- src/lib/authRedirects.test.ts src/lib/authOAuthAttempts.test.ts src/pages/LoginSplit.test.tsx src/pages/AuthCallback.test.tsx`

**Expected output:** Both commands pass; hosted settings show `google: true` and `github: true`; admin endpoints return JSON with provider readiness and recent attempts.

**Commit:** `none - verification checkpoint`

## Task 10: Run the Social Auth Smoke Sweep

**File(s):** verify only

**Step 1:** Start the frontend on an allow-listed origin: `npm --prefix web run dev`

**Step 2:** Manually verify Google:
1. open `/login`
2. click `Continue with Google`
3. complete consent
4. confirm first-time user goes to `/auth/welcome`
5. confirm the corresponding attempt appears in recent attempts with `result = 'welcome'`
6. submit display name
7. confirm arrival at `/app`

**Step 3:** Manually verify GitHub with the same flow.

**Step 4:** Re-run a returning-user flow and confirm `/auth/callback` routes straight to `/app` and the recent-attempt record ends with `result = 'app'`.

**Step 5:** Trigger one intentional misconfiguration or blocked-provider case and confirm the user sees a readable error and the recent-attempt record ends with `status = 'failed'` and a non-null `failure_category`.

**Step 6:** Hand the newly working signup path back to the storage-signup verification workstream and continue its acceptance test with a fresh social-login user.

**Test command:** `npm --prefix web run test -- src/lib/authRedirects.test.ts src/lib/authOAuthAttempts.test.ts src/pages/LoginSplit.test.tsx src/pages/AuthCallback.test.tsx`

**Expected output:** PASS

**Commit:** `none - manual smoke verification`

## Execution Handoff

1. The plan document path is `docs/plans/auth/2026-03-21-social-auth-login-repair.md`.
2. Read the plan fully before starting.
3. Follow the locked decisions exactly; do not improvise around the new `platform-api` or migration surface.
4. If the canonical production domain, attempt-storage shape, or welcome-route contract needs to change, stop and revise the plan first.
