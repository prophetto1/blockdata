from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\statistics\ExecutionCountStatistics.java
# WARNING: Unresolved types: Comparable

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class ExecutionCountStatistics:
    d_e_f_a_u_l_t__c_o_u_n_t_s: dict[State.Type, int] = Map.ofEntries(
        Map.entry(State.Type.CREATED, 0L),
        Map.entry(State.Type.RUNNING, 0L),
        Map.entry(State.Type.RESTARTED, 0L),
        Map.entry(State.Type.KILLING, 0L),
        Map.entry(State.Type.SUCCESS, 0L),
        Map.entry(State.Type.WARNING, 0L),
        Map.entry(State.Type.FAILED, 0L),
        Map.entry(State.Type.KILLED, 0L),
        Map.entry(State.Type.PAUSED, 0L),
        Map.entry(State.Type.QUEUED, 0L),
        Map.entry(State.Type.CANCELLED, 0L)
    )
    counts: dict[State.Type, int] | None = None
    total: int | None = None

    def compare_to(self, that: ExecutionCountStatistics) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def with_all_states_zero(counts: dict[State.Type, int]) -> dict[State.Type, int]:
        raise NotImplementedError  # TODO: translate from Java
