from __future__ import annotations

from opentelemetry import metrics, trace

from app.observability.otel import safe_attributes

storage_tracer = trace.get_tracer("platform.storage")
_meter = metrics.get_meter("platform.storage")

_storage_quota_read_count = _meter.create_counter("platform.storage.quota.read.count")
_storage_upload_reserve_count = _meter.create_counter("platform.storage.upload.reserve.count")
_storage_upload_reserve_failure_count = _meter.create_counter("platform.storage.upload.reserve.failure.count")
_storage_upload_complete_count = _meter.create_counter("platform.storage.upload.complete.count")
_storage_upload_complete_failure_count = _meter.create_counter("platform.storage.upload.complete.failure.count")
_storage_upload_cancel_count = _meter.create_counter("platform.storage.upload.cancel.count")
_storage_object_delete_count = _meter.create_counter("platform.storage.object.delete.count")
_storage_quota_exceeded_count = _meter.create_counter("platform.storage.quota.exceeded.count")
_admin_storage_policy_update_count = _meter.create_counter("platform.admin.storage.policy.update.count")
_admin_storage_provisioning_incomplete_count = _meter.create_counter(
    "platform.admin.storage.provisioning.incomplete.count"
)

_storage_upload_reserve_duration_ms = _meter.create_histogram("platform.storage.upload.reserve.duration.ms")
_storage_upload_complete_duration_ms = _meter.create_histogram("platform.storage.upload.complete.duration.ms")
_admin_storage_policy_duration_ms = _meter.create_histogram("platform.admin.storage.policy.duration.ms")
_admin_storage_provisioning_query_duration_ms = _meter.create_histogram(
    "platform.admin.storage.provisioning.query.duration.ms"
)


def _clean(attrs: dict[str, object | None]) -> dict[str, object]:
    return safe_attributes({key: value for key, value in attrs.items() if value is not None})


def record_storage_quota_read(
    *,
    result: str,
    quota_bytes: int | None,
    used_bytes: int | None,
    reserved_bytes: int | None,
    http_status_code: int,
) -> None:
    _storage_quota_read_count.add(
        1,
        _clean(
            {
                "result": result,
                "quota.bytes": quota_bytes,
                "used.bytes": used_bytes,
                "reserved.bytes": reserved_bytes,
                "http.status_code": http_status_code,
            }
        ),
    )


def record_storage_upload_reserve(
    *,
    result: str,
    storage_kind: str,
    requested_bytes: int,
    has_project_id: bool,
    duration_ms: float,
    http_status_code: int,
) -> None:
    attrs = _clean(
        {
            "result": result,
            "storage.kind": storage_kind,
            "requested.bytes": requested_bytes,
            "has_project_id": has_project_id,
            "http.status_code": http_status_code,
        }
    )
    _storage_upload_reserve_duration_ms.record(duration_ms, attrs)
    if result == "ok":
        _storage_upload_reserve_count.add(1, attrs)
    else:
        _storage_upload_reserve_failure_count.add(1, attrs)
        if http_status_code == 402:
            _storage_quota_exceeded_count.add(1, attrs)


def record_storage_upload_complete(
    *,
    result: str,
    storage_kind: str,
    actual_bytes: int | None,
    duration_ms: float,
    http_status_code: int,
) -> None:
    attrs = _clean(
        {
            "result": result,
            "storage.kind": storage_kind,
            "actual.bytes": actual_bytes,
            "http.status_code": http_status_code,
        }
    )
    _storage_upload_complete_duration_ms.record(duration_ms, attrs)
    if result == "ok":
        _storage_upload_complete_count.add(1, attrs)
    else:
        _storage_upload_complete_failure_count.add(1, attrs)


def record_storage_upload_cancel(*, result: str, http_status_code: int) -> None:
    _storage_upload_cancel_count.add(
        1,
        _clean({"result": result, "http.status_code": http_status_code}),
    )


def record_storage_object_delete(
    *,
    result: str,
    storage_kind: str | None,
    actual_bytes: int | None,
    http_status_code: int,
) -> None:
    _storage_object_delete_count.add(
        1,
        _clean(
            {
                "result": result,
                "storage.kind": storage_kind,
                "actual.bytes": actual_bytes,
                "http.status_code": http_status_code,
            }
        ),
    )


def record_admin_storage_policy_read(
    *,
    result: str,
    quota_bytes: int | None,
    duration_ms: float,
    http_status_code: int,
) -> None:
    _admin_storage_policy_duration_ms.record(
        duration_ms,
        _clean(
            {
                "result": result,
                "quota.bytes": quota_bytes,
                "http.status_code": http_status_code,
            }
        ),
    )


def record_admin_storage_policy_update(
    *,
    result: str,
    quota_bytes: int,
    duration_ms: float,
    http_status_code: int,
) -> None:
    attrs = _clean(
        {
            "result": result,
            "quota.bytes": quota_bytes,
            "http.status_code": http_status_code,
        }
    )
    _admin_storage_policy_duration_ms.record(duration_ms, attrs)
    if result == "ok":
        _admin_storage_policy_update_count.add(1, attrs)


def record_admin_storage_provisioning_recent(
    *,
    result: str,
    incomplete_count: int,
    limit: int,
    duration_ms: float,
    http_status_code: int,
) -> None:
    attrs = _clean(
        {
            "result": result,
            "limit": limit,
            "http.status_code": http_status_code,
        }
    )
    _admin_storage_provisioning_query_duration_ms.record(duration_ms, attrs)
    if incomplete_count > 0:
        _admin_storage_provisioning_incomplete_count.add(incomplete_count, attrs)
