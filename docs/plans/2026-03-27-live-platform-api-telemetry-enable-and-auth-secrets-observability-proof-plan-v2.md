# Live Platform API Telemetry Enablement And Auth-Secrets Observability Proof Implementation Plan

**Goal:** Attach production `blockdata-platform-api` to the now-verified live SigNoz OTLP sink and finish the auth/secrets rollout by proving `platform.crypto.fallback.count`, `platform.secrets.list.count`, `platform.secrets.change.count`, and `secrets.changed` on the deployed service without further runtime code changes.

**Architecture:** Reuse the completed OpenTelemetry-first runtime and deploy contract that already landed in `services/platform-api`. Do not reopen runtime abstraction or deploy-script implementation work in this plan. Instead, consume the existing Cloud Run deploy path, point it at the verified SigNoz collector and UI, keep Cloud Logging as the log proof surface, and rerun the already-approved live auth/secrets browser/API/database proof paths against the newly telemetry-enabled production revision.

**Tech Stack:** Cloud Run, existing `scripts/deploy-cloud-run-platform-api.ps1`, SigNoz collector VM, SigNoz UI Metrics Explorer, Cloud Logging, Supabase, Playwright or equivalent authenticated browser verification, `gcloud`, PowerShell.

**Status:** Draft
**Author:** Codex (requested by user)
**Date:** 2026-03-27

## Current Verified Starting State

- The OpenTelemetry-first runtime contract from [2026-03-27-opentelemetry-first-observability-contract-implementation-plan.md](/E:/writing-system/docs/plans/2026-03-27-opentelemetry-first-observability-contract-implementation-plan.md) is already implemented and approved.
- Production Cloud Run service `blockdata-platform-api` is still on revision `blockdata-platform-api-00060-xf7`.
- Live Cloud Run env still has no OTEL-related env vars or telemetry secret bindings; the current env list is only `SUPABASE_URL`, `CONVERSION_MAX_WORKERS`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_SECRET_ENVELOPE_KEY`, `PLATFORM_API_M2M_TOKEN`, and `CONVERSION_SERVICE_KEY`.
- Secret Manager still has no telemetry-specific secret because the verified sink does not require OTLP auth headers.
- The live sink-discovery blocker from the prior plan is now resolved:
  - SigNoz collector host: `signoz-collector`
  - Zone: `us-central1-a`
  - Public IP: `34.171.202.230`
  - OTLP endpoint: `http://34.171.202.230:4318`
  - SigNoz UI: `http://34.171.202.230:8080`
  - Auth headers required: `No`
  - Query path for metrics proof: SigNoz UI Metrics Explorer
- Reachability is already verified from this workstation:
  - `Test-NetConnection 34.171.202.230 -Port 8080` succeeds
  - `Test-NetConnection 34.171.202.230 -Port 4318` succeeds
  - `http://34.171.202.230:8080` returns `200`
  - `http://34.171.202.230:4318/` returns `404`, which is acceptable for an OTLP collector root path
- Live Supabase already has the auth/secrets migrations applied and the earlier live auth/secrets browser/API/database proof has already succeeded once before telemetry enablement.
- Cloud Logging is already accessible and already contains live `secrets.changed` entries from prior auth/secrets CRUD verification.

## Manifest

### Platform API

