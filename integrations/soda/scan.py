from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-soda\src\main\java\io\kestra\plugin\soda\Scan.java
# WARNING: Unresolved types: Exception, IOException, core, io, kestra, models, tasks

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from integrations.soda.abstract_soda import AbstractSoda
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.soda.models.scan_result import ScanResult
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class Scan(AbstractSoda):
    """Run Soda scan and report results"""
    checks: dict[str, Any]
    verbose: Property[bool] = Property.ofValue(false)
    variables: Property[dict[str, Any]] | None = None

    def final_input_files(self, run_context: RunContext, working_directory: Path) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Scan.Output:
        raise NotImplementedError  # TODO: translate from Java

    def parse_result(self, run_context: RunContext, output: ScriptOutput) -> ScanResult:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        exit_code: int
        configuration: dict[str, Any]
        result: ScanResult | None = None
        std_out_line_count: int | None = None
        std_err_line_count: int | None = None

        def final_state(self) -> Optional[State.Type]:
            raise NotImplementedError  # TODO: translate from Java
