# OpenTelemetry-First Observability Contract Implementation Plan

**Goal:** Consolidate the in-scope `platform-api` observability foundation behind a product-owned OpenTelemetry contract so canonical names, selected in-scope span names, safe/redacted attributes, and bootstrap/config are owned by `app.observability`, while removing runtime and deploy ambiguity so the downstream live telemetry rollout depends only on an approved OTLP sink contract rather than further runtime abstraction decisions.

**Architecture:** Keep `platform-api` on the standard OpenTelemetry SDK plus OTLP export. Introduce a small shared contract layer in `services/platform-api/app/observability` that exposes exact canonical naming, redaction, and config/bootstrap seams consumed by the in-scope auth/secrets, crypto, and storage foundation surfaces. Preserve current route shapes and current metric/log names. Keep sink/backend concerns in environment, deploy, and Docker surfaces only. Existing local SigNoz compose stays as an optional development sink and candidate first live sink, but no application code may import or branch on SigNoz-specific libraries or APIs. This plan does not provision a live OTLP backend; it must leave the downstream rollout needing only sink endpoint, auth, and verification-path facts.

**Tech Stack:** FastAPI, OpenTelemetry SDK, OTLP HTTP exporters, pytest, GCP Cloud Run, Secret Manager, Docker Compose, existing local SigNoz stack.

## Current Verified Starting State

- `services/platform-api/app/observability/otel.py` already boots traces, metrics, logs, and safe attribute filtering.
- `services/platform-api/app/observability/storage_metrics.py` already acts like a small domain metric helper, but other domains still define names inline.
- `services/platform-api/app/core/config.py` mixes standard OTEL env with vendor-specific UI env (`SIGNOZ_UI_URL`, `JAEGER_UI_URL`).
- `scripts/deploy-cloud-run-platform-api.ps1` owns current Cloud Run app secrets/env but not the full OTEL contract.
- `docker/docker-compose.signoz.yml` provides a local SigNoz stack, but production currently has no identified live OTLP sink.
- Existing approved plans already depend on current metric/log names such as `platform.crypto.fallback.count`, `platform.secrets.list.count`, `platform.secrets.change.count`, and `secrets.changed`.

## Manifest

### Platform API

No new business endpoints are introduced in this plan.

