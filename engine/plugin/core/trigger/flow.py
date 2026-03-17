from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\trigger\Flow.java
# WARNING: Unresolved types: Logger, conditions, core, flows, io, kestra, models, tasks

from dataclasses import dataclass, field
from enum import Enum
from logging import logging
from typing import Any, ClassVar, Optional

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition import Condition
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.triggers.multipleflows.multiple_condition import MultipleCondition
from engine.core.models.triggers.multipleflows.multiple_condition_storage_interface import MultipleConditionStorageInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.state import State
from engine.core.models.triggers.time_window import TimeWindow
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Flow(AbstractTrigger):
    """Trigger a Flow based on other Flows’ executions."""
    states: list[State.Type]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    trigger_var: ClassVar[str] = "trigger"
    outputs_var: ClassVar[str] = "outputs"
    inputs: dict[str, Any] | None = None
    preconditions: Preconditions | None = None

    def evaluate(self, multiple_condition_storage: Optional[MultipleConditionStorageInterface], run_context: RunContext, flow: io.kestra.core.models.flows.Flow, current: Execution) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Preconditions:
        id: str
        time_window: TimeWindow
        reset_on_success: bool = Boolean.TRUE
        flows: list[UpstreamFlow] | None = None
        where: list[ExecutionFilter] | None = None

        def get_conditions(self) -> dict[str, Condition]:
            raise NotImplementedError  # TODO: translate from Java

        def get_upstream_flows_conditions(self) -> dict[str, Condition]:
            raise NotImplementedError  # TODO: translate from Java

        def get_where_conditions(self) -> dict[str, Condition]:
            raise NotImplementedError  # TODO: translate from Java

        def logger(self) -> Logger:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class UpstreamFlow:
        namespace: str
        flow_id: str | None = None
        states: list[State.Type] | None = None
        labels: dict[str, Any] | None = None

    @dataclass(slots=True)
    class UpstreamFlowCondition(Condition):
        upstream_flow: UpstreamFlow | None = None

        def test(self, condition_context: ConditionContext) -> bool:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ExecutionFilter:
        id: str
        filters: list[Filter]
        operand: Operand = Operand.AND

    class Operand(str, Enum):
        AND = "AND"
        OR = "OR"

    @dataclass(slots=True)
    class Filter:
        field: Field
        type: Type
        value: str | None = None
        values: list[str] | None = None

    class Field(str, Enum):
        FLOW_ID = "FLOW_ID"
        NAMESPACE = "NAMESPACE"
        STATE = "STATE"
        EXPRESSION = "EXPRESSION"

    class Type(str, Enum):
        EQUAL_TO = "EQUAL_TO"
        NOT_EQUAL_TO = "NOT_EQUAL_TO"
        IN = "IN"
        NOT_IN = "NOT_IN"
        IS_TRUE = "IS_TRUE"
        IS_FALSE = "IS_FALSE"
        IS_NULL = "IS_NULL"
        IS_NOT_NULL = "IS_NOT_NULL"
        STARTS_WITH = "STARTS_WITH"
        ENDS_WITH = "ENDS_WITH"
        REGEX = "REGEX"
        CONTAINS = "CONTAINS"

    @dataclass(slots=True)
    class FilterCondition(Condition):
        filter: ExecutionFilter | None = None

        def test(self, condition_context: ConditionContext) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def evaluate(self, condition_context: ConditionContext, filter: Filter) -> bool:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        execution_id: str
        execution_labels: dict[str, Any]
        state: State.Type
        namespace: str
        flow_id: str
        flow_revision: int
        outputs: dict[str, Any] | None = None
