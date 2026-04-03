# Live Platform API Telemetry Enablement And Auth-Secrets Observability Proof Plan

**Goal:** Enable a real live OTLP telemetry path for production `blockdata-platform-api` and close the remaining auth/secrets rollout gap by proving `platform.crypto.fallback.count`, `platform.secrets.list.count`, `platform.secrets.change.count`, and `secrets.changed` on the deployed service.

**Architecture:** Keep the shipped auth/secrets runtime, API shapes, and database contract unchanged. Extend the live Cloud Run deployment contract so `platform-api` can export to an operator-approved OTLP sink, use Cloud Logging as the deployed log sink, then rerun the already-approved live auth/secrets proof paths against the current production service.

**Tech Stack:** Cloud Run, Secret Manager, FastAPI, existing OpenTelemetry SDK wiring in `services/platform-api`, Cloud Logging, gcloud, pytest.

## Current Verified Starting State

- Live Cloud Run revision `blockdata-platform-api-00060-xf7` is serving the current auth/secrets implementation successfully.
- Live Supabase already has `create_user_variables` and `user_secret_store_hardening` applied, plus the four additional pending migrations that were outside the auth/secrets plan.
- Live browser/API verification already succeeded for `/app/secrets`, `/app/settings/secrets`, `/secrets`, `/variables`, and `/connections/test`.
- `POST /connections/test` already succeeded against a real legacy `user_provider_connections` row, so the fallback runtime path exists live.
- Cloud Logging is accessible and already contains live `secrets.changed` entries from the CRUD verification flow.
- Live `/observability/telemetry-status` currently reports `enabled=false`, `deployment_environment=local`, `otlp_endpoint=http://localhost:4318`, `signoz_ui_url=http://localhost:8080`, and `jaeger_ui_url=http://localhost:16686`.
- Live Cloud Run env currently contains no OTEL-related env vars or secret bindings.
- Secret Manager currently contains no telemetry-related secrets.

## Manifest

### Platform API

No endpoint shape changes are permitted in this plan.

Existing runtime surfaces to consume during verification:

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/observability/telemetry-status` | Read deployed telemetry configuration | Existing - verification only |
| GET | `/secrets` | Trigger live list metric against canonical surface | Existing - verification only |
| POST | `/secrets` | Trigger live change metric and `secrets.changed` log | Existing - verification only |
| POST | `/variables` | Trigger legacy alias write path while preserving `variable` body key | Existing - verification only |
| POST | `/connections/test` | Exercise live fallback decrypt path | Existing - verification only |

### Observability

No new metric, span, or log names are introduced in this plan. This plan only enables and proves the already-shipped observability surface.

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Metric | `platform.crypto.fallback.count` | `services/platform-api/app/infra/crypto.py:decrypt_with_fallback` | Prove live fallback decrypts reach the configured OTLP sink |
| Metric | `platform.secrets.list.count` | `services/platform-api/app/api/routes/secrets.py` list handler | Prove live list activity reaches the configured OTLP sink |
| Metric | `platform.secrets.change.count` | `services/platform-api/app/api/routes/secrets.py` create/update/delete handlers | Prove live CRUD activity reaches the configured OTLP sink |
| Structured log | `secrets.changed` | `services/platform-api/app/api/routes/secrets.py` | Prove live CRUD audit logs remain visible in Cloud Logging without secret names or values |

Observability rules:

- Allowed deployment config changes: `OTEL_ENABLED`, `OTEL_SERVICE_NAME`, `OTEL_SERVICE_NAMESPACE`, `OTEL_DEPLOYMENT_ENV`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL`, optional `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_LOG_CORRELATION`, `OTEL_METRICS_ENABLED`, `OTEL_LOGS_ENABLED`, `SIGNOZ_UI_URL`, `JAEGER_UI_URL`.
- Forbidden: changing existing metric names, changing existing log event names, or logging secret names/values in Cloud Logging or OTLP attributes.
- If the chosen live OTLP sink requires auth headers, runtime support for `OTEL_EXPORTER_OTLP_HEADERS` must be added before rollout completion can be claimed.

### Database Migrations

None.

### Edge Functions

None.

### Frontend Surface Area

None.

### Deployment Surface

| Surface | Change |
|---------|--------|
| `scripts/deploy-cloud-run-platform-api.ps1` | Add first-class OTEL deployment inputs and secret-backed OTLP header support if required by the chosen sink |
| `services/platform-api/app/core/config.py` | Add optional `OTEL_EXPORTER_OTLP_HEADERS` config support if the sink requires authenticated OTLP export |
| `services/platform-api/app/observability/otel.py` | Pass OTLP headers to trace/metric/log exporters if required by the chosen sink |
| `services/platform-api/tests/test_observability.py` | Cover any new OTEL config parsing and ensure telemetry-status does not expose sensitive header values |
| `services/platform-api/tests/test_procfile_startup.py` | Cover deploy-script OTEL contract so live deploys cannot silently omit telemetry wiring again |

Existing prerequisite outside this plan's write scope:

