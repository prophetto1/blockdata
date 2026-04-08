from __future__ import annotations

import asyncio
import importlib
import logging
import os
from collections.abc import Callable
from datetime import UTC, datetime
from time import perf_counter
from typing import Any

from app.infra.supabase_client import get_supabase_admin
from app.observability.pipeline_metrics import (
    log_pipeline_job_completed,
    log_pipeline_job_failed,
    log_pipeline_job_reaped,
    pipeline_tracer,
    record_pipeline_job_complete,
    record_pipeline_job_duration,
    record_pipeline_job_failed,
    record_pipeline_job_reaped,
)
from app.pipelines.registry import get_pipeline_worker_definition, list_pipeline_worker_definitions
from app.workers.conversion_pool import get_conversion_pool

logger = logging.getLogger("platform-api.pipeline-jobs")

_worker_task: asyncio.Task[None] | None = None
_worker_stop_event: asyncio.Event | None = None

_SUPERVISOR_INTERVAL_SECONDS = max(1, int(os.environ.get("PIPELINE_JOB_SUPERVISOR_INTERVAL_SECONDS", "1")))
_REAPER_INTERVAL_SECONDS = max(1, int(os.environ.get("PIPELINE_JOB_REAPER_INTERVAL_SECONDS", "60")))
_STALE_TTL_MINUTES = max(1, int(os.environ.get("PIPELINE_JOB_STALE_TTL_MINUTES", "15")))
_STALE_FAILURE_MESSAGE = "Job failed after stale heartbeat timeout"


def _load_pipeline_job_sync(job_id: str) -> dict[str, Any]:
    row = (
        get_supabase_admin()
        .table("pipeline_jobs")
        .select("*")
        .eq("job_id", job_id)
        .maybe_single()
        .execute()
        .data
    )
    if not row:
        raise RuntimeError("Pipeline job not found")
    return row


def _update_pipeline_job_sync(job_id: str, values: dict[str, Any]) -> None:
    payload = {key: value for key, value in values.items() if value is not None}
    if not payload:
        return
    get_supabase_admin().table("pipeline_jobs").update(payload).eq("job_id", job_id).execute()


def _claim_pipeline_jobs_once_sync(pipeline_kind: str, limit: int) -> list[dict[str, Any]]:
    result = get_supabase_admin().rpc(
        "claim_pipeline_jobs",
        {"p_pipeline_kind": pipeline_kind, "p_limit": max(1, limit)},
    ).execute()
    return result.data or []


def _reap_stale_pipeline_jobs_sync() -> list[dict[str, Any]]:
    result = get_supabase_admin().rpc(
        "reap_stale_pipeline_jobs",
        {"p_stale_after_minutes": _STALE_TTL_MINUTES},
    ).execute()
    return result.data or []


def _resolve_pipeline_handler(pipeline_kind: str) -> Callable[..., dict[str, Any] | None]:
    definition = get_pipeline_worker_definition(pipeline_kind)
    if not definition:
        raise RuntimeError(f"Unknown pipeline kind: {pipeline_kind}")
    module_name = definition.get("handler_module")
    handler_name = definition.get("handler_name")
    if not module_name or not handler_name:
        raise RuntimeError(f"Pipeline kind {pipeline_kind} has no handler metadata")
    module = importlib.import_module(module_name)
    handler = getattr(module, handler_name, None)
    if handler is None:
        raise RuntimeError(f"Pipeline handler {module_name}.{handler_name} not found")
    return handler


def _sanitize_error_message(exc: Exception) -> str:
    message = str(exc).strip()
    return message[:500] if message else type(exc).__name__


def _utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _run_pipeline_job_sync(job_id: str, pipeline_kind: str) -> None:
    started = perf_counter()
    job = _load_pipeline_job_sync(job_id)
    current_stage = str(job.get("stage") or "queued")

    def _heartbeat() -> None:
        _update_pipeline_job_sync(job_id, {"heartbeat_at": _utc_now_iso()})

    def _set_stage(stage: str) -> None:
        nonlocal current_stage
        current_stage = stage
        _update_pipeline_job_sync(job_id, {"stage": stage, "heartbeat_at": _utc_now_iso()})

    with pipeline_tracer.start_as_current_span("pipeline.job.run") as span:
        span.set_attribute("pipeline.kind", pipeline_kind)
        span.set_attribute("stage", current_stage)
        try:
            _set_stage(current_stage)
            handler = _resolve_pipeline_handler(pipeline_kind)
            result = handler(job=job, set_stage=_set_stage, heartbeat=_heartbeat) or {}
            deliverable_kinds = list(result.get("deliverable_kinds") or [])
            values = {
                "status": "complete",
                "stage": "packaging",
                "section_count": result.get("section_count"),
                "chunk_count": result.get("chunk_count"),
                "embedding_provider": result.get("embedding_provider"),
                "embedding_model": result.get("embedding_model"),
                "completed_at": _utc_now_iso(),
                "heartbeat_at": _utc_now_iso(),
            }
            _update_pipeline_job_sync(job_id, values)
            duration_ms = (perf_counter() - started) * 1000.0
            record_pipeline_job_complete(
                pipeline_kind=pipeline_kind,
                deliverable_count=len(deliverable_kinds),
                source_set_member_count=result.get("source_set_member_count"),
                section_count=result.get("section_count"),
                chunk_count=result.get("chunk_count"),
            )
            record_pipeline_job_duration(pipeline_kind=pipeline_kind, status="complete", duration_ms=duration_ms)
            log_pipeline_job_completed(
                pipeline_kind=pipeline_kind,
                deliverable_kinds=deliverable_kinds,
                source_set_member_count=result.get("source_set_member_count"),
                section_count=result.get("section_count"),
                chunk_count=result.get("chunk_count"),
            )
        except Exception as exc:
            duration_ms = (perf_counter() - started) * 1000.0
            message = _sanitize_error_message(exc)
            span.record_exception(exc)
            span.set_attribute("stage", current_stage)
            _update_pipeline_job_sync(
                job_id,
                {
                    "status": "failed",
                    "failure_stage": current_stage,
                    "error_message": message,
                    "completed_at": _utc_now_iso(),
                    "heartbeat_at": _utc_now_iso(),
                },
            )
            record_pipeline_job_failed(pipeline_kind=pipeline_kind, failure_stage=current_stage)
            record_pipeline_job_duration(pipeline_kind=pipeline_kind, status="failed", duration_ms=duration_ms)
            log_pipeline_job_failed(
                pipeline_kind=pipeline_kind,
                failure_stage=current_stage,
                error_category=type(exc).__name__,
            )
            raise


