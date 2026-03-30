from __future__ import annotations

from opentelemetry import metrics, trace

from app.observability.contract import safe_attributes

tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

snapshot_counter = meter.create_counter("platform.admin.runtime.readiness.snapshot.count")
check_counter = meter.create_counter("platform.admin.runtime.readiness.check.count")
check_duration_ms = meter.create_histogram("platform.admin.runtime.readiness.check.duration_ms")


def record_runtime_readiness_snapshot(
    *,
    result: str,
    degraded_count: int,
    failed_count: int,
    http_status_code: int,
) -> None:
    snapshot_counter.add(
        1,
        safe_attributes(
            {
                "result": result,
                "degraded_count": degraded_count,
                "failed_count": failed_count,
                "http.status_code": http_status_code,
            }
        ),
    )


def record_runtime_readiness_check(
    *,
    surface: str,
    check_id: str,
    check_category: str,
    status: str,
    duration_ms: float,
) -> None:
    attrs = safe_attributes(
        {
            "surface": surface,
            "check.id": check_id,
            "check.category": check_category,
            "status": status,
        }
    )
    check_counter.add(1, attrs)
    check_duration_ms.record(duration_ms, attrs)
