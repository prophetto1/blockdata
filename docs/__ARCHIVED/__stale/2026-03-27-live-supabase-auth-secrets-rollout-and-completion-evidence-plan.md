# 2026-03-27 Live Supabase Auth Secrets Rollout and Completion Evidence Plan

**Status:** Draft - pending approval
**Owner:** Codex
**Date:** 2026-03-27
**Primary intent source:** [2026-03-27-auth-secrets-variables-env-separation-implementation-plan-v2-1.md](E:/writing-system/docs/plans/2026-03-27-auth-secrets-variables-env-separation-implementation-plan-v2-1.md)
**Triggering evaluation:** third-party post-implementation evaluation on 2026-03-27 blocked approval because live rollout and completion evidence were missing
**Implemented prerequisite:** `origin/master` at `15747147` already contains the auth/secrets backend and frontend implementation

## Scope Statement

This plan owns live-environment rollout and completion evidence only.

It reconciles the live Supabase project with the already-shipped auth/secrets feature by applying the missing existing migrations in the correct order and capturing the live database, browser, API, and observability evidence required by the approved auth/secrets plan.

This plan does **not**:

- change platform-api, frontend, migrations, or telemetry code
- redesign secret storage around Supabase Vault
- change the `/secrets`, `/variables`, `/connections`, or `/app/settings/secrets` contracts
- replace the approved auth/secrets implementation plan

## Goal

Bring the live Supabase project and live app behavior into conformance with the shipped auth/secrets implementation and collect the missing completion evidence required for approval.

## Architecture

Current state established during investigation:

1. `origin/master` already contains the shipped auth/secrets implementation.
2. The live Supabase migration history does **not** contain:
   - `20260321173000_create_user_variables`
   - `20260327110000_user_secret_store_hardening`
3. The live Supabase project therefore does **not** contain `public.user_variables`.
4. The approved auth/secrets plan assumed `public.user_variables` already existed and only introduced the hardening migration plus completion verification.

Live rollout architecture for this follow-up plan:

1. Apply the missing existing migration [20260321173000_create_user_variables.sql](E:/writing-system/supabase/migrations/20260321173000_create_user_variables.sql) to create the physical secret store and owner-bound RLS policies.
2. Apply the existing hardening migration [20260327110000_user_secret_store_hardening.sql](E:/writing-system/supabase/migrations/20260327110000_user_secret_store_hardening.sql) to canonicalize names, revoke direct browser table access, and retain service-role access.
3. Verify the live database state directly.
4. Verify the live authenticated browser and API behavior against the already-shipped app.
5. Verify the live observability contract by forcing a real fallback decrypt path against an existing legacy-encrypted `user_provider_connections` row.

## Tech Stack

- Live Supabase production project
- Existing Supabase migrations under `supabase/migrations/`
- Supabase MCP migration/query tools
- Live platform-api deployment already on `origin/master`
- Live frontend deployment already on `origin/master`
- Playwright for authenticated browser verification
- The deployed OTLP/SigNoz/Jaeger telemetry sink actually configured for platform-api

## Manifest

### Platform API

No platform-api code changes in this plan.

Live endpoints exercised for verification:

| Verb | Path | Purpose |
| --- | --- | --- |
| GET | /secrets | Verify authenticated metadata listing works on live |
| POST | /secrets | Verify authenticated secret creation works on live |
| PATCH | /secrets/{secret_id} | Verify authenticated secret update/rotation works on live |
| DELETE | /secrets/{secret_id} | Verify authenticated secret deletion works on live |
| GET | /variables | Verify deprecated compatibility alias preserves `{"variables": [...]}` |
| POST | /variables | Required compatibility verification proving the legacy singular `{"variable": {...}}` write-path response shape |
| DELETE | /variables/{variable_id} | Cleanup the disposable alias-created secret through the deprecated compatibility surface |
| POST | /connections/test | Force a real decrypt-with-fallback path against an existing legacy-encrypted connection row |

### Observability

No new observability is added in this plan.

This plan proves the already-declared live signals:

| Type | Name | Proof path |
| --- | --- | --- |
| Metric | platform.crypto.fallback.count | Trigger fallback decrypt through `POST /connections/test` against a legacy-encrypted `user_provider_connections` row and observe the metric in the live sink |
| Metric | platform.secrets.list.count | Trigger live `GET /secrets` |
| Metric | platform.secrets.change.count | Trigger live create/update/delete secret actions |
| Structured log | secrets.changed | Observe a live create/update/delete action in the deployed log sink |

### Database Migrations

| Migration | Type | Why it is needed now |
| --- | --- | --- |
| 20260321173000_create_user_variables.sql | Existing prerequisite migration to apply | Live is missing `public.user_variables`, its index, and its RLS policies |
| 20260327110000_user_secret_store_hardening.sql | Existing prerequisite migration to apply | The approved auth/secrets plan depends on uppercase canonicalization and revoked browser table grants |

