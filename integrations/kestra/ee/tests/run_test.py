from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\ee\tests\RunTest.java
# WARNING: Unresolved types: Exception, Logger, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any, Optional

from integrations.git.abstract_kestra_task import AbstractKestraTask
from engine.core.test.flow.assertion_result import AssertionResult
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State
from engine.core.test.test_suite_run_result import TestSuiteRunResult
from engine.core.models.flows.type import Type
from engine.core.test.flow.unit_test_result import UnitTestResult


@dataclass(slots=True, kw_only=True)
class RunTest(AbstractKestraTask):
    """Run a single test suite"""
    namespace: Property[str]
    test_id: Property[str]
    fail_on_test_failure: Property[bool] = Property.ofValue(false)
    test_cases: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log_test_case(logger: Logger, test_suite_id: str, test_case_result: UnitTestResult) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def format_assertion_result(assertion_result: AssertionResult) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def format_errors(test_case_result: UnitTestResult) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        task_state_override: Optional[State.Type] = Optional.empty()
        result: TestSuiteRunResult | None = None

        def final_state(self) -> Optional[State.Type]:
            raise NotImplementedError  # TODO: translate from Java
