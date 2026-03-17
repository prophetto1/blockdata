from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\services\LogTailService.java
# WARNING: Unresolved types: AtomicBoolean, Exception, Logger, Thread

from dataclasses import dataclass
from typing import Any

from engine.plugin.scripts.runner.docker.credentials import Credentials
from engine.core.models.executions.log_entry import LogEntry


@dataclass(slots=True, kw_only=True)
class LogTailService:

    @staticmethod
    def tail(logger: Logger, project_id: str, credential: Credentials, filter: str, stop_signal: AtomicBoolean) -> Thread:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log(logger: Logger, log_entry: LogEntry) -> None:
        raise NotImplementedError  # TODO: translate from Java
