from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\notifications\ExecutionService.java
# WARNING: Unresolved types: NoSuchElementException

from dataclasses import dataclass
from typing import Any, Optional

from engine.core.models.executions.execution import Execution
from engine.core.plugins.notifications.execution_interface import ExecutionInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class ExecutionService:

    @staticmethod
    def find_execution(run_context: RunContext, execution_id: Property[str]) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_execution_in_the_wanted_state(execution: Execution, is_current_execution: bool, flow_trigger_execution_state: Optional[str]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def execution_map(run_context: RunContext, execution_interface: ExecutionInterface) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_optional_flow_trigger_execution_state(run_context: RunContext) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_current_execution(run_context: RunContext, execution_id: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java