### Edge Functions

No edge function changes.

### Frontend Surface Area

No frontend code changes.

Live routes and UX to verify:

| Route | Purpose |
| --- | --- |
| /app/secrets | Verify compatibility redirect to `/app/settings/secrets` |
| /app/settings/secrets | Verify live Settings / Secrets CRUD works for an authenticated user |

## Pre-Implementation Contract

No product, API, or schema redesign is allowed in this follow-up rollout plan. If rollout reveals a missing capability that requires new code rather than migration application and evidence capture, stop and draft another plan.

## Locked Product Decisions

- The canonical live UI route remains `/app/settings/secrets`.
- `/app/secrets` remains a compatibility redirect only.
- `public.user_variables` remains the physical secret store in this phase.
- The two existing migrations must be applied in timestamp order. Do not hand-translate the SQL into ad hoc statements unless the migration application tool cannot record migration history.
- This plan targets the live Supabase production project, not a development branch.
- This plan does not create or modify repo code.
- Browser verification must use a real authenticated test user in the deployed environment.
- Test secret names must use a disposable prefix and be deleted before completion.
- Fallback-metric proof must use a real legacy-encrypted row. Prefer an existing `public.user_provider_connections` row because the live project already has connection rows and the shipped `/connections/test` path calls `decrypt_with_fallback`.
- If the deployed telemetry or log sinks are inaccessible to the operator, the rollout remains incomplete. Observability proof is mandatory in this plan.
- If no real legacy-encrypted row can be exercised, completion remains blocked because the approved auth/secrets acceptance contract requires live emission, not just local registration.

## Locked Acceptance Contract

This rollout is only complete when all of the following are true on the live production environment:

