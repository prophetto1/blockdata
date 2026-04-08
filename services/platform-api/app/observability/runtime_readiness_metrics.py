from __future__ import annotations

from opentelemetry import metrics, trace

from app.observability.contract import safe_attributes

tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

snapshot_counter = meter.create_counter("platform.admin.runtime.readiness.snapshot.count")
check_counter = meter.create_counter("platform.admin.runtime.readiness.check.count")
check_duration_ms = meter.create_histogram("platform.admin.runtime.readiness.check.duration_ms")
action_counter = meter.create_counter("runtime_readiness_actions_total")
action_duration_ms = meter.create_histogram("runtime_readiness_action_duration_ms")
probe_counter = meter.create_counter("runtime_probes_total")
probe_duration_ms = meter.create_histogram("runtime_probe_duration_ms")


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


def record_runtime_readiness_action(
    *,
    action_id: str,
    check_id: str,
    result: str,
    duration_ms: float,
    error_type: str | None = None,
) -> None:
    attrs = safe_attributes(
        {
            "action_id": action_id,
            "check_id": check_id,
            "result": result,
            "error_type": error_type,
        }
    )
    action_counter.add(1, attrs)
    action_duration_ms.record(duration_ms, attrs)


def record_runtime_probe(
    *,
    probe_id: str,
    surface: str,
    result: str,
    duration_ms: float,
    error_type: str | None = None,
) -> None:
    attrs = safe_attributes(
        {
            "probe_id": probe_id,
            "surface": surface,
            "result": result,
            "error_type": error_type,
        }
    )
    probe_counter.add(1, attrs)
    probe_duration_ms.record(duration_ms, attrs)
