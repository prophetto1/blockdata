from __future__ import annotations

import logging

from opentelemetry import metrics, trace

from app.observability.contract import (
    PIPELINE_CHUNK_COUNT_HISTOGRAM_NAME,
    PIPELINE_DELIVERABLE_DOWNLOAD_COUNTER_NAME,
    PIPELINE_JOB_COMPLETE_COUNTER_NAME,
    PIPELINE_JOB_COMPLETED_LOG_EVENT,
    PIPELINE_JOB_CREATE_COUNTER_NAME,
    PIPELINE_JOB_DURATION_MS_HISTOGRAM_NAME,
    PIPELINE_JOB_FAILED_COUNTER_NAME,
    PIPELINE_JOB_FAILED_LOG_EVENT,
    PIPELINE_JOB_REAPED_COUNTER_NAME,
    PIPELINE_JOB_REAPED_LOG_EVENT,
    PIPELINE_METER_NAME,
    PIPELINE_SOURCE_SET_CHANGED_LOG_EVENT,
    PIPELINE_SOURCE_SET_CREATE_COUNTER_NAME,
    PIPELINE_SOURCE_SET_MEMBER_COUNT_HISTOGRAM_NAME,
    PIPELINE_SOURCE_SET_UPDATE_COUNTER_NAME,
    PIPELINE_STAGE_DURATION_MS_HISTOGRAM_NAME,
    PIPELINE_TRACER_NAME,
    safe_attributes,
)

pipeline_tracer = trace.get_tracer(PIPELINE_TRACER_NAME)
_meter = metrics.get_meter(PIPELINE_METER_NAME)

_pipeline_source_set_create_count = _meter.create_counter(PIPELINE_SOURCE_SET_CREATE_COUNTER_NAME)
_pipeline_source_set_update_count = _meter.create_counter(PIPELINE_SOURCE_SET_UPDATE_COUNTER_NAME)
_pipeline_job_create_count = _meter.create_counter(PIPELINE_JOB_CREATE_COUNTER_NAME)
_pipeline_job_complete_count = _meter.create_counter(PIPELINE_JOB_COMPLETE_COUNTER_NAME)
_pipeline_job_failed_count = _meter.create_counter(PIPELINE_JOB_FAILED_COUNTER_NAME)
_pipeline_job_reaped_count = _meter.create_counter(PIPELINE_JOB_REAPED_COUNTER_NAME)
_pipeline_deliverable_download_count = _meter.create_counter(PIPELINE_DELIVERABLE_DOWNLOAD_COUNTER_NAME)

_pipeline_job_duration_ms = _meter.create_histogram(PIPELINE_JOB_DURATION_MS_HISTOGRAM_NAME)
_pipeline_stage_duration_ms = _meter.create_histogram(PIPELINE_STAGE_DURATION_MS_HISTOGRAM_NAME)
_pipeline_chunk_count = _meter.create_histogram(PIPELINE_CHUNK_COUNT_HISTOGRAM_NAME)
_pipeline_source_set_member_count = _meter.create_histogram(PIPELINE_SOURCE_SET_MEMBER_COUNT_HISTOGRAM_NAME)

_logger = logging.getLogger("platform-api.pipeline")


def _clean(attrs: dict[str, object | None]) -> dict[str, object]:
    return safe_attributes({key: value for key, value in attrs.items() if value is not None})


def record_pipeline_job_create(*, result: str, pipeline_kind: str, http_status_code: int) -> None:
    _pipeline_job_create_count.add(
        1,
        _clean(
            {
                "result": result,
                "pipeline.kind": pipeline_kind,
                "http.status_code": http_status_code,
            }
        ),
    )


def record_pipeline_source_set_create(*, result: str, pipeline_kind: str, http_status_code: int) -> None:
    _pipeline_source_set_create_count.add(
        1,
        _clean(
            {
                "result": result,
                "pipeline.kind": pipeline_kind,
                "http.status_code": http_status_code,
            }
        ),
    )


def record_pipeline_source_set_update(*, result: str, pipeline_kind: str, http_status_code: int) -> None:
    _pipeline_source_set_update_count.add(
        1,
        _clean(
            {
                "result": result,
                "pipeline.kind": pipeline_kind,
                "http.status_code": http_status_code,
            }
        ),
    )


