from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\InputAndOutputImpl.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.runners.flow_input_output import FlowInputOutput
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.input_and_output import InputAndOutput
from engine.core.models.flows.output import Output
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class InputAndOutputImpl:
    flow_input_output: FlowInputOutput | None = None
    run_context: RunContext | None = None

    def read_inputs(self, flow: FlowInterface, execution: Execution, inputs: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def typed_outputs(self, flow: FlowInterface, execution: Execution, r_outputs: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def render_outputs(self, outputs: list[Output]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
