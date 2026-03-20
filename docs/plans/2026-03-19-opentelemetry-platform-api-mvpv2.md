# OpenTelemetry Platform API MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a production-shaped but low-risk OpenTelemetry MVP to `services/platform-api` with a local Collector development stack, OTLP trace export, FastAPI and `httpx` instrumentation, log correlation, and a minimal superuser-facing telemetry status page.

**Architecture:** The rollout is `platform-api` first, not whole-platform. Telemetry bootstrap is environment-driven at process start and does not depend on Supabase or `admin-config` reads. The implementation must be safe under this repo's current app lifecycle: `app = create_app()` at module import time, repeated `create_app()` calls in tests, and direct module-level app imports in other tests. Local development uses an OpenTelemetry Collector plus Jaeger for verification, and the frontend reads runtime status from a small authenticated `platform-api` endpoint.

**Tech Stack:** FastAPI, OpenTelemetry Python SDK, OTLP/HTTP exporter, OpenTelemetry Collector, Jaeger, React, existing `platformApiFetch`

---

## Scope and Constraints

### In scope

- `services/platform-api` only
- Local Collector config and local trace verification path
- Trace export over OTLP/HTTP
- FastAPI server instrumentation
- `httpx` client instrumentation
- Manual spans around key workflow boundaries
- Trace/log correlation in Python logs
- Minimal telemetry status endpoint and UI

### Explicitly out of scope for this plan

- `services/pipeline-worker` as a primary target
- Supabase Edge Function tracing
- Browser tracing in `web/`
- Database-driven telemetry bootstrap
- Full OpenTelemetry logs export pipeline
- Vendor-specific backend lock-in

### Repo facts this plan is based on

- Active backend service: `services/platform-api/app/main.py`
- Deprecated backend: `services/pipeline-worker/app/main.py`
- Existing env config seam: `services/platform-api/app/core/config.py`
- Existing runtime dependency install path: `services/platform-api/requirements.txt` and `services/platform-api/Dockerfile`
- Existing outbound `httpx` seam: `services/platform-api/app/infra/http_client.py`
- Existing frontend telemetry placeholders: `web/src/pages/ObservabilityTelemetry.tsx`, `web/src/pages/ObservabilityTraces.tsx`
- Existing authenticated frontend wrapper for `platform-api`: `web/src/lib/platformApi.ts`
- Existing admin policy/UI seam for observability values: `web/src/pages/settings/InstanceConfigPanel.tsx`

### Design decisions

1. **Env-first startup**
   `platform-api` telemetry bootstrap must succeed or cleanly no-op before the app starts serving requests. Do not read `observability.*` from Supabase during startup in this plan.

2. **Trace-first MVP**
   Implement traces first, plus log correlation. Do not ship OpenTelemetry log export in the MVP.

3. **Collector-first local verification**
   Export to a local Collector, then fan out to Jaeger and `debug` exporter for verification.

4. **Do not spend primary effort on deprecated services**
   `pipeline-worker` is not the first target. Add a follow-up note, not a full implementation task, unless real traffic still depends on it.

5. **Bootstrap must be idempotent**
   `configure_telemetry()` and `shutdown_telemetry()` must be safe when `create_app()` is called multiple times in one Python process and when the module-level `app` is imported by tests. Avoid duplicate global provider setup, duplicate FastAPI instrumentation, duplicate `httpx` instrumentation, and shutdown behavior that breaks later app instances.

6. **No PII or secrets in attributes**
   Do not record JWTs, full prompts, file contents, secrets, raw callback payloads, or unbounded IDs in span attributes.

---

## Target Files

### New files

- Create: `services/observability/otel-collector.local.yaml`
- Create: `services/docker-compose.observability.yml`
- Create: `services/platform-api/app/observability/__init__.py`
- Create: `services/platform-api/app/observability/otel.py`
- Create: `services/platform-api/app/api/routes/telemetry.py`
- Create: `services/platform-api/tests/test_observability.py`

### Modified files

- Modify: `services/platform-api/requirements.txt`
- Modify: `services/platform-api/app/core/config.py`
- Modify: `services/platform-api/app/main.py`
- Modify: `services/platform-api/app/api/routes/conversion.py`
- Modify: `services/platform-api/app/api/routes/parse.py`
- Modify: `services/platform-api/app/api/routes/load_runs.py`
- Modify: `services/platform-api/app/api/routes/plugin_execution.py`
- Modify: `services/platform-api/app/workers/storage_cleanup.py`
- Modify: `services/platform-api/start-dev.sh`
- Modify: `web/src/pages/ObservabilityTelemetry.tsx`
- Modify: `web/src/pages/ObservabilityTraces.tsx`

