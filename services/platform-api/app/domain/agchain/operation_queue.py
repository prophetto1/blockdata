from __future__ import annotations

import logging
import time
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException
from opentelemetry import metrics, trace

from app.domain.agchain.types import AgchainOperationStatus
from app.infra.supabase_client import get_supabase_admin
from app.observability.contract import safe_attributes, set_span_attributes


logger = logging.getLogger("agchain-operations")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

operations_execution_duration_ms = meter.create_histogram("platform.agchain.operations.execution.duration_ms")


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _utc_now_iso() -> str:
    return _utc_now().isoformat()


def _parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized)


def _serialize_operation_status(row: dict[str, Any]) -> dict[str, Any]:
    operation_id = row["operation_id"]
    status = AgchainOperationStatus(
        operation_id=operation_id,
        operation_type=row["operation_type"],
        status=row["status"],
        poll_url=f"/agchain/operations/{operation_id}",
        cancel_url=f"/agchain/operations/{operation_id}/cancel",
        target_kind=row.get("target_kind"),
        target_id=row.get("target_id"),
        attempt_count=int(row.get("attempt_count") or 0),
        progress=row.get("progress_jsonb") or {},
        last_error=row.get("last_error_jsonb"),
        result=row.get("result_jsonb"),
        created_at=row.get("created_at"),
        started_at=row.get("started_at"),
        heartbeat_at=row.get("heartbeat_at"),
        completed_at=row.get("completed_at"),
    )
    return status.model_dump()


def load_operation_row(*, operation_id: str, sb=None) -> dict[str, Any]:
    sb = sb or get_supabase_admin()
    row = (
        sb.table("agchain_operations")
        .select("*")
        .eq("operation_id", operation_id)
        .maybe_single()
        .execute()
        .data
    )
    if not row:
        raise HTTPException(status_code=404, detail="AG chain operation not found")
    return row


def load_operation_status(*, operation_id: str, sb=None) -> dict[str, Any]:
    return _serialize_operation_status(load_operation_row(operation_id=operation_id, sb=sb))


