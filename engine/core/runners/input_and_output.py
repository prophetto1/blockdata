from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\InputAndOutput.java

from typing import Any, Protocol

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.flows.output import Output


class InputAndOutput(Protocol):
    def read_inputs(self, flow: FlowInterface, execution: Execution, inputs: dict[str, Any]) -> dict[str, Any]: ...

    def typed_outputs(self, flow: FlowInterface, execution: Execution, r_outputs: dict[str, Any]) -> dict[str, Any]: ...

    def render_outputs(self, outputs: list[Output]) -> dict[str, Any]: ...
