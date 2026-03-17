from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\ConditionService.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition import Condition
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow import Flow
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.triggers.multipleflows.multiple_condition import MultipleCondition
from engine.core.models.triggers.multipleflows.multiple_condition_storage_interface import MultipleConditionStorageInterface
from engine.core.models.tasks.resolved_task import ResolvedTask
from engine.core.runners.run_context import RunContext
from engine.core.runners.run_context_factory import RunContextFactory


@dataclass(slots=True, kw_only=True)
class ConditionService:
    run_context_factory: RunContextFactory | None = None

    def is_valid(self, condition: Condition, flow: FlowInterface, execution: Execution, multiple_condition_storage: MultipleConditionStorageInterface) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_valid(self, condition: Condition, flow: FlowInterface, execution: Execution) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def log_exception(self, flow: FlowInterface, condition: Any, condition_context: ConditionContext, e: Exception) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_valid(self, flow: Flow, trigger: AbstractTrigger, condition_context: ConditionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def are_valid(self, conditions: list[Condition], condition_context: ConditionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_valid(self, trigger: AbstractTrigger, flow: Flow, execution: Execution, multiple_condition_storage: MultipleConditionStorageInterface) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def is_valid(self, preconditions: MultipleCondition, flow: Flow, execution: Execution, multiple_condition_storage: MultipleConditionStorageInterface) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def condition_context(self, run_context: RunContext, flow: FlowInterface, execution: Execution, multiple_condition_storage: MultipleConditionStorageInterface) -> ConditionContext:
        raise NotImplementedError  # TODO: translate from Java

    def condition_context(self, run_context: RunContext, flow: Flow, execution: Execution) -> ConditionContext:
        raise NotImplementedError  # TODO: translate from Java

    def valid(self, flow: Flow, conditions: list[Condition], execution: Execution) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def valid(self, flow: FlowInterface, list: list[Condition], condition_context: ConditionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def find_valid_listeners(self, flow: Flow, execution: Execution) -> list[ResolvedTask]:
        raise NotImplementedError  # TODO: translate from Java