### Existing files to read before each task

- Read: `services/platform-api/app/main.py`
- Read: `services/platform-api/app/core/config.py`
- Read: `services/platform-api/app/infra/http_client.py`
- Read: `services/platform-api/tests/conftest.py`
- Read: `services/platform-api/tests/test_routes.py`
- Read: `services/platform-api/tests/test_parse_route.py`
- Read: `services/platform-api/tests/test_auth.py`
- Read: `web/src/lib/platformApi.ts`
- Read: `web/src/pages/ObservabilityTelemetry.tsx`
- Read: `web/src/pages/ObservabilityTraces.tsx`

---

## Environment Contract

This plan standardizes on these env vars for the MVP:

```text
OTEL_ENABLED=false
OTEL_SERVICE_NAME=platform-api
OTEL_SERVICE_NAMESPACE=blockdata
OTEL_DEPLOYMENT_ENV=local
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
OTEL_LOG_CORRELATION=true
JAEGER_UI_URL=http://localhost:16686
```

Notes:

- Use OTLP/HTTP for the first rollout.
- `OTEL_ENABLED=false` keeps the default startup path unchanged.
- The admin setting `observability.otel_endpoint` stays informational in this MVP and is not read at startup.

---

## Task 1: Add a local Collector and Jaeger dev stack

**Files:**
- Create: `services/observability/otel-collector.local.yaml`
- Create: `services/docker-compose.observability.yml`

**Step 1: Create the Collector config**

Write `services/observability/otel-collector.local.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 256
  batch:
    send_batch_size: 512
    timeout: 5s

exporters:
  debug:
    verbosity: normal
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [debug, otlp/jaeger]
```

**Step 2: Create the dev compose file**

Write `services/docker-compose.observability.yml`:

```yaml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otelcol/config.yaml"]
    volumes:
      - ./observability/otel-collector.local.yaml:/etc/otelcol/config.yaml:ro
    ports:
      - "4317:4317"
      - "4318:4318"

  jaeger:
    image: jaegertracing/jaeger:2.5.0
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    ports:
      - "16686:16686"
      - "4317"
```

**Step 3: Start and verify the local stack**

Run:

```bash
docker compose -f services/docker-compose.observability.yml up -d
docker compose -f services/docker-compose.observability.yml ps
```

Expected:

- `otel-collector` is running
- `jaeger` is running
- Jaeger UI is available at `http://localhost:16686`

**Step 4: Commit**

```bash
git add services/observability/otel-collector.local.yaml services/docker-compose.observability.yml
git commit -m "chore: add local OpenTelemetry collector and Jaeger dev stack"
```

---

## Task 2: Add telemetry settings to `platform-api`

**Files:**
- Modify: `services/platform-api/app/core/config.py`
- Modify: `services/platform-api/start-dev.sh`
- Test: `services/platform-api/tests/test_observability.py`

**Step 1: Extend the settings dataclass**

Add these fields to `Settings`:

```python
    otel_enabled: bool = False
    otel_service_name: str = "platform-api"
    otel_service_namespace: str = "blockdata"
    otel_deployment_env: str = "local"
    otel_exporter_otlp_endpoint: str = "http://localhost:4318"
    otel_exporter_otlp_protocol: str = "http/protobuf"
    otel_traces_sampler: str = "parentbased_traceidratio"
    otel_traces_sampler_arg: float = 1.0
    otel_log_correlation: bool = True
    jaeger_ui_url: str = "http://localhost:16686"
```

**Step 2: Add a local boolean parser**

```python
def _env_bool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}
```

**Step 3: Populate the new settings from env**

Update `Settings.from_env()` to read those env vars.

**Step 4: Surface the config in local startup output**

In `start-dev.sh`, print:

```bash
echo "OTEL_ENABLED:  ${OTEL_ENABLED:-false}"
echo "OTEL_OTLP:     ${OTEL_EXPORTER_OTLP_ENDPOINT:-http://localhost:4318}"
echo "JAEGER_UI_URL: ${JAEGER_UI_URL:-http://localhost:16686}"
```

Add a note in comments or task text that this script is bash-only.

**Step 5: Add config tests**

Add tests in `tests/test_observability.py` for:

- `OTEL_ENABLED=true` parsing
- endpoint parsing
- `OTEL_LOG_CORRELATION` default and override behavior

**Step 6: Run tests**

