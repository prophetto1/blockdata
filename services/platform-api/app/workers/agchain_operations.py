from __future__ import annotations

import asyncio
import logging
import os
import socket
from collections.abc import Callable
from typing import Any

from app.core.config import get_settings
from app.domain.agchain.operation_queue import (
    complete_operation,
    fail_operation,
    heartbeat_operation,
    lease_operation,
)


logger = logging.getLogger("platform-api.agchain-operations")

_worker_task: asyncio.Task[None] | None = None
_worker_stop_event: asyncio.Event | None = None
_OPERATION_HANDLERS: dict[str, Callable[..., dict[str, Any] | None]] = {}


def _worker_identity() -> str:
    return f"{socket.gethostname()}:{os.getpid()}"


def _poll_interval_seconds() -> int:
    return max(1, int(get_settings().agchain_operations_worker_poll_interval_seconds))


def _batch_size() -> int:
    return max(1, int(get_settings().agchain_operations_worker_batch_size))


def _lease_seconds() -> int:
    return max(1, int(get_settings().agchain_operations_worker_lease_seconds))


def _resolve_operation_handler(operation_type: str) -> Callable[..., dict[str, Any] | None]:
    handler = _OPERATION_HANDLERS.get(operation_type)
    if handler is None:
        raise RuntimeError(f"Unknown AG chain operation type: {operation_type}")
    return handler


def _run_claimed_operation_sync(*, operation: dict[str, Any], worker_id: str) -> None:
    progress: dict[str, Any] = {}

    def _heartbeat(next_progress: dict[str, Any] | None = None) -> None:
        nonlocal progress
        if next_progress is not None:
            progress = dict(next_progress)
        heartbeat_operation(
            operation_id=operation["operation_id"],
            worker_id=worker_id,
            progress=progress,
        )

    try:
        handler = _resolve_operation_handler(operation["operation_type"])
        result = handler(operation=operation, heartbeat=_heartbeat) or {}
        complete_operation(
            operation_id=operation["operation_id"],
            worker_id=worker_id,
            result=result,
            progress=progress,
        )
    except Exception as exc:
        fail_operation(
            operation_id=operation["operation_id"],
            worker_id=worker_id,
            error={"message": str(exc) or type(exc).__name__, "error_type": type(exc).__name__},
            retryable=True,
        )
        raise


async def _await_claimed_operation(operation: dict[str, Any], worker_id: str) -> None:
    try:
        await asyncio.to_thread(_run_claimed_operation_sync, operation=operation, worker_id=worker_id)
    except Exception:
        logger.exception("AG chain operation execution failed")


async def _run_operations_supervisor_iteration(*, wait_for_dispatched: bool = False) -> dict[str, int]:
    worker_id = _worker_identity()
    leased_rows: list[dict[str, Any]] = []

    for _ in range(_batch_size()):
        row = await asyncio.to_thread(
            lease_operation,
            worker_id=worker_id,
            lease_seconds=_lease_seconds(),
        )
        if row is None:
            break
        leased_rows.append(row)

    pending = [asyncio.create_task(_await_claimed_operation(row, worker_id)) for row in leased_rows]
    if wait_for_dispatched and pending:
        await asyncio.gather(*pending)
    return {"claimed": len(leased_rows), "dispatched": len(leased_rows)}


async def _agchain_operations_loop() -> None:
    assert _worker_stop_event is not None
    while not _worker_stop_event.is_set():
        try:
            await _run_operations_supervisor_iteration(wait_for_dispatched=False)
        except Exception:
            logger.exception("AG chain operations worker iteration failed")

        try:
            await asyncio.wait_for(_worker_stop_event.wait(), timeout=_poll_interval_seconds())
        except asyncio.TimeoutError:
            continue


def start_agchain_operations_worker() -> asyncio.Task[None]:
    global _worker_task, _worker_stop_event
    if _worker_task is not None:
        return _worker_task

    _worker_stop_event = asyncio.Event()
    _worker_task = asyncio.create_task(_agchain_operations_loop())
    logger.info(
        "Started AG chain operations worker with poll=%ss batch=%s lease=%ss",
        _poll_interval_seconds(),
        _batch_size(),
        _lease_seconds(),
    )
    return _worker_task


def stop_agchain_operations_worker() -> None:
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

