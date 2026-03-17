from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.plugin.scripts.runner.docker.credentials import Credentials
from engine.core.models.executions.log_entry import LogEntry


@dataclass(slots=True, kw_only=True)
class LogTailService:

    def tail(self, logger: Logger, project_id: str, credential: Credentials, filter: str, stop_signal: AtomicBoolean) -> Thread:
        raise NotImplementedError  # TODO: translate from Java

    def log(self, logger: Logger, log_entry: LogEntry) -> None:
        raise NotImplementedError  # TODO: translate from Java