No endpoint shapes change in this plan. The rollout only deploys existing runtime code with live OTEL env and then consumes existing endpoints for proof.

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/observability/telemetry-status` | Read deployed telemetry config after rollout using a superuser-authenticated identity | Existing - verification only |
| GET | `/secrets` | Trigger live list metric against the canonical surface | Existing - verification only |
| POST | `/secrets` | Trigger canonical create metric and `secrets.changed` log | Existing - verification only |
| PATCH | `/secrets/{secret_id}` | Trigger canonical update metric and `secrets.changed` log | Existing - verification only |
| DELETE | `/secrets/{secret_id}` | Trigger canonical delete metric and `secrets.changed` log | Existing - verification only |
| GET | `/variables` | Reconfirm deprecated alias list response and body keys | Existing - verification only |
| POST | `/variables` | Trigger alias write path while preserving `variable` body key | Existing - verification only |
| PATCH | `/variables/{variable_id}` | Reconfirm deprecated alias update path | Existing - verification only |
| DELETE | `/variables/{variable_id}` | Reconfirm deprecated alias delete path | Existing - verification only |
| POST | `/connections/test` | Exercise live fallback decrypt path | Existing - verification only |

#### Modified endpoint contracts

None. This plan must not change any request shape, response shape, auth seam, or router registration.

### Observability

No new metric, span, or log names are introduced in this plan. This plan only enables and proves the already-shipped observability surface against the verified live SigNoz sink.

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Metric | `platform.crypto.fallback.count` | `services/platform-api/app/infra/crypto.py:decrypt_with_fallback` | Prove live fallback decrypts reach the configured OTLP sink |
| Metric | `platform.secrets.list.count` | `services/platform-api/app/api/routes/secrets.py` list handler | Prove live list activity reaches the configured OTLP sink |
| Metric | `platform.secrets.change.count` | `services/platform-api/app/api/routes/secrets.py` create/update/delete handlers | Prove live CRUD activity reaches the configured OTLP sink |
| Structured log | `secrets.changed` | `services/platform-api/app/api/routes/secrets.py` | Prove live CRUD audit logs remain visible in Cloud Logging without secret names or values |

Observability rules:

- Exact live deployment values in this plan are:
  - `OTEL_ENABLED=true`
  - `OTEL_SERVICE_NAME=platform-api`
  - `OTEL_SERVICE_NAMESPACE=blockdata`
  - `OTEL_DEPLOYMENT_ENV=production`
  - `OTEL_EXPORTER_OTLP_ENDPOINT=http://34.171.202.230:4318`
  - `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`
  - `OTEL_LOG_CORRELATION=true`
  - `OTEL_METRICS_ENABLED=true`
  - `OTEL_LOGS_ENABLED=true`
  - `SIGNOZ_UI_URL=http://34.171.202.230:8080`
  - `JAEGER_UI_URL=http://34.171.202.230:8080`
- `OTEL_EXPORTER_OTLP_HEADERS` stays unset in this phase.
- For proof on the auth/secrets surfaces in this plan, the only accepted observable attributes are `action`, `result`, and `value_kind`.
- Forbidden in proof attributes and log payloads for this phase: user IDs, emails, subject IDs, secret names, variable names, raw secret values, ciphertext, token material, and connection identifiers.
- Forbidden: changing metric names, changing log event names, introducing new observability names, or logging secret names/values in Cloud Logging or OTLP attributes.

### Database Migrations

None. This rollout consumes the already-applied auth/secrets database state.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

No frontend code changes are permitted in this plan.

Existing production browser routes to verify only:

- `/app/secrets`
- `/app/settings/secrets`

### Deployment Surface

No repo file modifications are planned in this versioned rollout plan.

Read-only operational dependencies consumed during execution:

- `scripts/deploy-cloud-run-platform-api.ps1`
- Production Cloud Run service `blockdata-platform-api`
- SigNoz collector VM `signoz-collector`
- SigNoz UI Metrics Explorer
- Cloud Logging

## Pre-Implementation Contract

No major product, API, observability, deployment, or inventory decision may be improvised during execution. If this rollout unexpectedly requires runtime code changes, new telemetry secrets, a different OTLP sink, or a different proof surface, execution must stop and this plan must be revised first.

### Locked Product Decisions

1. This is now a deployment-and-proof plan, not a runtime implementation plan. The OTel-first runtime and deploy contract is already complete and out of scope for new code work here.
2. The live OTLP sink for this plan is the SigNoz collector VM at `http://34.171.202.230:4318`, and the UI proof surface is `http://34.171.202.230:8080`.
3. OTLP auth headers are not used in this phase. No telemetry Secret Manager entry is created or consumed.
4. `JAEGER_UI_URL` remains a compatibility field only and is set to the same SigNoz UI URL to eliminate localhost defaults while preserving the telemetry-status response shape.
5. Cloud Logging remains the deployed proof surface for `secrets.changed`; SigNoz is used to prove the three metrics.
6. The auth/secrets product contract stays frozen: `/secrets`, `/variables`, `/connections/test`, and `/observability/telemetry-status` keep their existing request/response shapes and auth seams, and `/observability/telemetry-status` continues to require a superuser-authenticated identity.
7. No repo file changes are allowed in this rollout plan. If execution reveals that code must change, stop and write a new implementation plan for that code work.

