from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.plugins.notifications.execution_interface import ExecutionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class ExecutionService:

    def find_execution(self, run_context: RunContext, execution_id: Property[str]) -> Execution:
        raise NotImplementedError  # TODO: translate from Java

    def is_execution_in_the_wanted_state(self, execution: Execution, is_current_execution: bool, flow_trigger_execution_state: Optional[String]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def execution_map(self, run_context: RunContext, execution_interface: ExecutionInterface) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def get_optional_flow_trigger_execution_state(self, run_context: RunContext) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java

    def is_current_execution(self, run_context: RunContext, execution_id: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java
