"""ProcessPoolExecutor wrapper for CPU-bound conversion isolation.

Docling document conversion is CPU-bound (10-60 seconds per document).
Running it directly in the async event loop blocks all other handlers.
This module provides a pool that:
1. Offloads conversion to separate processes
2. Tracks active/saturated state for readiness checks
3. Provides an async interface (submit returns an awaitable)
"""

import asyncio
import logging
import multiprocessing
import os
import sys
import threading
from concurrent.futures import ProcessPoolExecutor
from typing import Any, Callable, TypeVar

logger = logging.getLogger("platform-api.conversion-pool")

T = TypeVar("T")


def _get_mp_context():
    """Get multiprocessing context.

    Use 'fork' on Linux (Cloud Run) — child processes inherit the parent's
    loaded Docling models (~2GB), avoiding expensive re-imports.

    On macOS/Windows where fork is unsafe or unavailable, fall back to 'spawn'.
    Each child will re-import Docling, which is slow but correct.
    Set CONVERSION_MAX_WORKERS=0 on non-Linux dev machines to skip pool
    isolation and run conversions inline instead.
    """
    if sys.platform == "linux":
        return multiprocessing.get_context("fork")
    return multiprocessing.get_context("spawn")


class PoolOverloaded(Exception):
    """Raised when the conversion pool cannot accept more work."""
    pass


class ConversionPool:
    """Managed ProcessPoolExecutor with saturation tracking and admission control.

    Admission control prevents unbounded backlog when HTTP concurrency (8)
    exceeds conversion capacity (2 workers). Without it, excess /convert
    requests queue silently behind the two workers while lighter requests
    (health, functions, plugins) still flow — but conversion callers see
    ever-growing latency instead of a clear 503.
    """

    def __init__(self, max_workers: int | None = None, max_queue_depth: int | None = None):
        self._max_workers = max_workers or int(os.environ.get("CONVERSION_MAX_WORKERS", "2"))
        self._max_queue_depth = max_queue_depth if max_queue_depth is not None else int(
            os.environ.get("CONVERSION_MAX_QUEUE_DEPTH", "2")
        )
        mp_context = _get_mp_context()
        self._executor = ProcessPoolExecutor(
            max_workers=self._max_workers,
            mp_context=mp_context,
        )
        self._active = 0
        self._lock = threading.Lock()

    @property
    def active_count(self) -> int:
        with self._lock:
            return self._active

    @property
    def is_saturated(self) -> bool:
        with self._lock:
            return self._active >= self._max_workers

    def status(self) -> dict[str, Any]:
        with self._lock:
            return {
                "max_workers": self._max_workers,
                "max_queue_depth": self._max_queue_depth,
                "active": self._active,
                "saturated": self._active >= self._max_workers,
            }

    def submit(self, fn: Callable[..., T], *args: Any, **kwargs: Any) -> asyncio.Future:
        """Submit a callable to the process pool. Returns an awaitable future.

        Raises PoolOverloaded if active count has reached max_workers + max_queue_depth.
        The future resolves when the process completes. Exceptions propagate.
        """
        with self._lock:
            capacity = self._max_workers + self._max_queue_depth
            if self._active >= capacity:
                raise PoolOverloaded(
                    f"Conversion pool at capacity ({self._active}/{capacity}). "
                    "Try again shortly."
                )
            self._active += 1

        loop = asyncio.get_running_loop()
        future = loop.run_in_executor(self._executor, fn, *args)

        def _on_done(fut: asyncio.Future) -> None:
            with self._lock:
                self._active -= 1

        future.add_done_callback(_on_done)
        return future

    def shutdown(self, wait: bool = True) -> None:
        self._executor.shutdown(wait=wait)


# Module-level singleton, initialized in app lifespan
_pool: ConversionPool | None = None


def get_conversion_pool() -> ConversionPool:
    """Get the module-level conversion pool singleton."""
    global _pool
    if _pool is None:
        _pool = ConversionPool()
    return _pool


def init_pool(max_workers: int | None = None) -> ConversionPool:
    """Initialize the module-level pool. Called from app lifespan."""
    global _pool
    _pool = ConversionPool(max_workers=max_workers)
    logger.info(f"Conversion pool initialized with {_pool._max_workers} workers")
    return _pool


def shutdown_pool() -> None:
    """Shutdown the module-level pool. Called from app lifespan."""
    global _pool
    if _pool:
        _pool.shutdown(wait=True)
        _pool = None
