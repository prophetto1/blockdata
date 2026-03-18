from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\sla\types\ExecutionAssertionSLA.java

from dataclasses import dataclass
from typing import Any, Optional

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.sla.execution_changed_sla import ExecutionChangedSLA
from engine.core.exceptions.internal_exception import InternalException
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.sla.sla import SLA
from engine.core.models.flows.sla.violation import Violation


@dataclass(slots=True, kw_only=True)
class ExecutionAssertionSLA(SLA):
    _assert: str

    def evaluate(self, run_context: RunContext, execution: Execution) -> Optional[Violation]:
        raise NotImplementedError  # TODO: translate from Java
