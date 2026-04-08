"""OpenTelemetry bootstrap for traces, metrics, logs, and correlation."""

import logging
import secrets
import time
from typing import Any

from fastapi import FastAPI
import httpx

from app.core.config import Settings
from app.observability.contract import (  # noqa: F401 – re-exported for backwards compat
    SENSITIVE_ATTRIBUTE_KEYS,
    safe_attributes,
)

logger = logging.getLogger(__name__)
_TELEMETRY_EXPORT_PROBE_KIND = "telemetry_export_probe"
_TELEMETRY_EXPORT_CHECK_ID = "observability.telemetry.export"
_UNSET = object()

# ---------------------------------------------------------------------------
# Process-global idempotency guards
# ---------------------------------------------------------------------------
_provider_initialized = False
_httpx_instrumented = False
_logging_instrumented = False
_meter_provider_initialized = False
_logger_provider_initialized = False


def configure_telemetry(app: FastAPI, settings: Settings) -> dict[str, object]:
    """Bootstrap OpenTelemetry for *app*. Safe to call multiple times."""
    if not settings.otel_enabled:
        return {"enabled": False}

    _SUPPORTED_PROTOCOLS = {"http/protobuf"}
    if settings.otel_exporter_otlp_protocol not in _SUPPORTED_PROTOCOLS:
        raise ValueError(
            f"Unsupported OTEL_EXPORTER_OTLP_PROTOCOL: {settings.otel_exporter_otlp_protocol!r}. "
            f"Supported: {_SUPPORTED_PROTOCOLS}"
        )

    global _provider_initialized, _httpx_instrumented, _logging_instrumented
    global _meter_provider_initialized, _logger_provider_initialized

    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    resource = Resource.create(
        {
            "service.name": settings.otel_service_name,
            "service.namespace": settings.otel_service_namespace,
            "deployment.environment": settings.otel_deployment_env,
        }
    )

    if not _provider_initialized:
        sampler = _build_sampler(settings.otel_traces_sampler, settings.otel_traces_sampler_arg)
        provider = TracerProvider(resource=resource, sampler=sampler)
        _trace_exporter_kwargs: dict[str, object] = {
            "endpoint": f"{settings.otel_exporter_otlp_endpoint}/v1/traces",
        }
        if settings.otel_exporter_otlp_headers:
            _trace_exporter_kwargs["headers"] = settings.otel_exporter_otlp_headers
        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(**_trace_exporter_kwargs)))
        trace.set_tracer_provider(provider)
        _provider_initialized = True
        logger.info(
            "OTel TracerProvider initialized: endpoint=%s sampler=%s",
            settings.otel_exporter_otlp_endpoint,
            settings.otel_traces_sampler,
        )

    if settings.otel_metrics_enabled and not _meter_provider_initialized:
        _setup_metrics_export(resource, settings)
        _meter_provider_initialized = True
        logger.info("OTel metrics export initialized: endpoint=%s", settings.otel_exporter_otlp_endpoint)

    if settings.otel_logs_enabled and not _logger_provider_initialized:
        _setup_logs_export(resource, settings)
        _logger_provider_initialized = True
        logger.info("OTel logs export initialized: endpoint=%s", settings.otel_exporter_otlp_endpoint)

    # App-level instrumentation.
    if not getattr(app.state, "_otel_instrumented", False):
        FastAPIInstrumentor().instrument_app(app)
        app.state._otel_instrumented = True

    if not _httpx_instrumented:
        HTTPXClientInstrumentor().instrument()
        _httpx_instrumented = True

    if not _logging_instrumented and settings.otel_log_correlation:
        from opentelemetry.instrumentation.logging import LoggingInstrumentor

        LoggingInstrumentor().instrument(set_logging_format=False)
        _logging_instrumented = True

    return {"enabled": True, "provider": trace.get_tracer_provider()}


def shutdown_telemetry(state: dict[str, object]) -> None:
    """Flush pending spans. Does not permanently shut down the provider."""
    if not state or not state.get("enabled"):
        return
    provider = state.get("provider")
    if provider and hasattr(provider, "force_flush"):
        try:
            provider.force_flush(timeout_millis=5_000)
        except Exception:
            logger.debug("OTel flush failed (non-fatal)", exc_info=True)


