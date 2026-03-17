from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from engine.core.models.tasks.runners.abstract_log_consumer import AbstractLogConsumer
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class DataHubLogConsumer(AbstractLogConsumer):
    run_context: RunContext | None = None
    counter: AtomicInteger | None = None

    def accept(self, line: str, is_std_err: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def accept(self, line: str, is_std_err: bool, instant: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java