- Migration history contains `20260321173000_create_user_variables` and `20260327110000_user_secret_store_hardening`.
- `public.user_variables` exists with the expected columns, unique lower(name) index, user_id index, RLS enabled, and owner-bound CRUD policies.
- `anon` and `authenticated` no longer have direct table grants on `public.user_variables`.
- `service_role` retains `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on `public.user_variables`.
- `select count(*) from public.user_variables where name <> upper(name)` returns zero.
- Visiting `/app/secrets` while authenticated redirects to `/app/settings/secrets`.
- The live Settings / Secrets surface can list, create, update, and delete a disposable test secret.
- Live secret list/detail responses remain metadata-only and never expose plaintext or ciphertext.
- Deprecated `/variables` compatibility responses still preserve the legacy `variables` / `variable` body keys.
- At least one live deprecated `/variables` write path is exercised and returns the legacy singular `variable` response key.
- Case-insensitive create/update on live converges to uppercase persisted names.
- `platform.crypto.fallback.count` is observed in the live telemetry sink after a real fallback decrypt path.
- `platform.secrets.list.count`, `platform.secrets.change.count`, and `secrets.changed` are observed for the live CRUD actions in the deployed telemetry/log sinks.

## Locked Platform API Surface

No API shape changes are permitted in this plan.

The live verification must use the already-shipped contracts exactly as implemented:

- `/secrets` canonical metadata-only CRUD
- `/variables` deprecated compatibility alias preserving legacy body keys, including at least one verified live write-path returning `variable`
- `/connections/test` unchanged request/response shape while internally exercising dual-key fallback

## Locked Observability Surface

No new traces, metrics, or logs are introduced.

Live proof obligations:

- `platform.crypto.fallback.count` must be observed in the deployed telemetry sink after fallback succeeds
- `platform.secrets.list.count` must increment after live listing
- `platform.secrets.change.count` must increment after live create/update/delete
- `secrets.changed` must be present in the deployed log sink for the CRUD actions without secret names or values
- If the operator cannot access the deployed telemetry or log sinks, the rollout stops incomplete rather than downgrading observability proof to optional

## Locked Inventory Counts

### Database

- Applied existing migrations: 2
- New migrations: 0
- Modified existing migrations: 0

### Backend

- Modified existing backend modules: 0

### Shared Config

- Modified existing shared config files: 0

### Frontend

- Modified existing frontend files: 0

### Tests

- New test modules: 0
- Modified existing test modules: 0

## Locked File Inventory

### Existing migration files to apply

- supabase/migrations/20260321173000_create_user_variables.sql
- supabase/migrations/20260327110000_user_secret_store_hardening.sql

### New files

- None

### Modified files

- None

## Frozen Rollout Seam Contract

- The already-shipped code on `origin/master` is the release artifact. This plan may not change it.
- Migration application must record migration history in the live Supabase project.
- Live verification may create only disposable test data and must clean it up.
- If the deployed frontend or platform-api is not actually on the shipped auth/secrets commit, stop. That is a deployment-state problem outside this rollout plan.

## Risks

- Live Supabase may be missing more prerequisite migrations than the two already identified.
- The operator may not have authenticated browser credentials for a disposable test user.
- The live telemetry sink may be configured but not operator-accessible.
- The existing `user_provider_connections` rows may no longer be legacy-encrypted, in which case the fallback metric proof path must be revised before completion can be claimed.

## Task Plan

### Task 1: Confirm live starting state and rollout prerequisites

**File(s):** None

- **Step 1:** Confirm live migration history still lacks `20260321173000_create_user_variables` and `20260327110000_user_secret_store_hardening`.
- **Step 2:** Confirm `public.user_variables` is absent before rollout and `public.user_provider_connections` is present.
- **Step 3:** Confirm access to a real authenticated test user for the live browser flow.
- **Step 4:** Confirm access to the deployed telemetry sink and deployed log sink that receive platform-api metrics/logs. If either sink is inaccessible, stop incomplete.
- **Step 5:** Identify at least one live `user_provider_connections` row that can be exercised by `/connections/test` for fallback proof.

### Task 2: Apply the missing base migration to live Supabase

**File(s):** `supabase/migrations/20260321173000_create_user_variables.sql`

- **Step 1:** Apply the existing base migration to the live Supabase project using migration tooling that records migration history.
- **Step 2:** Verify `public.user_variables` now exists.
- **Step 3:** Verify the migration history records `20260321173000_create_user_variables`.

### Task 3: Apply the existing hardening migration to live Supabase

**File(s):** `supabase/migrations/20260327110000_user_secret_store_hardening.sql`

- **Step 1:** Apply the existing hardening migration to the live Supabase project.
- **Step 2:** Verify the migration history records `20260327110000_user_secret_store_hardening`.
- **Step 3:** Verify `select count(*) from public.user_variables where name <> upper(name)` returns zero.
- **Step 4:** Verify table grants show no `anon`/`authenticated` privileges and preserved `service_role` CRUD privileges.

### Task 4: Verify live database contract in detail

**File(s):** None

- **Step 1:** Verify the expected columns exist on `public.user_variables`.
- **Step 2:** Verify the unique `(user_id, lower(name))` index and the `user_id` index exist.
- **Step 3:** Verify RLS is enabled.
- **Step 4:** Verify the owner-bound select/insert/update/delete policies exist.

### Task 5: Verify live authenticated browser and API behavior

**File(s):** None

- **Step 1:** Use a real authenticated browser session to visit `/app/secrets` and confirm redirect to `/app/settings/secrets`.
- **Step 2:** Create a disposable test secret from the live UI using a mixed-case input name.
- **Step 3:** Update the same secret through the live UI using another mixed-case variant.
- **Step 4:** Delete the disposable test secret from the live UI.
- **Step 5:** Verify `/secrets` responses remain metadata-only.
- **Step 6:** Verify `GET /variables` still uses the legacy `variables` response key.
- **Step 7:** Create a disposable alias test secret through `POST /variables` and verify the response uses the legacy singular `variable` key.
- **Step 8:** Delete the alias-created disposable secret through `DELETE /variables/{variable_id}`.

### Task 6: Verify uppercase convergence on live data

**File(s):** None

- **Step 1:** Query the created disposable test secret row and confirm the persisted `name` is uppercase.
- **Step 2:** Verify live create/update operations accept mixed-case input names but return uppercase metadata.
- **Step 3:** Verify there are no remaining non-uppercase rows in `public.user_variables`.

### Task 7: Prove the live observability contract

**File(s):** None

- **Step 1:** Exercise the live `/connections/test` path against a legacy-encrypted `user_provider_connections` row so `decrypt_with_fallback` succeeds through the fallback key path.
- **Step 2:** Observe `platform.crypto.fallback.count` in the live telemetry sink after that request.
- **Step 3:** Observe `platform.secrets.list.count` and `platform.secrets.change.count` after the live CRUD verification flow.
- **Step 4:** Observe `secrets.changed` in the live log sink for the create/update/delete actions.
- **Step 5:** If any required metric or log proof cannot be observed in the deployed sinks, stop incomplete rather than treating the proof as waived.

### Task 8: Capture evidence and close the approval gap

**File(s):** None

- **Step 1:** Record the live migration-history evidence.
- **Step 2:** Record the DB grant and uppercase-normalization evidence.
- **Step 3:** Record the authenticated browser redirect/CRUD evidence.
- **Step 4:** Record the telemetry/log evidence.
- **Step 5:** Re-run plan compliance evaluation against the original auth/secrets plan with this evidence in hand.

## Verification Commands

Use the project migration history and SQL queries below during execution:

```sql
select count(*)::int as non_uppercase_count
from public.user_variables
where name <> upper(name);
```

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'user_variables'
  and grantee in ('anon', 'authenticated', 'service_role')
order by grantee, privilege_type;
```

```sql
select polname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'user_variables'
order by polname;
```

## Completion Criteria

This follow-up plan is complete only when the live production environment satisfies the locked acceptance contract and the original auth/secrets implementation can be re-evaluated with real rollout evidence instead of local test evidence alone.