```bash
cd services/platform-api && pytest tests/test_observability.py::test_otel_settings_load_from_env -v
```

Expected:

- PASS

**Step 7: Commit**

```bash
git add services/platform-api/app/core/config.py services/platform-api/start-dev.sh services/platform-api/tests/test_observability.py
git commit -m "feat: add env-driven OpenTelemetry settings to platform-api"
```

---

## Task 3: Add OpenTelemetry bootstrap module

**Files:**
- Modify: `services/platform-api/requirements.txt`
- Create: `services/platform-api/app/observability/__init__.py`
- Create: `services/platform-api/app/observability/otel.py`
- Test: `services/platform-api/tests/test_observability.py`

**Step 1: Add Python dependencies**

Append to `requirements.txt`:

```text
opentelemetry-api>=1.28
opentelemetry-sdk>=1.28
opentelemetry-exporter-otlp-proto-http>=1.28
opentelemetry-instrumentation-fastapi>=0.49b0
opentelemetry-instrumentation-httpx>=0.49b0
opentelemetry-instrumentation-logging>=0.49b0
```

**Step 2: Add package init**

```python
from .otel import configure_telemetry, shutdown_telemetry, get_telemetry_status

__all__ = ["configure_telemetry", "shutdown_telemetry", "get_telemetry_status"]
```

**Step 3: Create the telemetry bootstrap module**

Implement:

```python
def configure_telemetry(app: FastAPI, settings: Settings) -> dict[str, object]:
    ...

def shutdown_telemetry(state: dict[str, object]) -> None:
    ...

def get_telemetry_status(settings: Settings) -> dict[str, object]:
    ...
```

Responsibilities:

- build a `Resource`
- initialize `TracerProvider` only when needed
- configure OTLP/HTTP exporter
- configure `BatchSpanProcessor`
- instrument the specific FastAPI app instance
- instrument `httpx` safely without duplicate process-global registration
- enable logging correlation when configured
- no-op cleanly when `OTEL_ENABLED` is false

**Step 4: Define bootstrap safety requirements**

The implementation must:

- avoid duplicate `trace.set_tracer_provider(...)` behavior
- avoid duplicate `HTTPXClientInstrumentor` process-global instrumentation
- avoid re-instrumenting the same FastAPI app object twice
- return a telemetry state object that records whether setup actually occurred

**Step 5: Add safe attribute filtering**

Define a helper for manual span attributes that rejects sensitive keys such as:

- `authorization`
- `token`
- `jwt`
- `prompt`
- `body`
- `content`
- `secret`

**Step 6: Add bootstrap unit tests**

Add tests verifying:

- disabled mode returns a no-op state
- enabled mode builds telemetry state without raising
- repeated `configure_telemetry()` calls are safe
- logging correlation flag is respected

**Step 7: Run tests**

```bash
cd services/platform-api && pytest tests/test_observability.py -v
```

Expected:

- PASS

**Step 8: Commit**

```bash
git add services/platform-api/requirements.txt services/platform-api/app/observability/__init__.py services/platform-api/app/observability/otel.py services/platform-api/tests/test_observability.py
git commit -m "feat: add OpenTelemetry bootstrap module for platform-api"
```

---

## Task 4: Wire telemetry into app startup and shutdown

**Files:**
- Modify: `services/platform-api/app/main.py`
- Modify: `services/platform-api/tests/test_routes.py`
- Modify: `services/platform-api/tests/test_parse_route.py`
- Test: `services/platform-api/tests/test_observability.py`

**Step 1: Import the config and telemetry bootstrap**

Add:

```python
from app.core.config import get_settings
from app.observability import configure_telemetry, shutdown_telemetry
```

**Step 2: Replace import-time logging setup with a concrete helper**

Create a `configure_logging(settings: Settings) -> None` helper in `app.main` and call it before app creation. The helper must:

- set the root logger level from `settings.log_level`
- replace any existing root handlers installed by earlier `basicConfig()` calls
- attach one `StreamHandler` with a formatter that includes `%(otelTraceID)s` and `%(otelSpanID)s`
- attach a `logging.Filter` that injects default values such as `"0"` for `otelTraceID` and `otelSpanID` when those fields are missing
- avoid adding duplicate handlers if called more than once in the same process

**Step 3: Initialize telemetry safely inside app creation**

Inside `create_app()`:

- read `settings = get_settings()`
- create the app
- call `configure_telemetry(app, settings)`
- store the returned state on `app.state.telemetry`

**Step 4: Shut down telemetry safely**

