from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\log\KestraLogFilter.java
# WARNING: Unresolved types: EvaluationException, EventEvaluatorBase

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class KestraLogFilter(EventEvaluatorBase):

    def evaluate(self, event: ILoggingEvent) -> bool:
        raise NotImplementedError  # TODO: translate from Java
