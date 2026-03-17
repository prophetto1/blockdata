from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\AbstractServiceLivenessTask.java
# WARNING: Unresolved types: AtomicBoolean, AutoCloseable, Exception, Runnable, ScheduledExecutorService, ScheduledFuture

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from engine.core.server.server_config import ServerConfig


@dataclass(slots=True, kw_only=True)
class AbstractServiceLivenessTask(ABC):
    is_stopped: AtomicBoolean = new AtomicBoolean(false)
    name: str | None = None
    server_config: ServerConfig | None = None
    scheduled_executor_service: ScheduledExecutorService | None = None
    scheduled_future: ScheduledFuture[Any] | None = None
    last_scheduled_execution: datetime | None = None

    def run(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, now: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def last_scheduled_execution(self) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def get_elapsed_milli_since_last_schedule(self, now: datetime) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def on_schedule(self, now: datetime) -> None:
        ...

    def start(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_liveness_enabled(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def get_schedule_interval(self) -> timedelta:
        ...

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
