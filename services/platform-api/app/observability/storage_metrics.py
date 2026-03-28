from __future__ import annotations

from opentelemetry import metrics, trace

from app.observability.contract import (
    ADMIN_STORAGE_POLICY_DURATION_MS_HISTOGRAM_NAME,
    ADMIN_STORAGE_POLICY_UPDATE_COUNTER_NAME,
    ADMIN_STORAGE_PROVISIONING_INCOMPLETE_COUNTER_NAME,
    ADMIN_STORAGE_PROVISIONING_QUERY_DURATION_MS_HISTOGRAM_NAME,
    STORAGE_METER_NAME,
    STORAGE_OBJECT_DELETE_COUNTER_NAME,
    STORAGE_QUOTA_EXCEEDED_COUNTER_NAME,
    STORAGE_QUOTA_READ_COUNTER_NAME,
    STORAGE_TRACER_NAME,
    STORAGE_UPLOAD_CANCEL_COUNTER_NAME,
    STORAGE_UPLOAD_COMPLETE_COUNTER_NAME,
    STORAGE_UPLOAD_COMPLETE_DURATION_MS_HISTOGRAM_NAME,
    STORAGE_UPLOAD_COMPLETE_FAILURE_COUNTER_NAME,
    STORAGE_UPLOAD_RESERVE_COUNTER_NAME,
    STORAGE_UPLOAD_RESERVE_DURATION_MS_HISTOGRAM_NAME,
    STORAGE_UPLOAD_RESERVE_FAILURE_COUNTER_NAME,
    safe_attributes,
)

storage_tracer = trace.get_tracer(STORAGE_TRACER_NAME)
_meter = metrics.get_meter(STORAGE_METER_NAME)

_storage_quota_read_count = _meter.create_counter(STORAGE_QUOTA_READ_COUNTER_NAME)
_storage_upload_reserve_count = _meter.create_counter(STORAGE_UPLOAD_RESERVE_COUNTER_NAME)
_storage_upload_reserve_failure_count = _meter.create_counter(STORAGE_UPLOAD_RESERVE_FAILURE_COUNTER_NAME)
_storage_upload_complete_count = _meter.create_counter(STORAGE_UPLOAD_COMPLETE_COUNTER_NAME)
_storage_upload_complete_failure_count = _meter.create_counter(STORAGE_UPLOAD_COMPLETE_FAILURE_COUNTER_NAME)
_storage_upload_cancel_count = _meter.create_counter(STORAGE_UPLOAD_CANCEL_COUNTER_NAME)
_storage_object_delete_count = _meter.create_counter(STORAGE_OBJECT_DELETE_COUNTER_NAME)
_storage_quota_exceeded_count = _meter.create_counter(STORAGE_QUOTA_EXCEEDED_COUNTER_NAME)
_admin_storage_policy_update_count = _meter.create_counter(ADMIN_STORAGE_POLICY_UPDATE_COUNTER_NAME)
_admin_storage_provisioning_incomplete_count = _meter.create_counter(
    ADMIN_STORAGE_PROVISIONING_INCOMPLETE_COUNTER_NAME
)

_storage_upload_reserve_duration_ms = _meter.create_histogram(STORAGE_UPLOAD_RESERVE_DURATION_MS_HISTOGRAM_NAME)
_storage_upload_complete_duration_ms = _meter.create_histogram(STORAGE_UPLOAD_COMPLETE_DURATION_MS_HISTOGRAM_NAME)
_admin_storage_policy_duration_ms = _meter.create_histogram(ADMIN_STORAGE_POLICY_DURATION_MS_HISTOGRAM_NAME)
_admin_storage_provisioning_query_duration_ms = _meter.create_histogram(
    ADMIN_STORAGE_PROVISIONING_QUERY_DURATION_MS_HISTOGRAM_NAME
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
