from __future__ import annotations

# Source: E:\KESTRA\executor\src\main\java\io\kestra\executor\SLAService.java

from dataclasses import dataclass
from typing import Any, Optional

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.sla.s_l_a import SLA
from engine.core.models.flows.sla.violation import Violation


@dataclass(slots=True, kw_only=True)
class SLAService:

    def evaluate_execution_changed_s_l_a(self, run_context: RunContext, flow: FlowInterface, execution: Execution) -> list[Violation]:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate_execution_monitoring_s_l_a(self, run_context: RunContext, execution: Execution, sla: SLA) -> Optional[Violation]:
        raise NotImplementedError  # TODO: translate from Java
