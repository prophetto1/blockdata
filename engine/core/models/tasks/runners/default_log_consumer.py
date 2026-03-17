from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\runners\DefaultLogConsumer.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.tasks.runners.abstract_log_consumer import AbstractLogConsumer
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class DefaultLogConsumer(AbstractLogConsumer):
    run_context: RunContext | None = None

    def accept(self, line: str, is_std_err: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def accept(self, line: str, is_std_err: bool, instant: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java