def record_pipeline_job_complete(
    *,
    pipeline_kind: str,
    deliverable_count: int,
    source_set_member_count: int | None = None,
    section_count: int | None,
    chunk_count: int | None,
) -> None:
    del deliverable_count
    _pipeline_job_complete_count.add(
        1,
        _clean(
            {
                "pipeline.kind": pipeline_kind,
                "member.count": source_set_member_count,
                "section.count": section_count,
                "chunk.count": chunk_count,
            }
        ),
    )


def record_pipeline_job_failed(*, pipeline_kind: str, failure_stage: str | None) -> None:
    _pipeline_job_failed_count.add(
        1,
        _clean({"pipeline.kind": pipeline_kind, "stage": failure_stage}),
    )


def record_pipeline_job_reaped(*, pipeline_kind: str, recovery_reason: str) -> None:
    _pipeline_job_reaped_count.add(
        1,
        _clean({"pipeline.kind": pipeline_kind, "recovery.reason": recovery_reason}),
    )


def record_pipeline_deliverable_download(
    *,
    result: str,
    pipeline_kind: str,
    deliverable_kind: str,
    http_status_code: int,
) -> None:
    _pipeline_deliverable_download_count.add(
        1,
        _clean(
            {
                "result": result,
                "pipeline.kind": pipeline_kind,
                "deliverable.kind": deliverable_kind,
                "http.status_code": http_status_code,
            }
        ),
    )


def record_pipeline_job_duration(*, pipeline_kind: str, status: str, duration_ms: float) -> None:
    _pipeline_job_duration_ms.record(
        duration_ms,
        _clean({"pipeline.kind": pipeline_kind, "status": status}),
    )


def record_pipeline_stage_duration(*, pipeline_kind: str, stage: str, duration_ms: float) -> None:
    _pipeline_stage_duration_ms.record(
        duration_ms,
        _clean({"pipeline.kind": pipeline_kind, "stage": stage}),
    )


def record_pipeline_chunk_count(*, pipeline_kind: str, chunk_count: int) -> None:
    _pipeline_chunk_count.record(
        chunk_count,
        _clean({"pipeline.kind": pipeline_kind, "chunk.count": chunk_count}),
    )


def record_pipeline_source_set_member_count(*, pipeline_kind: str, member_count: int) -> None:
    _pipeline_source_set_member_count.record(
        member_count,
        _clean({"pipeline.kind": pipeline_kind, "member.count": member_count}),
    )


def log_pipeline_job_completed(
    *,
    pipeline_kind: str,
    deliverable_kinds: list[str],
    source_set_member_count: int | None,
    section_count: int | None,
    chunk_count: int | None,
) -> None:
    _logger.info(
        PIPELINE_JOB_COMPLETED_LOG_EVENT,
        extra=_clean(
            {
                "pipeline.kind": pipeline_kind,
                "deliverable.kinds": tuple(deliverable_kinds),
                "member.count": source_set_member_count,
                "section.count": section_count,
                "chunk.count": chunk_count,
            }
        ),
    )


def log_pipeline_job_failed(
    *,
    pipeline_kind: str,
    failure_stage: str | None,
    error_category: str,
) -> None:
    _logger.info(
        PIPELINE_JOB_FAILED_LOG_EVENT,
        extra=_clean(
            {
                "pipeline.kind": pipeline_kind,
                "failure_stage": failure_stage,
                "error.category": error_category,
            }
        ),
    )


def log_pipeline_job_reaped(
    *,
    pipeline_kind: str,
    failure_stage: str | None,
    recovery_reason: str,
) -> None:
    _logger.info(
        PIPELINE_JOB_REAPED_LOG_EVENT,
        extra=_clean(
            {
                "pipeline.kind": pipeline_kind,
                "failure_stage": failure_stage,
                "recovery.reason": recovery_reason,
            }
        ),
    )


def log_pipeline_source_set_changed(
    *,
    pipeline_kind: str,
    change_kind: str,
    member_count: int | None,
    has_project_id: bool,
) -> None:
    _logger.info(
        PIPELINE_SOURCE_SET_CHANGED_LOG_EVENT,
        extra=_clean(
            {
                "pipeline.kind": pipeline_kind,
                "result": change_kind,
                "member.count": member_count,
                "has_project_id": has_project_id,
            }
        ),
    )