def _update_with_row_guard(
    *,
    sb,
    row: dict[str, Any],
    values: dict[str, Any],
    extra_filters: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    query = sb.table("agchain_operations").update(values).eq("operation_id", row["operation_id"]).eq(
        "updated_at",
        row.get("updated_at"),
    )
    for key, value in (extra_filters or {}).items():
        query = query.eq(key, value)
    rows = query.execute().data or []
    return rows[0] if rows else None


def create_operation(
    *,
    project_id: str,
    operation_type: str,
    target_kind: str | None = None,
    target_id: str | None = None,
    payload: dict[str, Any] | None = None,
    idempotency_key: str | None = None,
    created_by: str | None = None,
    max_attempts: int = 3,
    sb=None,
) -> dict[str, Any]:
    sb = sb or get_supabase_admin()
    now = _utc_now_iso()
    rows = (
        sb.table("agchain_operations")
        .insert(
            {
                "project_id": project_id,
                "operation_type": operation_type,
                "status": "queued",
                "target_kind": target_kind,
                "target_id": target_id,
                "idempotency_key": idempotency_key,
                "payload_jsonb": payload or {},
                "progress_jsonb": {},
                "attempt_count": 0,
                "max_attempts": max(1, int(max_attempts)),
                "created_by": created_by,
                "created_at": now,
                "updated_at": now,
            }
        )
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(status_code=500, detail="Failed to create AG chain operation")
    return _serialize_operation_status(rows[0])


def _is_lease_expired(row: dict[str, Any], *, now: datetime) -> bool:
    lease_expires_at = _parse_timestamp(row.get("lease_expires_at"))
    return lease_expires_at is None or lease_expires_at <= now


def lease_operation(*, worker_id: str, lease_seconds: int, sb=None) -> dict[str, Any] | None:
    sb = sb or get_supabase_admin()
    now = _utc_now()
    lease_until = (now + timedelta(seconds=max(1, int(lease_seconds)))).isoformat()
    now_iso = now.isoformat()

    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.inspect.operation.lease") as span:
        rows = sb.table("agchain_operations").select("*").execute().data or []
        candidates = [
            row
            for row in rows
            if (
                row.get("status") == "queued"
                or (
                    row.get("status") in {"running", "cancel_requested"}
                    and _is_lease_expired(row, now=now)
                    and int(row.get("attempt_count") or 0) < int(row.get("max_attempts") or 1)
                )
            )
        ]
        candidates.sort(key=lambda row: row.get("created_at") or "")

        for row in candidates:
            updated = _update_with_row_guard(
                sb=sb,
                row=row,
                values={
                    "status": "running",
                    "attempt_count": int(row.get("attempt_count") or 0) + 1,
                    "lease_owner": worker_id,
                    "lease_expires_at": lease_until,
                    "started_at": row.get("started_at") or now_iso,
                    "heartbeat_at": now_iso,
                    "updated_at": now_iso,
                },
            )
            if not updated:
                continue
            latency_ms = max(0, int((time.perf_counter() - start) * 1000))
            set_span_attributes(
                span,
                {
                    "operation_type": updated["operation_type"],
                    "status": updated["status"],
                    "result": "leased",
                    "latency_ms": latency_ms,
                },
            )
            return updated

        latency_ms = max(0, int((time.perf_counter() - start) * 1000))
        set_span_attributes(
            span,
            {
                "result": "empty",
                "latency_ms": latency_ms,
            },
        )
        return None


def heartbeat_operation(
    *,
    operation_id: str,
    worker_id: str,
    progress: dict[str, Any] | None = None,
    sb=None,
) -> dict[str, Any]:
    sb = sb or get_supabase_admin()
    row = load_operation_row(operation_id=operation_id, sb=sb)
    if row.get("lease_owner") != worker_id or row.get("status") not in {"running", "cancel_requested"}:
        raise HTTPException(status_code=409, detail="AG chain operation lease is not held by this worker")
    now = _utc_now_iso()
    updated = _update_with_row_guard(
        sb=sb,
        row=row,
        values={
            "progress_jsonb": progress if progress is not None else (row.get("progress_jsonb") or {}),
            "heartbeat_at": now,
            "updated_at": now,
        },
        extra_filters={"lease_owner": worker_id},
    )
    if not updated:
        raise HTTPException(status_code=409, detail="AG chain operation heartbeat lost its lease")
    return updated


def retry_operation(
    *,
    operation_id: str,
    worker_id: str,
    error: dict[str, Any],
    sb=None,
) -> dict[str, Any]:
    sb = sb or get_supabase_admin()
    row = load_operation_row(operation_id=operation_id, sb=sb)
    if row.get("lease_owner") != worker_id:
        raise HTTPException(status_code=409, detail="AG chain operation lease is not held by this worker")
    now = _utc_now_iso()
    updated = _update_with_row_guard(
        sb=sb,
        row=row,
        values={
            "status": "queued",
            "last_error_jsonb": error,
            "lease_owner": None,
            "lease_expires_at": None,
            "heartbeat_at": None,
            "updated_at": now,
        },
        extra_filters={"lease_owner": worker_id},
    )
    if not updated:
        raise HTTPException(status_code=409, detail="AG chain operation retry lost its lease")
    return _serialize_operation_status(updated)


def complete_operation(
    *,
    operation_id: str,
    worker_id: str,
    result: dict[str, Any] | None,
    progress: dict[str, Any] | None = None,
    sb=None,
) -> dict[str, Any]:
    sb = sb or get_supabase_admin()
    row = load_operation_row(operation_id=operation_id, sb=sb)
    if row.get("lease_owner") != worker_id or row.get("status") not in {"running", "cancel_requested"}:
        raise HTTPException(status_code=409, detail="AG chain operation lease is not held by this worker")

    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.inspect.operation.complete") as span:
        now = _utc_now_iso()
        terminal_status = "cancelled" if row.get("status") == "cancel_requested" else "completed"
        updated = _update_with_row_guard(
            sb=sb,
            row=row,
            values={
                "status": terminal_status,
                "progress_jsonb": progress if progress is not None else (row.get("progress_jsonb") or {}),
                "result_jsonb": None if terminal_status == "cancelled" else (result or {}),
                "lease_owner": None,
                "lease_expires_at": None,
                "heartbeat_at": now,
                "completed_at": now,
                "updated_at": now,
            },
            extra_filters={"lease_owner": worker_id},
        )
        if not updated:
            raise HTTPException(status_code=409, detail="AG chain operation completion lost its lease")
        latency_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "operation_type": updated["operation_type"],
            "status": updated["status"],
            "result": "completed",
            "latency_ms": latency_ms,
        }
        set_span_attributes(span, attrs)
        operations_execution_duration_ms.record(latency_ms, safe_attributes(attrs))
        return _serialize_operation_status(updated)


def fail_operation(
    *,
    operation_id: str,
    worker_id: str,
    error: dict[str, Any],
    retryable: bool = True,
    sb=None,
) -> dict[str, Any]:
    sb = sb or get_supabase_admin()
    row = load_operation_row(operation_id=operation_id, sb=sb)
    if row.get("lease_owner") != worker_id or row.get("status") not in {"running", "cancel_requested"}:
        raise HTTPException(status_code=409, detail="AG chain operation lease is not held by this worker")

    if retryable and int(row.get("attempt_count") or 0) < int(row.get("max_attempts") or 1):
        return retry_operation(
            operation_id=operation_id,
            worker_id=worker_id,
            error=error,
            sb=sb,
        )

    now = _utc_now_iso()
    updated = _update_with_row_guard(
        sb=sb,
        row=row,
        values={
            "status": "failed",
            "last_error_jsonb": error,
            "lease_owner": None,
            "lease_expires_at": None,
            "heartbeat_at": now,
            "completed_at": now,
            "updated_at": now,
        },
        extra_filters={"lease_owner": worker_id},
    )
    if not updated:
        raise HTTPException(status_code=409, detail="AG chain operation failure lost its lease")

    logger.info(
        "agchain.operation.failed",
        extra={
            "operation_id": operation_id,
            "project_id": updated.get("project_id"),
            "result": "failed",
        },
    )
    return _serialize_operation_status(updated)


def cancel_operation(*, operation_id: str, sb=None) -> dict[str, Any]:
    sb = sb or get_supabase_admin()
    row = load_operation_row(operation_id=operation_id, sb=sb)
    if row.get("status") in {"completed", "failed", "cancelled"}:
        return _serialize_operation_status(row)

    now = _utc_now_iso()
    next_status = "cancelled" if row.get("status") == "queued" else "cancel_requested"
    updated = _update_with_row_guard(
        sb=sb,
        row=row,
        values={
            "status": next_status,
            "cancel_requested_at": now,
            "completed_at": now if next_status == "cancelled" else row.get("completed_at"),
            "lease_owner": None if next_status == "cancelled" else row.get("lease_owner"),
            "lease_expires_at": None if next_status == "cancelled" else row.get("lease_expires_at"),
            "updated_at": now,
        },
    )
    if not updated:
        raise HTTPException(status_code=409, detail="AG chain operation cancellation collided with another write")
    return _serialize_operation_status(updated)