During lifespan cleanup:

- call `shutdown_telemetry(app.state.telemetry)` only if state exists
- ensure cleanup does not fail if telemetry was disabled or partially initialized

**Step 5: Add startup and repeat-construction tests**

In `test_routes.py`, add a telemetry-enabled startup test:

```python
monkeypatch.setenv("OTEL_ENABLED", "true")
monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")
```

Assert:

- app starts
- `/health` returns 200
- no startup exception is raised

Add one more test that constructs two apps in the same process with telemetry enabled and verifies both start successfully.

In `test_parse_route.py`, keep the module-level imported app path working so telemetry wiring does not break suites that do `from app.main import app`.

**Step 6: Run tests**

```bash
cd services/platform-api && pytest tests/test_routes.py tests/test_parse_route.py tests/test_observability.py -v
```

Expected:

- PASS

**Step 7: Commit**

```bash
git add services/platform-api/app/main.py services/platform-api/tests/test_routes.py services/platform-api/tests/test_parse_route.py services/platform-api/tests/test_observability.py
git commit -m "feat: wire OpenTelemetry startup and shutdown into platform-api"
```

---

## Task 5: Add manual spans around high-value workflow boundaries

**Files:**
- Modify: `services/platform-api/app/api/routes/conversion.py`
- Modify: `services/platform-api/app/api/routes/parse.py`
- Modify: `services/platform-api/app/api/routes/load_runs.py`
- Modify: `services/platform-api/app/api/routes/plugin_execution.py`
- Modify: `services/platform-api/app/workers/storage_cleanup.py`
- Test: `services/platform-api/tests/test_observability.py`