def get_telemetry_status(
    settings: Settings,
    latest_export_probe_run: dict[str, object] | None | object = _UNSET,
) -> dict[str, object]:
    """Return a JSON-safe dict describing current telemetry config."""
    if latest_export_probe_run is _UNSET:
        latest_export_probe_run = None
        try:
            from app.services.runtime_probe_service import get_latest_runtime_probe_run_for_probe_kind

            latest_export_probe_run = get_latest_runtime_probe_run_for_probe_kind(
                probe_kind=_TELEMETRY_EXPORT_PROBE_KIND
            )
        except Exception:
            logger.debug("Failed to load latest telemetry export probe run", exc_info=True)

    return _build_telemetry_status(settings, latest_export_probe_run)


def _build_telemetry_status(
    settings: Settings,
    latest_export_probe_run: dict[str, object] | None,
) -> dict[str, object]:
    proof_status, proof_summary = _derive_telemetry_proof_state(latest_export_probe_run)
    return {
        "enabled": settings.otel_enabled,
        "service_name": settings.otel_service_name,
        "service_namespace": settings.otel_service_namespace,
        "deployment_environment": settings.otel_deployment_env,
        "otlp_endpoint": settings.otel_exporter_otlp_endpoint,
        "protocol": settings.otel_exporter_otlp_protocol,
        "sampler": settings.otel_traces_sampler,
        "sampler_arg": settings.otel_traces_sampler_arg,
        "log_correlation": settings.otel_log_correlation,
        "metrics_enabled": settings.otel_metrics_enabled,
        "logs_enabled": settings.otel_logs_enabled,
        "signoz_ui_url": settings.signoz_ui_url,
        "jaeger_ui_url": settings.jaeger_ui_url,
        "proof_status": proof_status,
        "proof_summary": proof_summary,
        "latest_export_probe_run": latest_export_probe_run,
    }


def _derive_telemetry_proof_state(
    latest_export_probe_run: dict[str, object] | None,
) -> tuple[str, str]:
    if not latest_export_probe_run:
        return ("unverified", "No telemetry export probe has been run yet.")

    if latest_export_probe_run.get("result") == "ok":
        return (
            "passing",
            "Latest telemetry export probe reached the collector and was accepted.",
        )

    failure_reason = latest_export_probe_run.get("failure_reason")
    if isinstance(failure_reason, str) and failure_reason.strip():
        return (
            "failing",
            f"Latest telemetry export probe failed before the collector accepted the trace payload. {failure_reason}",
        )

    return (
        "failing",
        "Latest telemetry export probe failed before the collector accepted the trace payload.",
    )


def _build_telemetry_export_payload(settings: Settings) -> tuple[bytes, str]:
    from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import ExportTraceServiceRequest
    from opentelemetry.proto.common.v1.common_pb2 import AnyValue, InstrumentationScope, KeyValue
    from opentelemetry.proto.resource.v1.resource_pb2 import Resource
    from opentelemetry.proto.trace.v1.trace_pb2 import ResourceSpans, ScopeSpans, Span

    def string_kv(key: str, value: str) -> KeyValue:
        item = KeyValue()
        item.key = key
        item.value.CopyFrom(AnyValue(string_value=value))
        return item

    trace_id = secrets.token_bytes(16)
    span_id = secrets.token_bytes(8)
    trace_id_hex = trace_id.hex()
    now = time.time_ns()

    request = ExportTraceServiceRequest(
        resource_spans=[
            ResourceSpans(
                resource=Resource(
                    attributes=[
                        string_kv("service.name", settings.otel_service_name),
                        string_kv("service.namespace", settings.otel_service_namespace),
                        string_kv("deployment.environment", settings.otel_deployment_env),
                    ]
                ),
                scope_spans=[
                    ScopeSpans(
                        scope=InstrumentationScope(name="platform-api.telemetry.probe"),
                        spans=[
                            Span(
                                trace_id=trace_id,
                                span_id=span_id,
                                name="runtime.telemetry.export.probe",
                                kind=Span.SpanKind.SPAN_KIND_INTERNAL,
                                start_time_unix_nano=now,
                                end_time_unix_nano=now + 1_000_000,
                            )
                        ],
                    )
                ],
            )
        ]
    )
    return request.SerializeToString(), trace_id_hex


