"""OpenTelemetry bootstrap — idempotent setup for traces, httpx, and log correlation."""

import logging
from typing import Any

from fastapi import FastAPI

from app.core.config import Settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Process-global idempotency guards
# ---------------------------------------------------------------------------
_provider_initialized = False
_httpx_instrumented = False
_logging_instrumented = False

# ---------------------------------------------------------------------------
# Sensitive attribute filtering
# ---------------------------------------------------------------------------
SENSITIVE_ATTRIBUTE_KEYS = {
    "authorization",
    "token",
    "jwt",
    "prompt",
    "body",
    "content",
    "secret",
}


def safe_attributes(attrs: dict[str, Any]) -> dict[str, Any]:
    """Return *attrs* with sensitive keys removed."""
    return {k: v for k, v in attrs.items() if k.lower() not in SENSITIVE_ATTRIBUTE_KEYS}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def configure_telemetry(app: FastAPI, settings: Settings) -> dict[str, object]:
    """Bootstrap OpenTelemetry for *app*.  Safe to call multiple times."""
    if not settings.otel_enabled:
        return {"enabled": False}

    global _provider_initialized, _httpx_instrumented, _logging_instrumented

    from opentelemetry import trace
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.sdk.trace.sampling import (
        ALWAYS_OFF,
        ALWAYS_ON,
        ParentBased,
        TraceIdRatioBased,
    )
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

    # 1. TracerProvider — once per process
    if not _provider_initialized:
        resource = Resource.create(
            {
                "service.name": settings.otel_service_name,
                "service.namespace": settings.otel_service_namespace,
                "deployment.environment": settings.otel_deployment_env,
            }
        )

        sampler = _build_sampler(settings.otel_traces_sampler, settings.otel_traces_sampler_arg)

        provider = TracerProvider(resource=resource, sampler=sampler)
        exporter = OTLPSpanExporter(endpoint=f"{settings.otel_exporter_otlp_endpoint}/v1/traces")
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)
        _provider_initialized = True
        logger.info(
            "OTel TracerProvider initialized: endpoint=%s sampler=%s",
            settings.otel_exporter_otlp_endpoint,
            settings.otel_traces_sampler,
        )

    # 2. FastAPI — per-app instance (guarded by marker on app.state)
    if not getattr(app.state, "_otel_instrumented", False):
        FastAPIInstrumentor().instrument_app(app)
        app.state._otel_instrumented = True

    # 3. httpx — once per process
    if not _httpx_instrumented:
        HTTPXClientInstrumentor().instrument()
        _httpx_instrumented = True

    # 4. Logging correlation — once per process
    if not _logging_instrumented and settings.otel_log_correlation:
        from opentelemetry.instrumentation.logging import LoggingInstrumentor

        LoggingInstrumentor().instrument(set_logging_format=False)
        _logging_instrumented = True

    return {"enabled": True, "provider": trace.get_tracer_provider()}


def shutdown_telemetry(state: dict[str, object]) -> None:
    """Flush pending spans.  Does NOT permanently shut down the provider."""
    if not state or not state.get("enabled"):
        return
    provider = state.get("provider")
    if provider and hasattr(provider, "force_flush"):
        try:
            provider.force_flush(timeout_millis=5000)
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
        "jaeger_ui_url": settings.jaeger_ui_url,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


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
    return ALWAYS_ON
