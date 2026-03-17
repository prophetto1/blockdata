from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datahub\src\main\java\io\kestra\plugin\datahub\DataHubLogConsumer.java
# WARNING: Unresolved types: AtomicInteger

from dataclasses import dataclass
from datetime import datetime
from typing import Any

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
