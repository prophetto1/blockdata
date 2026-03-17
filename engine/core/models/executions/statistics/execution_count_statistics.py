from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\statistics\ExecutionCountStatistics.java
# WARNING: Unresolved types: Comparable

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class ExecutionCountStatistics:
    default_counts: ClassVar[dict[State.Type, int]]
    counts: dict[State.Type, int] | None = None
    total: int | None = None

    def compare_to(self, that: ExecutionCountStatistics) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def with_all_states_zero(counts: dict[State.Type, int]) -> dict[State.Type, int]:
        raise NotImplementedError  # TODO: translate from Java