**Step 1: Add a shared tracer import pattern**

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)
```

**Step 2: Add route-level business spans**

Use named spans such as:

- `conversion.request`
- `parse.request`
- `load_runs.submit`
- `load_runs.step`
- `plugin.execute`
- `storage_cleanup.run`

Use bounded attributes only:

- booleans
- counts
- enums
- short IDs only where necessary

**Step 3: Record error state without leaking payloads**

In exception paths:

```python
span.record_exception(e)
span.set_attribute("error.type", type(e).__name__)
```

Do not attach:

- raw request bodies
- callback payload bodies
- JWTs
- signed URLs
- document contents

**Step 4: Add targeted tests**

In `test_observability.py`, patch the tracer or span factory and assert:

- at least one route span is created
- at least one error path records exception metadata safely

**Step 5: Run tests**

```bash
cd services/platform-api && pytest tests/test_observability.py -v
```

Expected:

- PASS

**Step 6: Commit**

```bash
git add services/platform-api/app/api/routes/conversion.py services/platform-api/app/api/routes/parse.py services/platform-api/app/api/routes/load_runs.py services/platform-api/app/api/routes/plugin_execution.py services/platform-api/app/workers/storage_cleanup.py services/platform-api/tests/test_observability.py
git commit -m "feat: add manual OpenTelemetry spans to key platform-api workflows"
```

---

## Task 6: Add a telemetry status endpoint

**Files:**
- Create: `services/platform-api/app/api/routes/telemetry.py`
- Modify: `services/platform-api/app/main.py`
- Test: `services/platform-api/tests/test_observability.py`

**Step 1: Create the route**

Create `/observability/telemetry-status` protected by `require_superuser`.

The payload should include:

- `enabled`
- `service_name`
- `service_namespace`
- `deployment_environment`
- `otlp_endpoint`
- `protocol`
- `sampler`
- `sampler_arg`
- `log_correlation`
- `jaeger_ui_url`

**Step 2: Mount the route**

Include the router before the plugin catch-all.

**Step 3: Add route tests**

Add tests for:

- unauthenticated request returns 401 or 403
- authorized superuser request returns 200
- status payload shape matches the contract

Use the auth patterns from `tests/test_auth.py`.

**Step 4: Run tests**

```bash
cd services/platform-api && pytest tests/test_observability.py -v
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add services/platform-api/app/api/routes/telemetry.py services/platform-api/app/main.py services/platform-api/tests/test_observability.py
git commit -m "feat: add platform-api telemetry status endpoint"
```

---

## Task 7: Replace the placeholder telemetry UI with a real status page

**Files:**
- Modify: `web/src/pages/ObservabilityTelemetry.tsx`
- Modify: `web/src/pages/ObservabilityTraces.tsx`

**Step 1: Load telemetry status from `platform-api`**

Use `platformApiFetch('/observability/telemetry-status')`.

**Step 2: Render a status dashboard**

Show:

- enabled or disabled badge
- OTLP endpoint
- protocol
- sampler and ratio
- service name
- environment
- log correlation on or off
- Jaeger UI link

Do not embed Jaeger.

**Step 3: Update the traces page**

Replace placeholder copy with:

- short explanation
- link button to Jaeger UI
- note that browser tracing is not enabled in this phase

**Step 4: Add loading and error states**

If the route is unreachable:

- show telemetry status unavailable
- do not block the page shell

**Step 5: Run frontend typecheck**

```bash
cd web && npx tsc --noEmit
```

Expected:

- PASS

**Step 6: Commit**

```bash
git add web/src/pages/ObservabilityTelemetry.tsx web/src/pages/ObservabilityTraces.tsx
git commit -m "feat: replace telemetry placeholders with platform-api status UI"
```

---

## Task 8: End-to-end verification

**Files:**
- No new files

**Step 1: Start the local telemetry stack**

```bash
docker compose -f services/docker-compose.observability.yml up -d
```

**Step 2: Start `platform-api` with telemetry enabled**

On bash:

```bash
cd services/platform-api
OTEL_ENABLED=true \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
OTEL_TRACES_SAMPLER=parentbased_traceidratio \
OTEL_TRACES_SAMPLER_ARG=1.0 \
JAEGER_UI_URL=http://localhost:16686 \
./start-dev.sh
```

On Windows PowerShell, use either:

```powershell
cd services/platform-api
$env:OTEL_ENABLED="true"
$env:OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
$env:OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
$env:OTEL_TRACES_SAMPLER="parentbased_traceidratio"
$env:OTEL_TRACES_SAMPLER_ARG="1.0"
$env:JAEGER_UI_URL="http://localhost:16686"
bash ./start-dev.sh
```

or start uvicorn directly with the same env vars.

**Step 3: Start the web app**

```bash
cd web && npm run dev
```

**Step 4: Verify inbound request tracing**

Trigger:

- `GET /health`

Expected:

- trace visible in Jaeger
- inbound FastAPI request span present

**Step 5: Verify outbound `httpx` tracing on a deterministic path**

Use `POST /reconstruct` as the required verification route because it traverses `app.infra.http_client.download_bytes()`.

Run the request against a small local fixture URL served from the developer machine or test environment. Do not rely on arbitrary external URLs or generic UI navigation.

Expected:

- trace visible in Jaeger
- outbound `httpx` child span present
- route span present for `reconstruct`

**Step 6: Verify the UI**

Open:

- `/app/observability/telemetry`
- `/app/observability/traces`

Expected:

- telemetry page shows runtime config from `platform-api`
- traces page links to Jaeger
- placeholder-only content is gone

**Step 7: Run test suites**

```bash
cd services/platform-api && pytest tests/test_observability.py tests/test_routes.py tests/test_parse_route.py -v
cd web && npx tsc --noEmit
```

Expected:

- PASS

**Step 8: Final commit**

```bash
git add -A
git commit -m "feat: add OpenTelemetry MVP to platform-api with local collector and telemetry UI"
```

---

## Follow-up Work After This Plan

1. **Admin policy integration**
   Reconcile `observability.otel_endpoint` and related instance config with deploy-time env management without making runtime startup depend on Supabase policy reads.

2. **Browser tracing**
   Instrument `web/src/lib/platformApi.ts` and `web/src/lib/edge.ts` in a separate phase once Collector exposure, CORS, and sampling are settled.

3. **Supabase Edge Function tracing**
   Treat Edge Functions as a separate implementation track.

4. **`pipeline-worker`**
   Only instrument if it is still materially on the request path during the decommission window.

5. **Metrics visualization**
   Add a metrics backend only after the trace MVP is stable.

6. **Log export**
   Revisit full OpenTelemetry log export later. For now, trace/log correlation is enough.

---

## Success Criteria

- `platform-api` starts cleanly with `OTEL_ENABLED=false`
- `platform-api` starts cleanly with `OTEL_ENABLED=true`
- repeated `create_app()` calls in one Python process do not fail or double-instrument telemetry
- inbound FastAPI requests produce traces
- outbound `httpx` calls appear as child spans on a verified `httpx` execution path
- key business flows have manual spans
- Python logs include trace/span correlation when enabled
- a superuser can view telemetry runtime status in the app
- Jaeger shows traces from real local requests
- no Supabase startup dependency was introduced for telemetry bootstrap
- no secrets or large payloads are emitted into span attributes
