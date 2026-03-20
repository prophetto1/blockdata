from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.core.config import get_settings
from app.infra.supabase_client import get_supabase_admin

from opentelemetry import trace

tracer = trace.get_tracer(__name__)

logger = logging.getLogger("platform-api.storage-cleanup")

_cleanup_task: asyncio.Task[None] | None = None
_cleanup_stop_event: asyncio.Event | None = None


def _release_expired_reservations_once_sync() -> int:
    """Execute one cleanup pass and return number of released reservations."""
    admin = get_supabase_admin()
    result = admin.rpc("release_expired_storage_reservations").execute()
    data = result.data
    if isinstance(data, int):
        return data
    if isinstance(data, str):
        try:
            return int(data)
        except ValueError:
            return 0
    if isinstance(data, dict):
        for key in ("count", "released", "result"):
            value = data.get(key)
            if isinstance(value, int):
                return value
        if isinstance(data.get("data"), int):
            return int(data["data"])
    return 0


async def _release_expired_reservations_once() -> int:
    return await asyncio.to_thread(_release_expired_reservations_once_sync)


async def _storage_cleanup_loop(interval_seconds: int) -> None:
    assert _cleanup_stop_event is not None
    while not _cleanup_stop_event.is_set():
        with tracer.start_as_current_span("storage_cleanup.run") as span:
            try:
                released = await _release_expired_reservations_once()
                span.set_attribute("released_count", released)
                logger.info("Released %s expired storage reservations", released)
            except Exception as e:
                span.record_exception(e)
                span.set_attribute("error.type", type(e).__name__)
                logger.exception("Storage cleanup worker failed")

        try:
            await asyncio.wait_for(_cleanup_stop_event.wait(), timeout=interval_seconds)
        except asyncio.TimeoutError:
            continue


def _cleanup_interval_seconds() -> int:
    settings = get_settings()
    value: Any = getattr(settings, "storage_cleanup_interval_seconds", None)
    if value is None:
        value = 300
    value = int(value)
    return max(1, value)


def start_storage_cleanup_worker(interval_seconds: int | None = None) -> asyncio.Task[None]:
    global _cleanup_task, _cleanup_stop_event

    if _cleanup_task is not None:
        return _cleanup_task

    _cleanup_stop_event = asyncio.Event()
    interval = _cleanup_interval_seconds() if interval_seconds is None else interval_seconds
    _cleanup_task = asyncio.create_task(_storage_cleanup_loop(interval))
    logger.info("Started storage cleanup worker with interval %ss", interval)
    return _cleanup_task


def stop_storage_cleanup_worker() -> None:
    global _cleanup_task, _cleanup_stop_event

    task = _cleanup_task
    if task is None:
        return

    event = _cleanup_stop_event
    if event is None:
        task.cancel()
    else:
        event.set()

    task.cancel()
    _cleanup_task = None
    _cleanup_stop_event = None
