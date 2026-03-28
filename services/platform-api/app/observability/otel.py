"""OpenTelemetry bootstrap for traces, metrics, logs, and correlation."""

import logging
from typing import Any

from fastapi import FastAPI

from app.core.config import Settings
from app.observability.contract import (  # noqa: F401 – re-exported for backwards compat
    SENSITIVE_ATTRIBUTE_KEYS,
    safe_attributes,
)

logger = logging.getLogger(__name__)

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


def get_telemetry_status(settings: Settings) -> dict[str, object]:
    """Return a JSON-safe dict describing current telemetry config."""
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
    }


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