### Locked Acceptance Contract

The rollout is only complete when all of the following are true:

1. Production Cloud Run `blockdata-platform-api` is redeployed through the owned deploy script with the exact OTEL values listed in this plan.
2. Superuser-authenticated `GET /observability/telemetry-status` returns `enabled=true`, `deployment_environment=production`, `otlp_endpoint=http://34.171.202.230:4318`, `protocol=http/protobuf`, `signoz_ui_url=http://34.171.202.230:8080`, and `jaeger_ui_url=http://34.171.202.230:8080`.
3. `platform.secrets.list.count` is visible in SigNoz after a live authenticated `GET /secrets`.
4. `platform.secrets.change.count` is visible in SigNoz after live create/update/delete activity across the canonical `/secrets` path and at least one deprecated `/variables` write path.
5. `platform.crypto.fallback.count` is visible in SigNoz after a successful live fallback decrypt through `POST /connections/test` against a real legacy-encrypted row.
6. `secrets.changed` is visible in Cloud Logging for the CRUD flow and its emitted payload does not include secret names or values.
7. The previously verified auth/secrets browser/API/database proofs remain true after telemetry enablement.
8. No repo file inventory drift occurs; this rollout remains operational-only.

### Locked Platform API Surface

#### New platform API endpoints: `0`

#### Modified existing platform API endpoints: `0`

#### Existing platform API endpoints reused as-is: `10`

1. `GET /observability/telemetry-status` (superuser-authenticated)
2. `GET /secrets`
3. `POST /secrets`
4. `PATCH /secrets/{secret_id}`
5. `DELETE /secrets/{secret_id}`
6. `GET /variables`
7. `POST /variables`
8. `PATCH /variables/{variable_id}`
9. `DELETE /variables/{variable_id}`
10. `POST /connections/test`

### Locked Observability Surface

#### Existing metric names to prove: `3`

1. `platform.crypto.fallback.count`
2. `platform.secrets.list.count`
3. `platform.secrets.change.count`

#### Existing structured log names to prove: `1`

1. `secrets.changed`

#### Allowed deployment attributes and values

- Allowed OTEL env values are the exact values listed in the Observability section above.
- Forbidden in this phase: localhost OTLP endpoint, localhost UI fields, auth headers, metric renames, log renames, or any new metric/log names.

### Locked Inventory Counts

#### Repo changes

- New repo files: `0`
- Modified existing repo files: `0`

#### Tests

- New test modules: `0`
- Modified existing test modules: `0`

#### Database

- New migrations: `0`
- Modified existing migrations: `0`

### Locked File Inventory

#### New files

None.

#### Modified files

None.

#### Read-only operational dependencies

- `scripts/deploy-cloud-run-platform-api.ps1`
- `services/platform-api/app/core/config.py`
- `services/platform-api/app/observability/otel.py`
- `services/platform-api/OBSERVABILITY.md`

## Frozen Telemetry Rollout Contract

The runtime and deploy contract from the completed OTel-first plan is frozen for this phase. This rollout must not reopen OTLP header parsing, deploy-script parameter design, exporter protocol support, or SigNoz-vs-OTel abstraction decisions.

The compatibility-sensitive seams that must remain true during rollout are:

- `/observability/telemetry-status` keeps its current JSON keys.
- `/variables` keeps `variables` and `variable` body keys.
- `/secrets` remains metadata-only and never returns raw secret values.
- `JAEGER_UI_URL` remains a compatibility-only field and points to the SigNoz UI URL in this rollout.

## Explicit Risks Accepted In This Plan