async def execute_telemetry_export_probe(
    settings: Settings,
    *,
    actor_id: str,
    http_client: Any | None = None,
    supabase_admin=None,
) -> dict[str, object]:
    from app.services.runtime_probe_service import store_runtime_probe_run

    request_url = f"{settings.otel_exporter_otlp_endpoint.rstrip('/')}/v1/traces"
    payload, trace_id_hex = _build_telemetry_export_payload(settings)
    started = time.perf_counter()
    evidence: dict[str, object] = {
        "proof_level": "collector_ingest",
        "request_url": request_url,
        "trace_id": trace_id_hex,
        "transport": "otlp_http_protobuf",
    }
    result = "error"
    failure_reason: str | None = None

    async def _post(client: Any):
        return await client.post(
            request_url,
            content=payload,
            headers={"Content-Type": "application/x-protobuf"},
        )

    try:
        if http_client is None:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await _post(client)
        else:
            response = await _post(http_client)

        evidence["http_status_code"] = response.status_code
        evidence["accepted"] = 200 <= response.status_code < 300
        if evidence["accepted"]:
            result = "ok"
        else:
            failure_reason = f"Collector returned HTTP {response.status_code}"
            evidence["response_body"] = (response.text or "")[:500]
    except Exception as exc:
        failure_reason = str(exc) or type(exc).__name__
        evidence["accepted"] = False
        evidence["error_type"] = type(exc).__name__

    latest_export_probe_run = store_runtime_probe_run(
        probe_kind=_TELEMETRY_EXPORT_PROBE_KIND,
        check_id=_TELEMETRY_EXPORT_CHECK_ID,
        result=result,
        duration_ms=(time.perf_counter() - started) * 1000.0,
        evidence=evidence,
        failure_reason=failure_reason,
        actor_id=actor_id,
        supabase_admin=supabase_admin,
    )
    return _build_telemetry_status(settings, latest_export_probe_run)


def _build_sampler(name: str, arg: float):
    from opentelemetry.sdk.trace.sampling import (
        ALWAYS_OFF,
        ALWAYS_ON,
        ParentBased,
        TraceIdRatioBased,
    )

    name_lower = name.lower()
    if name_lower == "parentbased_traceidratio":
        return ParentBased(TraceIdRatioBased(arg))
    if name_lower == "always_on":
        return ALWAYS_ON
    if name_lower == "always_off":
        return ALWAYS_OFF
    logger.warning("otel.unknown_sampler %s", name)
    return ALWAYS_ON


def _setup_metrics_export(resource, settings: Settings) -> None:
    """Configure OTLP metrics export if OTLP metric modules are installed."""
    try:
        from opentelemetry.sdk.metrics import MeterProvider
        from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
        from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
    except Exception as err:
        logger.warning("OTel metrics export unavailable: %s", err)
        return

    _metric_exporter_kwargs: dict[str, object] = {
        "endpoint": f"{settings.otel_exporter_otlp_endpoint}/v1/metrics",
    }
    if settings.otel_exporter_otlp_headers:
        _metric_exporter_kwargs["headers"] = settings.otel_exporter_otlp_headers
    reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(**_metric_exporter_kwargs),
        export_interval_millis=15_000,
    )
    from opentelemetry import metrics

    metrics.set_meter_provider(MeterProvider(resource=resource, metric_readers=[reader]))


def _setup_logs_export(resource, settings: Settings) -> None:
    """Configure OTLP log export if OTLP log modules are installed."""
    try:
        from opentelemetry._logs import set_logger_provider
        from opentelemetry.sdk._logs import LoggerProvider
        from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
        from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
    except Exception as err:
        logger.warning("OTel logs export unavailable: %s", err)
        return

    _log_exporter_kwargs: dict[str, object] = {
        "endpoint": f"{settings.otel_exporter_otlp_endpoint}/v1/logs",
    }
    if settings.otel_exporter_otlp_headers:
        _log_exporter_kwargs["headers"] = settings.otel_exporter_otlp_headers
    provider = LoggerProvider(resource=resource)
    provider.add_log_record_processor(
        BatchLogRecordProcessor(OTLPLogExporter(**_log_exporter_kwargs))
    )
    set_logger_provider(provider)
