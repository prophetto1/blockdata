from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\ServerConfig.java

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.server.worker_task_restart_strategy import WorkerTaskRestartStrategy


@dataclass(slots=True, kw_only=True)
class ServerConfig:
    termination_grace_period: timedelta | None = None
    worker_task_restart_strategy: WorkerTaskRestartStrategy | None = None
    liveness: Liveness | None = None

    def worker_task_restart_strategy(self) -> WorkerTaskRestartStrategy:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Liveness:
        enabled: bool | None = None
        interval: timedelta | None = None
        timeout: timedelta | None = None
        initial_delay: timedelta | None = None
        heartbeat_interval: timedelta | None = None