1. The SigNoz UI and OTLP collector are currently exposed by public IP and firewall rule. This rollout accepts that operator-owned infrastructure state and does not harden the network perimeter.
2. Metric proof uses the SigNoz UI Metrics Explorer rather than a separate automated sink-query API.
3. The OTLP collector root path returns `404` when fetched directly; this is treated as normal for the collector and not as a rollout failure.
4. The fallback proof still depends on an existing real legacy-encrypted `user_provider_connections` row and an already-working live `/connections/test` flow.

## Task 1: Re-lock the live sink facts and current deployment gap

**File(s):** None

**Step 1:** Verify `signoz-collector` is still `RUNNING` in `us-central1-a` with public IP `34.171.202.230`.
**Step 2:** Verify `34.171.202.230:8080` and `34.171.202.230:4318` are still reachable from this workstation as a quick preflight gate only, not as proof of Cloud Run egress success.
**Step 3:** Verify production `blockdata-platform-api` still lacks OTEL env values before the rollout.
**Step 4:** Verify Secret Manager still has no telemetry-specific secret dependency.

**Test command:** `gcloud compute instances describe signoz-collector --project agchain --zone us-central1-a`, `Test-NetConnection 34.171.202.230 -Port 8080`, `Test-NetConnection 34.171.202.230 -Port 4318`, `gcloud run services describe blockdata-platform-api --project agchain --region us-central1`, `gcloud secrets list --project agchain`

**Expected output:** The SigNoz host remains reachable, no OTLP headers are required, the workstation preflight gate passes, and production Cloud Run still needs OTEL env attachment before the real post-deploy metric proof can begin.

**Commit:** None - verification gate only.

## Task 2: Deploy production platform-api with the live SigNoz OTEL settings

**File(s):** None in repo; consume `scripts/deploy-cloud-run-platform-api.ps1` as-is

**Step 1:** Prepare the existing deploy command with the exact OTEL values locked in this plan.
**Step 2:** Run the existing deploy script against `blockdata-platform-api` using the existing secret-backed backend credentials, the explicit live Supabase URL, and the live OTEL env values.
**Step 3:** Pass `-SignozUiUrl http://34.171.202.230:8080`.
**Step 4:** Pass `-JaegerUiUrl http://34.171.202.230:8080` so the compatibility field stops reporting localhost defaults.
**Step 5:** Do not pass `-OtelHeadersSecretName` and do not set `OTEL_EXPORTER_OTLP_HEADERS`.
**Step 6:** Verify the new revision becomes ready and receives traffic.

**Test command:** `./scripts/deploy-cloud-run-platform-api.ps1 -ProjectId agchain -Region us-central1 -SupabaseUrl https://dbdzzhshmigewyprahej.supabase.co -UseSecretManager -UseExistingSecret -UseExistingSupabaseServiceRoleSecret -UseExistingAppSecretEnvelopeKeySecret -OtelEnabled true -OtelServiceName platform-api -OtelServiceNamespace blockdata -OtelDeploymentEnv production -OtelExporterOtlpEndpoint http://34.171.202.230:4318 -OtelExporterOtlpProtocol http/protobuf -OtelLogCorrelation true -OtelMetricsEnabled true -OtelLogsEnabled true -SignozUiUrl http://34.171.202.230:8080 -JaegerUiUrl http://34.171.202.230:8080`, followed by `gcloud run services describe blockdata-platform-api --project agchain --region us-central1`

**Expected output:** A new ready revision is serving traffic and Cloud Run now owns the complete OTEL config set for this sink without introducing OTLP headers.

**Commit:** None - operational deploy only.

## Task 3: Prove live telemetry on the deployed revision

**File(s):** None

**Step 1:** Use a superuser-authenticated `GET /observability/telemetry-status` to prove the deployed revision reports the exact non-local OTEL values from this plan.
**Step 2:** Trigger live authenticated `GET /secrets` and record the time window for the list proof.
**Step 3:** Trigger live create, update, and delete activity through `/secrets`.
**Step 4:** Trigger at least one live deprecated alias write path through `/variables` and clean it up through `/variables/{variable_id}`.
**Step 5:** Trigger live `POST /connections/test` against the known legacy-encrypted connection row.
**Step 6:** Wait at least one metric export interval plus ingestion delay before treating missing metrics as failure.
**Step 7:** Use the SigNoz UI Metrics Explorer to prove `platform.secrets.list.count`, `platform.secrets.change.count`, and `platform.crypto.fallback.count`.
**Step 8:** Query Cloud Logging for `secrets.changed` from the new revision and verify the entries do not contain secret names or values.