def run_pipeline_job_now(*, job_id: str, pipeline_kind: str) -> dict[str, Any]:
    _run_pipeline_job_sync(job_id, pipeline_kind)
    return _load_pipeline_job_sync(job_id)


def _reap_stale_jobs_once_sync() -> int:
    with pipeline_tracer.start_as_current_span("pipeline.job.reap") as span:
        rows = _reap_stale_pipeline_jobs_sync()
        span.set_attribute("reaped_count", len(rows))
        for row in rows:
            record_pipeline_job_reaped(
                pipeline_kind=row.get("pipeline_kind", "unknown"),
                recovery_reason="heartbeat_timeout",
            )
            log_pipeline_job_reaped(
                pipeline_kind=row.get("pipeline_kind", "unknown"),
                failure_stage=row.get("stage"),
                recovery_reason="heartbeat_timeout",
            )
        return len(rows)


async def _reap_stale_jobs_once() -> int:
    return await asyncio.to_thread(_reap_stale_jobs_once_sync)


async def _await_dispatched_job(future: asyncio.Future) -> None:
    try:
        await future
    except Exception:
        logger.exception("Pipeline job execution failed")


async def _run_pipeline_supervisor_iteration(
    *,
    wait_for_dispatched: bool = False,
    run_reaper: bool = True,
) -> dict[str, int]:
    reaped = await _reap_stale_jobs_once() if run_reaper else 0
    claimed_count = 0
    dispatched_count = 0
    pool = get_conversion_pool()
    pending: list[asyncio.Future] = []

    for definition in list_pipeline_worker_definitions():
        if pool.is_saturated:
            break

        pipeline_kind = definition["pipeline_kind"]
        with pipeline_tracer.start_as_current_span("pipeline.job.claim") as span:
            span.set_attribute("pipeline.kind", pipeline_kind)
            rows = await asyncio.to_thread(_claim_pipeline_jobs_once_sync, pipeline_kind, 1)
            span.set_attribute("claimed_count", len(rows))

        if not rows:
            continue

        claimed_count += len(rows)
        for row in rows:
            dispatched_count += 1
            future = pool.submit(_run_pipeline_job_sync, row["job_id"], pipeline_kind)
            task = asyncio.ensure_future(_await_dispatched_job(future))
            pending.append(task)

    if wait_for_dispatched and pending:
        await asyncio.gather(*pending)

    return {"claimed": claimed_count, "reaped": reaped, "dispatched": dispatched_count}


async def _pipeline_jobs_loop() -> None:
    assert _worker_stop_event is not None
    reap_deadline = 0.0

    while not _worker_stop_event.is_set():
        now = asyncio.get_running_loop().time()
        run_reaper = now >= reap_deadline
        try:
            await _run_pipeline_supervisor_iteration(wait_for_dispatched=False, run_reaper=run_reaper)
            if run_reaper:
                reap_deadline = now + _REAPER_INTERVAL_SECONDS
        except Exception:
            logger.exception("Pipeline jobs worker iteration failed")

        try:
            await asyncio.wait_for(_worker_stop_event.wait(), timeout=_SUPERVISOR_INTERVAL_SECONDS)
        except asyncio.TimeoutError:
            continue


def start_pipeline_jobs_worker() -> asyncio.Task[None]:
    global _worker_task, _worker_stop_event

    if _worker_task is not None:
        return _worker_task

    _worker_stop_event = asyncio.Event()
    _worker_task = asyncio.create_task(_pipeline_jobs_loop())
    logger.info("Started pipeline jobs worker")
    return _worker_task


def stop_pipeline_jobs_worker() -> None:
    global _worker_task, _worker_stop_event

    task = _worker_task
    if task is None:
        return

    event = _worker_stop_event
    if event is not None:
        event.set()
    task.cancel()
    _worker_task = None
    _worker_stop_event = None