Existing runtime surfaces affected:

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/observability/telemetry-status` | Continue reporting telemetry config from sink-neutral OTel settings | Existing - helper/config-driven internal behavior change only; shape preserved |
| GET | `/secrets` | Keep current metric emission but source names from shared contract exports | Existing - internal instrumentation change only |
| POST | `/secrets` | Keep current change metric/log emission but source names from shared contract exports | Existing - internal instrumentation change only |
| POST | `/variables` | Preserve alias behavior; no route contract change beyond shared instrumentation reuse if it hits the same secrets handlers | Existing - verification only |
| POST | `/connections/test` | Keep fallback metric emission but source names from shared contract exports | Existing - internal instrumentation change only |

Route-file note:

- `services/platform-api/app/api/routes/telemetry.py` remains a thin authenticated pass-through to `get_telemetry_status()`. The surface changes indirectly through helper/config behavior, not through route-file edits, router registration, or auth changes.

### Observability

No existing metric, span, or structured log names may be renamed in this plan.

In-scope canonical names to centralize:

| Type | Name | Where used now | Contract requirement |
|------|------|----------------|----------------------|
| Metric | `platform.crypto.fallback.count` | `services/platform-api/app/infra/crypto.py` | Name preserved, shared export |
| Metric | `platform.secrets.list.count` | `services/platform-api/app/api/routes/secrets.py` | Name preserved, shared export |
| Metric | `platform.secrets.change.count` | `services/platform-api/app/api/routes/secrets.py` | Name preserved, shared export |
| Structured log | `secrets.changed` | `services/platform-api/app/api/routes/secrets.py` | Name preserved, shared export |
| Meter/tracer namespace | `platform.storage` | `services/platform-api/app/observability/storage_metrics.py` | Shared contract owns the stable storage meter/tracer identity; storage-specific metric names remain local to `storage_metrics.py` in this pass |
| Safe attribute policy | Redaction of `authorization`, `token`, `jwt`, `prompt`, `body`, `content`, `secret` keys | `services/platform-api/app/observability/otel.py` | Shared helper remains the single policy source |

Observability rules:

- Application code may depend on OpenTelemetry SDK interfaces and `app.observability`, not on SigNoz-specific SDKs or APIs.
- Sink-specific settings must be expressed only through OTLP environment or secret configuration.
- `SIGNOZ_UI_URL` and `JAEGER_UI_URL` remain compatibility fields in this plan; they may be populated from deployment config but must not drive instrumentation behavior.
- If authenticated OTLP export is needed, use `OTEL_EXPORTER_OTLP_HEADERS` or a clearly named compatibility alias mapped into that setting.
- This pass centralizes names, redaction, and config/bootstrap. It does not introduce a generic recording wrapper; in-scope modules may continue using the OpenTelemetry SDK directly except where helper modules already exist.

Target contract module API (`services/platform-api/app/observability/contract.py`):

- `SENSITIVE_ATTRIBUTE_KEYS`
- `safe_attributes(attrs: dict[str, Any]) -> dict[str, Any]`
- `SECRETS_LIST_COUNTER_NAME = "platform.secrets.list.count"`
- `SECRETS_CHANGE_COUNTER_NAME = "platform.secrets.change.count"`
- `SECRETS_CHANGED_LOG_EVENT = "secrets.changed"`
- `CRYPTO_FALLBACK_COUNTER_NAME = "platform.crypto.fallback.count"`
- `SECRETS_LIST_SPAN_NAME = "secrets.list"`
- `SECRETS_CREATE_SPAN_NAME = "secrets.create"`
- `SECRETS_UPDATE_SPAN_NAME = "secrets.update"`
- `SECRETS_DELETE_SPAN_NAME = "secrets.delete"`
- `STORAGE_TRACER_NAME = "platform.storage"`
- `STORAGE_METER_NAME = "platform.storage"`

Span-name note:

- The four `SECRETS_*_SPAN_NAME` constants above are tied to the current emitters already present in `services/platform-api/app/api/routes/secrets.py`. In this plan they are centralized as in-scope existing names, not as the start of a broader tracing standardization pass.

Config precedence for this plan:

- Runtime exporter behavior is driven only by standard `OTEL_*` settings.
- `Settings` gains exactly one runtime header field: `otel_exporter_otlp_headers: str | None`.
- If deploy tooling accepts secret-backed or compatibility inputs for OTLP headers, it must materialize them into `OTEL_EXPORTER_OTLP_HEADERS` before process start rather than inventing a second runtime field.
- If both `OTEL_EXPORTER_OTLP_HEADERS` and any deploy-time compatibility source are present, `OTEL_EXPORTER_OTLP_HEADERS` wins.
- Empty or whitespace-only header values are treated as unset.
- Non-empty malformed header strings (anything other than comma-delimited `key=value` pairs) are a startup/config error. Bootstrap must raise explicitly rather than silently ignoring them, and tests must lock that behavior. Parsing trims surrounding whitespace around keys and values; empty keys are invalid; duplicate keys are rejected as startup/config errors.
- `SIGNOZ_UI_URL` and `JAEGER_UI_URL` remain compatibility-only status fields and must never influence exporter construction.

### Database Migrations

None.

### Edge Functions

None.

### Frontend Surface Area

None.

### Deployment Surface

| Surface | Change |
|---------|--------|
| `.env.example` | Declare the OTel-first env contract and mark vendor-specific UI vars as optional compatibility only |
| `scripts/deploy-cloud-run-platform-api.ps1` | Own first-class OTEL env and secret-backed OTLP header wiring |
| `docker/docker-compose.signoz.yml` | Reposition as optional dev sink infrastructure; no app-specific assumptions baked into runtime code |
| `services/platform-api/OBSERVABILITY.md` | Document the product-owned OTel contract and how optional sinks attach to it |

## Locked Decisions

- OpenTelemetry is the first-class product contract. SigNoz is an implementation detail of one OTLP sink path.
- The shared abstraction lives in `services/platform-api/app/observability`; do not create a parallel vendor wrapper layer elsewhere.
- Existing emitted metric names and `secrets.changed` remain unchanged in this plan.
- `/observability/telemetry-status` keeps its current response shape in this plan so dependent rollout plans are not broken.
- `/observability/telemetry-status` remains implemented as a route pass-through to `get_telemetry_status()`; this plan does not move that route or change its auth seam.
- Vendor-specific UI fields remain compatibility-only output; exporter behavior must be driven by OTel settings, not by vendor name.
- This plan does not provision a live OTLP backend. It prepares the runtime and deploy contract so a later sink rollout can attach SigNoz or any other OTLP backend without application refactor.
- Local SigNoz remains allowed as a development and testing dependency via Docker Compose, but production code must remain sink-agnostic.
- This pass standardizes names/config now; helper standardization is limited to helpers that already exist (`storage_metrics.py`) or are trivial inside the named in-scope files.

## Locked Acceptance Contract

This plan is only complete when all of the following are true:

- `app.observability` exposes a stable product-owned observability contract for the in-scope foundation surfaces: canonical metric names, selected in-scope span names, structured log event names, safe attributes, and bootstrap/export config.
- In-scope auth/secrets, crypto, and storage emitters no longer hardcode their canonical names inline; they import shared contract exports instead.
- `scripts/deploy-cloud-run-platform-api.ps1` owns the OTEL deployment contract with first-class OTEL inputs and optional secret-backed OTLP headers.
- `.env.example` and service-local docs describe the OTel-first contract without presenting SigNoz as mandatory application logic.
- `docker/docker-compose.signoz.yml` remains usable as an optional dev sink without requiring code changes.
- Existing metric names, structured log event names, and `/observability/telemetry-status` response shape remain stable.
- This plan emits an explicit downstream handoff contract so the follow-on live telemetry rollout needs only approved sink endpoint, auth, and verification-path facts rather than further runtime-contract interpretation.

## Locked Platform API Surface

No path changes, auth changes, or request/response shape changes are allowed for:

- `/observability/telemetry-status`
- `/secrets`
- `/variables`
- `/connections/test`

Only internal instrumentation and config sourcing may change.

## Locked Observability Surface

The following names are frozen in this plan:

- `platform.crypto.fallback.count`
- `platform.secrets.list.count`
- `platform.secrets.change.count`
- `secrets.changed`
- `secrets.list`
- `secrets.create`
- `secrets.update`
- `secrets.delete`

The following behavior is frozen in this plan:

- sensitive attribute redaction rules remain centralized and shared
- OTEL bootstrap remains idempotent and no-op when `OTEL_ENABLED=false`
- OTLP export remains HTTP/protobuf unless explicitly changed later by a separate plan

## Locked Inventory Counts And File Inventory

### New files: 3

- `services/platform-api/app/observability/contract.py`
- `services/platform-api/tests/test_observability_contract.py`
- `services/platform-api/OBSERVABILITY.md`

### Modified existing files: 13

- `.env.example`
- `docker/docker-compose.signoz.yml`
- `scripts/deploy-cloud-run-platform-api.ps1`
- `services/platform-api/app/core/config.py`
- `services/platform-api/app/observability/__init__.py`
- `services/platform-api/app/observability/otel.py`
- `services/platform-api/app/observability/storage_metrics.py`
- `services/platform-api/app/api/routes/secrets.py`
- `services/platform-api/app/infra/crypto.py`
- `services/platform-api/tests/test_observability.py`
- `services/platform-api/tests/test_procfile_startup.py`
- `services/platform-api/tests/test_secrets.py`
- `services/platform-api/tests/infra/test_crypto.py`

### New test modules: 1

- `services/platform-api/tests/test_observability_contract.py`

## Frozen Seam Contract

- `SIGNOZ_UI_URL` and `JAEGER_UI_URL` remain compatibility env and response fields for this plan, but no new runtime behavior may depend on them.
- The local SigNoz stack in `docker/docker-compose.signoz.yml` is treated as a sink attachment behind OTLP, not as a code-level product dependency.
- The current live telemetry enablement and auth/secrets proof plans remain downstream consumers of this contract work; they must not be silently broken by vendor-specific field removal or metric renames.
- `services/platform-api/start-dev.sh` is outside this plan's write scope. It may continue echoing compatibility UI fields during local startup for one pass; that developer-only messaging does not define the runtime or deploy contract.

## Downstream Handoff Contract

After this plan lands, the downstream live telemetry rollout may assume all of the following without reinterpreting runtime design:

- `services/platform-api/app/observability/contract.py` exports exactly the canonical constants and helpers listed in the Observability section above.
- `services/platform-api/app/observability/__init__.py` re-exports only `configure_telemetry`, `shutdown_telemetry`, `get_telemetry_status`, and `safe_attributes`. All canonical constants in this plan are imported directly from `services/platform-api/app/observability/contract.py`.
- `services/platform-api/app/core/config.py` owns the following first-class settings after this plan: `otel_enabled`, `otel_service_name`, `otel_service_namespace`, `otel_deployment_env`, `otel_exporter_otlp_endpoint`, `otel_exporter_otlp_protocol`, `otel_exporter_otlp_headers`, `otel_traces_sampler`, `otel_traces_sampler_arg`, `otel_log_correlation`, `otel_metrics_enabled`, `otel_logs_enabled`, `signoz_ui_url`, and `jaeger_ui_url`.
- `services/platform-api/app/observability/otel.py` owns OTLP exporter creation and header parsing. It must parse `OTEL_EXPORTER_OTLP_HEADERS` from standard comma-delimited `key=value` pairs into exporter inputs for traces, metrics, and logs, and `get_telemetry_status()` must preserve its current JSON keys while never exposing header values.
- `scripts/deploy-cloud-run-platform-api.ps1` owns first-class OTEL deploy inputs after this plan: `-OtelEnabled`, `-OtelServiceName`, `-OtelServiceNamespace`, `-OtelDeploymentEnv`, `-OtelExporterOtlpEndpoint`, optional `-OtelExporterOtlpProtocol`, `-OtelLogCorrelation`, `-OtelMetricsEnabled`, `-OtelLogsEnabled`, `-SignozUiUrl`, optional `-JaegerUiUrl`, and optional OTLP header-secret controls (`-OtelHeadersSecretName`, `-UseExistingOtelHeadersSecret`, plus plaintext/env fallback only when intentionally creating the secret).
- `services/platform-api/app/api/routes/secrets.py`, `services/platform-api/app/infra/crypto.py`, and `services/platform-api/app/observability/storage_metrics.py` no longer hardcode the frozen canonical metric/log names after this plan.
- This plan does not standardize a new generic recording API. Routes may continue to call OTel SDK primitives directly; the contract guarantee is stable names, stable config/bootstrap, stable redaction, and stable deploy ownership.
- After this plan, the only remaining blocker for the downstream live telemetry rollout is an operator-approved OTLP sink contract: endpoint, whether headers are required, where those headers live, where the sink is queried, and how the three frozen metrics are proved after deploy.

## Risks And Unknowns

- Instrumentation is spread across multiple route modules; this plan intentionally consolidates only the shared contract and the auth/secrets and storage foundation surfaces, not every AGChain route in one pass.
- A future cleanup plan will still be needed if you want to remove `SIGNOZ_UI_URL` and `JAEGER_UI_URL` from the public telemetry-status contract entirely.
- This plan does not solve the current live OTLP sink absence by itself; a separate sink deployment or approval step will still be needed before live metric proof can complete.
- If any currently in-scope route hardcodes additional observability names that are missed during implementation, implementation must stop and expand the locked file inventory before proceeding.

## Task Plan

### Task 1: Add the shared OpenTelemetry contract module

**File(s):** `services/platform-api/app/observability/contract.py`, `services/platform-api/app/observability/__init__.py`, `services/platform-api/tests/test_observability_contract.py`

- **Step 1:** Add a contract module that defines canonical meter, tracer, and log-event name exports for the in-scope auth, secrets, crypto, and storage surfaces.
- **Step 2:** Define the exact exported symbols listed in the Observability section rather than leaving the contract shape implicit.
- **Step 3:** Move the safe attribute filtering policy into the shared contract module or re-export it from there so one import path owns redaction semantics.
- **Step 4:** Re-export only `configure_telemetry`, `shutdown_telemetry`, `get_telemetry_status`, and `safe_attributes` through `app.observability.__init__`; import canonical constants directly from `contract.py`.
- **Step 5:** Add focused tests proving exact constant values, exact span/log names, and redaction behavior.

**Test command:** `pytest -q services/platform-api/tests/test_observability_contract.py services/platform-api/tests/test_observability.py`

**Expected output:** The new contract tests pass, existing observability bootstrap tests still pass, and the exact exported constant values and redaction behavior are locked.

**Commit:** `feat(observability): add shared otel contract module`

### Task 2: Make bootstrap and config OpenTelemetry-first and sink-neutral

**File(s):** `.env.example`, `services/platform-api/app/core/config.py`, `services/platform-api/app/observability/otel.py`, `services/platform-api/tests/test_observability.py`

- **Step 1:** Keep OTEL exporter and bootstrap behavior driven by standard OTel env names first.
- **Step 2:** Add `Settings.otel_exporter_otlp_headers` support if it does not already exist, treating empty values as unset and malformed comma-delimited `key=value` pairs as explicit startup/config errors.
- **Step 3:** Thread parsed OTLP headers through trace, metric, and log exporters from `otel.py`; no second runtime alias field is allowed.
- **Step 4:** Preserve `SIGNOZ_UI_URL` and `JAEGER_UI_URL` as compatibility outputs only; ensure bootstrap and export code does not branch on vendor UI settings.
- **Step 5:** Update `.env.example` to document the OTel-first contract and mark vendor-specific UI vars as optional compatibility hints.
- **Step 6:** Extend tests to lock sink-neutral bootstrap behavior, OTLP header parsing/precedence, and telemetry-status compatibility without leaking header values.

**Test command:** `pytest -q services/platform-api/tests/test_observability.py`

**Expected output:** Telemetry config parsing, OTLP header parsing/precedence, telemetry-status compatibility, and OTLP exporter setup all pass under the OTel-first contract.

**Commit:** `refactor(observability): make otel config sink-neutral`

### Task 3: Move auth, secrets, crypto, and storage emitters onto the shared contract

**File(s):** `services/platform-api/app/observability/storage_metrics.py`, `services/platform-api/app/api/routes/secrets.py`, `services/platform-api/app/infra/crypto.py`, `services/platform-api/tests/test_secrets.py`, `services/platform-api/tests/infra/test_crypto.py`

- **Step 1:** Replace inline canonical metric and log name strings in the in-scope files with imports from the shared contract module.
- **Step 2:** Keep existing metric increments, structured log emission points, and safe attribute usage behavior unchanged.
- **Step 3:** Keep recorder API scope explicit: do not introduce a new generic recorder wrapper; only centralize names and continue using the existing storage helper pattern where already present.
- **Step 4:** Ensure `storage_metrics.py` consumes the shared storage meter/tracer naming primitives; storage-specific metric helper names may remain local to that module in this pass.
- **Step 5:** Extend or adjust tests to prove names and event emission remain unchanged, and add a grep-based verification that the frozen canonical names are no longer hardcoded in the named in-scope files.

**Test command:** `pytest -q services/platform-api/tests/test_secrets.py services/platform-api/tests/infra/test_crypto.py services/platform-api/tests/test_observability_contract.py`

**Expected output:** Auth/secrets and fallback tests pass, the emitted canonical names remain unchanged while being sourced from shared contract exports, and the named in-scope files no longer hardcode those frozen names.

**Commit:** `refactor(observability): centralize auth secrets metric names`

### Task 4: Own the deployment contract and classify SigNoz correctly

**File(s):** `scripts/deploy-cloud-run-platform-api.ps1`, `services/platform-api/tests/test_procfile_startup.py`, `docker/docker-compose.signoz.yml`, `services/platform-api/OBSERVABILITY.md`

- **Step 1:** Extend the deploy script with first-class OTEL env inputs and optional secret-backed OTLP header support so deployment owns the sink-neutral contract.
- **Step 2:** Lock the exact deploy-script OTEL parameter surface declared in the Downstream Handoff Contract rather than leaving flag names implicit.
- **Step 3:** Add or extend tests proving a deploy after OTel enablement cannot silently drop the OTEL contract.
- **Step 4:** Update the SigNoz compose file only as needed to make its role explicit: optional dev sink infrastructure behind OTLP, not application coupling.
- **Step 5:** Add service-local documentation describing the OTel-first contract, compatibility fields, the no-generic-wrapper decision, and how downstream sink rollout attaches by supplying only sink facts.

**Test command:** `pytest -q services/platform-api/tests/test_procfile_startup.py && docker compose -f docker/docker-compose.signoz.yml config`

**Expected output:** Deploy-script tests pass, the compose file validates, and the service-local docs clearly describe SigNoz as an optional OTLP sink rather than an app abstraction while naming the exact downstream deploy inputs.

**Commit:** `chore(observability): own otel deploy contract`

### Task 5: Re-run the targeted observability foundation verification and hand off

**File(s):** None

- **Step 1:** Run the targeted test sweep for the new contract, bootstrap, auth/secrets emitters, and deploy-script coverage.
- **Step 2:** Verify no in-scope file inventory drift occurred beyond the locked list.
- **Step 3:** Record that this plan prepares but does not itself complete live metric proof.
- **Step 4:** Produce the handoff note in `services/platform-api/OBSERVABILITY.md` under a "Downstream rollout handoff" section, listing the exact downstream assumptions now guaranteed by this plan and the exact remaining sink facts still required.
- **Step 5:** Hand off to the live sink rollout plan with the new OTel-first contract locked in place.

**Test command:** `pytest -q services/platform-api/tests/test_observability_contract.py services/platform-api/tests/test_observability.py services/platform-api/tests/test_procfile_startup.py services/platform-api/tests/test_secrets.py services/platform-api/tests/infra/test_crypto.py`

**Expected output:** All targeted tests pass, the file inventory matches the locked counts, the downstream handoff contract is satisfied, and the repo is ready for a separate live OTLP sink rollout without further runtime abstraction changes.

**Commit:** `chore(observability): verify otel-first contract foundation`

## Verification Commands

- `pytest -q services/platform-api/tests/test_observability_contract.py services/platform-api/tests/test_observability.py services/platform-api/tests/test_procfile_startup.py services/platform-api/tests/test_secrets.py services/platform-api/tests/infra/test_crypto.py`
- `docker compose -f docker/docker-compose.signoz.yml config`
- `rg -n -S "platform.crypto.fallback.count|platform.secrets.list.count|platform.secrets.change.count|secrets.changed|secrets.list|secrets.create|secrets.update|secrets.delete" services/platform-api/app/api/routes/secrets.py services/platform-api/app/infra/crypto.py services/platform-api/app/observability/storage_metrics.py`

## Completion Criteria

- The product-owned observability contract exists under `app.observability` and is used by the in-scope auth, secrets, crypto, and storage foundation surfaces.
- OpenTelemetry remains the first-class abstraction in runtime code; no Signoz-specific SDK or runtime wrapper is introduced.
- Current canonical metric names, structured log event names, and telemetry-status response shape remain stable.
- Deployment and config surfaces own the OTEL contract and can point to any OTLP sink.
- The repo clearly represents SigNoz as an optional sink dependency, not as the product abstraction.
- The follow-up live sink rollout can proceed without additional runtime abstraction redesign and without reinterpreting the runtime/deploy contract; it only needs approved sink endpoint, auth, and verification-path facts.

## Execution Handoff

- Read this plan fully before implementation.
- Do not improvise vendor-specific runtime abstractions.
- If implementation needs a new public telemetry-status field or metric rename, stop and revise the plan.
- Do not expand this pass into a full AGChain-wide instrumentation migration; keep scope to the shared contract and the named in-scope surfaces.
- After this plan lands, update or rebase the live telemetry enablement plan on top of the new downstream handoff contract before claiming live auth/secrets metric proof complete.
