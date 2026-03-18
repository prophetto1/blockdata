from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\ee\tests\RunTests.java
# WARNING: Unresolved types: Exception, TestSuiteServiceTestRunByQueryResult, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any, Optional

from integrations.git.abstract_kestra_task import AbstractKestraTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class RunTests(AbstractKestraTask):
    """Run tests by query"""
    include_child_namespaces: Property[bool] = Property.ofValue(true)
    fail_on_test_failure: Property[bool] = Property.ofValue(false)
    namespace: Property[str] | None = None
    flow_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def mark_task_as_error(error_state: Optional[State.Type]) -> Optional[State.Type]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def mark_task_as_warning(error_state: Optional[State.Type]) -> Optional[State.Type]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        task_state_override: Optional[State.Type] = Optional.empty()
        result: TestSuiteServiceTestRunByQueryResult | None = None
        test_suites_run_success_count: int | None = None
        test_suites_run_skipped_count: int | None = None
        test_suites_run_failed_count: int | None = None

        def final_state(self) -> Optional[State.Type]:
            raise NotImplementedError  # TODO: translate from Java
