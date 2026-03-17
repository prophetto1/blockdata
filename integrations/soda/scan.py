from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path

from integrations.soda.abstract_soda import AbstractSoda
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.soda.models.scan_result import ScanResult
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput
from engine.core.models.flows.state import State


@dataclass(slots=True, kw_only=True)
class Scan(AbstractSoda, RunnableTask):
    """Run Soda scan and report results"""
    checks: dict[String, Object]
    variables: Property[dict[String, Object]] | None = None
    verbose: Property[bool] | None = None

    def final_input_files(self, run_context: RunContext, working_directory: Path) -> dict[String, String]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Scan:
        raise NotImplementedError  # TODO: translate from Java

    def parse_result(self, run_context: RunContext, output: ScriptOutput) -> ScanResult:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        result: ScanResult | None = None
        std_out_line_count: int | None = None
        std_err_line_count: int | None = None
        exit_code: int
        configuration: dict[String, Object]

        def final_state(self) -> Optional[State]:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    result: ScanResult | None = None
    std_out_line_count: int | None = None
    std_err_line_count: int | None = None
    exit_code: int
    configuration: dict[String, Object]

    def final_state(self) -> Optional[State]:
        raise NotImplementedError  # TODO: translate from Java
