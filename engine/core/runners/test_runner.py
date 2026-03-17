from __future__ import annotations

# Source: E:\KESTRA\tests\src\main\java\io\kestra\core\runners\TestRunner.java
# WARNING: Unresolved types: ApplicationContext, AtomicBoolean, AutoCloseable, Exception, Runnable

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any

from engine.executor.executor_service import ExecutorService
from engine.core.utils.executors_utils import ExecutorsUtils
from engine.core.server.service import Service


@dataclass(slots=True, kw_only=True)
class TestRunner:
    worker_thread: int = Math.max(3, Runtime.getRuntime().availableProcessors()) * 4
    scheduler_enabled: bool = True
    worker_enabled: bool = True
    servers: list[Service] = field(default_factory=list)
    running: AtomicBoolean = new AtomicBoolean(false)
    executors_utils: ExecutorsUtils | None = None
    application_context: ApplicationContext | None = None
    running_timeout: timedelta | None = None
    pool_executor: ExecutorService | None = None

    def run(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_running(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
