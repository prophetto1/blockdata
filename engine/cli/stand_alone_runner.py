from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\StandAloneRunner.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from datetime import timedelta
from typing import Any, ClassVar

from engine.executor.executor_service import ExecutorService
from engine.core.utils.executors_utils import ExecutorsUtils
from engine.core.server.service import Service


@dataclass(slots=True, kw_only=True)
class StandAloneRunner:
    worker_thread: int
    running: bool
    logger: ClassVar[Logger] = getLogger(__name__)
    scheduler_enabled: bool = True
    worker_enabled: bool = True
    indexer_enabled: bool = True
    servers: list[Service] = field(default_factory=list)
    executors_utils: ExecutorsUtils | None = None
    application_context: ApplicationContext | None = None
    running_timeout: timedelta | None = None
    pool_executor: ExecutorService | None = None

    def run(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
