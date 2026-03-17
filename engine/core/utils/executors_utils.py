from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\ExecutorsUtils.java
# WARNING: Unresolved types: MeterRegistry, ScheduledExecutorService, ScheduledFuture

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.executor.executor_service import ExecutorService


@dataclass(slots=True, kw_only=True)
class ExecutorsUtils:
    meter_registry: MeterRegistry | None = None

    def cached_thread_pool(self, name: str) -> ExecutorService:
        raise NotImplementedError  # TODO: translate from Java

    def max_cached_thread_pool(self, max_thread: int, name: str) -> ExecutorService:
        raise NotImplementedError  # TODO: translate from Java

    def single_thread_executor(self, name: str) -> ExecutorService:
        raise NotImplementedError  # TODO: translate from Java

    def single_thread_scheduled_executor(self, name: str) -> ExecutorService:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def close_scheduled_thread_pool(scheduled_executor_service: ScheduledExecutorService, grace_period: timedelta, task_futures: list[ScheduledFuture[Any]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def wrap(self, name: str, executor_service: ExecutorService) -> ExecutorService:
        raise NotImplementedError  # TODO: translate from Java