**Test command:** Superuser-authenticated `GET /observability/telemetry-status`, authenticated `GET /secrets`, live `/secrets` CRUD, live `/variables` write-path request, live `POST /connections/test`, SigNoz UI Metrics Explorer queries, `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=blockdata-platform-api AND textPayload:secrets.changed" --project agchain`

**Expected output:** The telemetry-status payload is non-local and enabled, all three frozen metrics are visible in SigNoz for the new revision and request window, and `secrets.changed` is visible in Cloud Logging without leaking secret names or values.

**Commit:** None - live proof only.

## Task 4: Reconfirm auth/secrets no-regression and package final evidence

**File(s):** None

**Step 1:** Reconfirm the authenticated `/app/secrets` redirect still lands on `/app/settings/secrets`.
**Step 2:** Reconfirm the Settings / Secrets CRUD flow still works on production.
**Step 3:** Reconfirm `/secrets` responses remain metadata-only and `/variables` still preserves `variables` and `variable` body keys.
**Step 4:** Re-run the live auth/secrets DB spot checks that should remain unchanged under telemetry-only rollout: migration presence, uppercase normalization, and browser-role grant revocation.
**Step 5:** Capture the final evidence set: Cloud Run revision/env, telemetry-status payload, SigNoz metric screenshots or query results, Cloud Logging results, fallback proof request, browser/API no-regression proof, and DB spot-check results.
**Step 6:** Hand the evidence set back to post-implementation evaluation for the auth/secrets rollout contract.

**Test command:** Authenticated browser verification for `/app/secrets` and `/app/settings/secrets`, authenticated canonical and alias API verification for `/secrets` and `/variables`, live DB spot queries, and the evidence bundle from Task 3

**Expected output:** Telemetry enablement does not regress the shipped auth/secrets behavior, and the evidence packet is sufficient for final evaluation.

**Commit:** None - evidence capture and audit only.

## Verification Commands

- `gcloud compute instances describe signoz-collector --project agchain --zone us-central1-a`
- `Test-NetConnection 34.171.202.230 -Port 8080`
- `Test-NetConnection 34.171.202.230 -Port 4318`
- `gcloud run services describe blockdata-platform-api --project agchain --region us-central1`
- Superuser-authenticated `GET https://blockdata-platform-api-sqsmf5q2rq-uc.a.run.app/observability/telemetry-status`
- Authenticated `GET /secrets`
- Live `/secrets` and `/variables` CRUD requests
- Live `POST /connections/test`
- SigNoz UI Metrics Explorer against `http://34.171.202.230:8080`
- `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=blockdata-platform-api AND textPayload:secrets.changed" --project agchain`
- SQL:

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
select version, name
from supabase_migrations.schema_migrations
where name in ('create_user_variables', 'user_secret_store_hardening')
order by version;
```

## Completion Criteria

1. The verified SigNoz sink remains reachable and is the live OTLP sink used by production `blockdata-platform-api`.
2. Production telemetry-status proves telemetry is enabled with the exact non-local OTEL values locked in this plan.
3. `platform.secrets.list.count`, `platform.secrets.change.count`, and `platform.crypto.fallback.count` are all observed in SigNoz for the new production revision.
4. `secrets.changed` is observed in Cloud Logging without leaking secret names or values.
5. No auth/secrets browser, API, or database contract regresses while telemetry is enabled.
6. Repo inventory remains unchanged: this rollout completes with zero repo file modifications.

## Execution Handoff

- Read this plan fully before execution.
- Reuse the existing OTel-first runtime and deploy contract exactly as implemented; do not reopen runtime design in this rollout.
- If the SigNoz endpoint, UI path, or auth model changes, stop and revise this plan before deploying.
- If execution reveals that code changes are needed after all, stop and write a new implementation plan for that code work rather than improvising it inside this rollout.