- `services/platform-api/Procfile` remains unchanged. Live Cloud Run source deploys already depend on it for startup, but this telemetry plan does not modify it.

## Locked Decisions

- The auth/secrets API contract stays frozen. This plan does not change `/secrets`, `/variables`, `/connections/test`, or `/observability/telemetry-status` response shapes.
- Cloud Logging is the deployed log sink used to prove `secrets.changed`.
- The OTLP metric sink must be an operator-approved non-local endpoint reachable from Cloud Run production.
- Do not invent a localhost, ad hoc temporary collector, or developer laptop tunnel to satisfy proof requirements.
- If no live OTLP sink or operator access path can be identified, stop incomplete and hand back an infrastructure decision blocker.
- If OTLP sink authentication requires headers, use secret-backed configuration rather than hard-coded values.
- The deploy script must gain first-class OTEL inputs for the live contract: `-OtelEnabled`, `-OtelDeploymentEnv`, `-OtelExporterOtlpEndpoint`, `-SignozUiUrl`, optional `-JaegerUiUrl`, and optional OTLP header-secret controls (`-OtelHeadersSecretName`, `-UseExistingOtelHeadersSecret`, plus plaintext/env fallback only when creating the secret intentionally).
- Cloud Run revision env/secrets must be emitted as a complete OTEL config set on every deploy. A later deploy of `blockdata-platform-api` must not silently drop OTEL vars and revert telemetry to localhost defaults just because explicit OTEL flags were omitted.
- If a direct `gcloud run services update` emergency change is used during rollout, the owned deploy script must be updated in the same implementation so future deploys preserve the config.

## Locked Acceptance Contract

This plan is only complete when all of the following are true:

- Production Cloud Run `blockdata-platform-api` has live OTEL env configured and `/observability/telemetry-status` returns `enabled=true`.
- `/observability/telemetry-status` no longer reports localhost defaults for OTLP endpoint or UI fields.
- The chosen OTLP sink and access path are documented in rollout evidence.
- `platform.crypto.fallback.count` is observed in the live OTLP sink after a successful live fallback decrypt through `POST /connections/test`.
- `platform.secrets.list.count` is observed in the live OTLP sink after a live `GET /secrets`.
- `platform.secrets.change.count` is observed in the live OTLP sink after live create/update/delete activity.
- `secrets.changed` is observed in Cloud Logging for those CRUD actions and the emitted payload does not include secret names or values.
- The current auth/secrets browser/API/database proofs remain true after telemetry enablement.

## Risks And Unknowns

- The project currently has no documented production OTLP endpoint, no telemetry-related Secret Manager entries, and no OTEL env on the live service.
- At draft time, no concrete operator-owned OTLP sink is named in the repo or live secret inventory. Task 1 starts from that verified absence and must either identify an approved live sink or stop incomplete with a blocker.
- If the chosen sink requires authenticated OTLP headers, the current runtime cannot send them yet.
- If the operator cannot access the live OTLP sink UI or query path, completion remains blocked even if export is enabled.
- Changing deploy-time observability config without updating the owned script would reintroduce drift on the next backend deploy.

## Task Plan

### Task 1: Lock the live OTLP sink and access path

**File(s):** None

- **Step 1:** Inspect the live project for any existing operator-owned OTLP/SigNoz deployment, endpoint, secret, or access path.
- **Step 1a:** Treat the following as acceptable candidate classes, in priority order: an existing operator-owned SigNoz deployment already used for project telemetry, an existing operator-approved Grafana Cloud OTLP endpoint, or another existing production-approved OTLP HTTP collector already reachable from Cloud Run.
- **Step 2:** Confirm whether the sink requires authentication headers.
- **Step 3:** Confirm the operator can access both the live OTLP metric sink and Cloud Logging.
- **Step 4:** If no approved live sink or access path exists, stop incomplete and record the exact infrastructure blocker instead of deploying placeholder config.

**Test command:** `gcloud run services describe blockdata-platform-api --project agchain --region us-central1`, `gcloud secrets list --project agchain`, `gcloud logging logs list --project agchain`

**Expected output:** Either an operator-approved OTLP sink and access path are identified and recorded for the rollout, or an explicit infrastructure blocker is captured and the rollout stops incomplete.

**Commit:** None — discovery gate only.

### Task 2: Add owned runtime and deploy support for live telemetry config

**File(s):** `scripts/deploy-cloud-run-platform-api.ps1`, `services/platform-api/app/core/config.py`, `services/platform-api/app/observability/otel.py`, `services/platform-api/tests/test_observability.py`, `services/platform-api/tests/test_procfile_startup.py`

- **Step 1:** Add or extend automated tests that lock the intended OTEL deployment contract.
- **Step 2:** Extend the deploy script so OTEL env values are owned by the same rollout path as the existing backend secrets, using first-class OTEL parameters and complete env/secret emission on every deploy rather than ad hoc optional fragments.
- **Step 3:** If the chosen sink requires auth headers, add optional `OTEL_EXPORTER_OTLP_HEADERS` config loading and OTLP exporter header wiring for traces, metrics, and logs.
- **Step 4:** Ensure `/observability/telemetry-status` does not expose OTLP header secret material.
- **Step 5:** Add coverage that a deploy after OTEL enablement cannot silently drop the OTEL contract when the script is used again.
- **Step 6:** Run the targeted backend test coverage for the changed config/deploy surface.

