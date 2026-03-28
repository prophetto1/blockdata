# Platform API Observability Contract

## OpenTelemetry-First

OpenTelemetry is the first-class product contract for `platform-api` observability.
Sinks (SigNoz, Grafana Cloud, etc.) are replaceable OTLP backends behind that contract.

- Application code depends on OpenTelemetry SDK interfaces and `app.observability`.
- No SigNoz-specific SDK, API, or runtime wrapper may be introduced.
- Sink-specific settings are expressed only through OTLP environment or secret configuration.

## Contract Module

`app/observability/contract.py` is the single source of truth for:

- **Canonical metric names:** `platform.secrets.list.count`, `platform.secrets.change.count`, `platform.crypto.fallback.count`
- **Canonical log event names:** `secrets.changed`
- **Canonical span names:** `secrets.list`, `secrets.create`, `secrets.update`, `secrets.delete`
- **Storage namespace identity:** `platform.storage` (meter and tracer)
- **Sensitive attribute redaction:** `safe_attributes()` with blocked keys: `authorization`, `token`, `jwt`, `prompt`, `body`, `content`, `secret`

In-scope emitters (`secrets.py`, `crypto.py`, `storage_metrics.py`) import these constants
rather than hardcoding name strings inline.

## Configuration

Runtime exporter behavior is driven by standard `OTEL_*` environment variables:

| Variable | Default | Role |
|----------|---------|------|
| `OTEL_ENABLED` | `false` | Master toggle |
| `OTEL_SERVICE_NAME` | `platform-api` | Resource identity |
| `OTEL_SERVICE_NAMESPACE` | `blockdata` | Resource identity |
| `OTEL_DEPLOYMENT_ENV` | `local` | Resource identity |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Sink-neutral OTLP target |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | Export format |
| `OTEL_EXPORTER_OTLP_HEADERS` | (unset) | Comma-delimited `key=value` for authenticated export |
| `OTEL_LOG_CORRELATION` | `true` | Inject trace/span IDs into logs |
| `OTEL_METRICS_ENABLED` | `true` | Metrics signal toggle |
| `OTEL_LOGS_ENABLED` | `true` | Logs signal toggle |

### Compatibility fields (output only)

| Variable | Role |
|----------|------|
| `SIGNOZ_UI_URL` | Optional UI link in telemetry-status response |
| `JAEGER_UI_URL` | Deprecated compatibility alias |

These fields appear in the `/observability/telemetry-status` response but **do not influence
exporter construction or runtime instrumentation**.

### OTLP header parsing rules

- Empty or whitespace-only values are treated as unset.
- Non-empty malformed strings (not comma-delimited `key=value`) are a startup error.
- Whitespace is trimmed around keys and values.
- Empty keys and duplicate keys are rejected as startup errors.
- Header values are never exposed in `/observability/telemetry-status`.

## Attaching a Sink

### Local development (SigNoz)

```bash
docker compose -f docker/docker-compose.signoz.yml up -d
```

Then set `OTEL_ENABLED=true` and `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`.
SigNoz UI is available at `http://localhost:8080`.

### Production (any OTLP backend)

Use the deploy script's first-class OTEL parameters:

```powershell
./scripts/deploy-cloud-run-platform-api.ps1 `
  -ProjectId agchain -Region us-central1 `
  -OtelEnabled true `
  -OtelDeploymentEnv production `
  -OtelExporterOtlpEndpoint https://ingest.your-otlp-backend.com
```

If the sink requires auth headers, use Secret Manager:

```powershell
  -OtelHeadersSecretName otlp-auth-headers `
  -UseExistingOtelHeadersSecret
```

## Downstream Rollout Handoff

After the OTel contract plan lands, the live telemetry rollout needs only:

1. An operator-approved OTLP sink endpoint
2. Whether that sink requires auth headers
3. Where those headers live (Secret Manager secret name)
4. Where the sink is queried to verify metrics arrived
5. How the three frozen metrics (`platform.crypto.fallback.count`, `platform.secrets.list.count`, `platform.secrets.change.count`) are proved after deploy

No additional runtime abstraction, config parsing, or deploy script work is needed.