**Test command:** `pytest -q services/platform-api/tests/test_observability.py services/platform-api/tests/test_procfile_startup.py`

**Expected output:** The targeted backend tests pass, including OTEL config parsing, telemetry-status safety, OTLP header handling when applicable, and deploy-script coverage for the owned Cloud Run telemetry contract and its no-drift behavior.

**Commit:** `feat: add owned OTEL deploy contract for platform-api`

### Task 3: Deploy production platform-api with live OTEL settings

**File(s):** None

- **Step 1:** Create or reuse any required Secret Manager entries for OTLP auth material.
- **Step 2:** Deploy `blockdata-platform-api` with the approved OTEL env and secret bindings.
- **Step 3:** Verify Cloud Run revision readiness and traffic assignment.
- **Step 4:** Verify authenticated `/observability/telemetry-status` now reports live OTEL config instead of localhost defaults.

**Test command:** `gcloud run services describe blockdata-platform-api --project agchain --region us-central1`, authenticated `GET /observability/telemetry-status`

**Expected output:** A ready production revision receives traffic, and authenticated telemetry status reports `enabled=true` with non-local OTLP/UI settings.

**Commit:** None — deployment and runtime verification only.

### Task 4: Re-run the live auth/secrets observability proof

**File(s):** None

- **Step 1:** Trigger live `GET /secrets` and prove `platform.secrets.list.count` in the OTLP sink.
- **Step 2:** Trigger live create/update/delete activity through `/secrets` and `/variables` and prove `platform.secrets.change.count`.
- **Step 3:** Exercise `POST /connections/test` against a real legacy-encrypted `user_provider_connections` row and prove `platform.crypto.fallback.count`.
- **Step 4:** Wait at least one metric export interval after the live requests before treating a missing metric as a failure. The current exporter flushes on a 15-second interval; allow that window plus normal sink ingestion delay.
- **Step 5:** Query Cloud Logging for `secrets.changed` from the same revision and verify the entries do not reveal secret names or values.

**Test command:** Authenticated `GET /secrets`, live `/secrets` and `/variables` create/update/delete requests, live `POST /connections/test`, OTLP sink query path identified in Task 1, `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=blockdata-platform-api AND textPayload:secrets.changed" --project agchain`

**Expected output:** `platform.secrets.list.count`, `platform.secrets.change.count`, and `platform.crypto.fallback.count` are all visible in the approved OTLP sink, and `secrets.changed` is visible in Cloud Logging without secret names or values.

**Commit:** None — live observability proof only.

### Task 5: Reconfirm no auth/secrets regression and capture evidence

**File(s):** None

- **Step 1:** Reconfirm the authenticated `/app/secrets` redirect and Settings / Secrets CRUD flow still works on production.
- **Step 2:** Reconfirm `/secrets` responses remain metadata-only and `/variables` responses still preserve `variables` and `variable` body keys.
- **Step 3:** Re-run the live auth/secrets DB spot checks that should remain unchanged under telemetry-only deploy work: auth/secrets migration history still present, `public.user_variables` still has zero non-uppercase rows, and browser roles still lack direct grants.
- **Step 4:** Capture final evidence for telemetry-status, Cloud Run env/revision, OTLP sink proof, Cloud Logging proof, fallback runtime proof, and the no-regression checks above.
- **Step 5:** Hand the evidence back to the live auth/secrets rollout plan and re-run post-implementation evaluation.

**Test command:** Authenticated browser verification for `/app/secrets` and `/app/settings/secrets`, authenticated canonical/alias API verification for `/secrets` and `/variables`, live DB spot queries for migration history, uppercase normalization, and grants, post-implementation re-evaluation against the auth/secrets rollout contract with the captured evidence set

**Expected output:** The previously verified auth/secrets browser/API/database proofs still pass after telemetry enablement, and the evidence packet is sufficient for the next evaluation pass.

**Commit:** None — evidence capture and audit only.

## Verification Commands

- `pytest -q services/platform-api/tests/test_observability.py services/platform-api/tests/test_procfile_startup.py`
- `gcloud run services describe blockdata-platform-api --project agchain --region us-central1`
- Authenticated `GET https://blockdata-platform-api-sqsmf5q2rq-uc.a.run.app/observability/telemetry-status`
- `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=blockdata-platform-api AND textPayload:secrets.changed" --project agchain`

## Completion Criteria

- The live OTLP sink is identified, operator-accessible, and wired into the owned deployment path.
- Live telemetry-status proves telemetry is enabled with non-local config.
- All required auth/secrets metrics are observed in the live OTLP sink.
- `secrets.changed` is observed in Cloud Logging without leaking secret names or values.
- No auth/secrets product contract regresses while telemetry is enabled.
