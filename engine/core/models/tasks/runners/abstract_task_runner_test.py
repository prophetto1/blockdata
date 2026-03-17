from __future__ import annotations

# Source: E:\KESTRA\tests\src\main\java\io\kestra\core\models\tasks\runners\AbstractTaskRunnerTest.java
# WARNING: Unresolved types: Exception, IOException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext
from engine.core.runners.run_context_factory import RunContextFactory
from engine.core.storages.storage_interface import StorageInterface
from engine.core.models.tasks.runners.task_commands import TaskCommands
from engine.core.models.tasks.runners.task_runner import TaskRunner
from engine.core.context.test_run_context_factory import TestRunContextFactory


@dataclass(slots=True, kw_only=True)
class AbstractTaskRunnerTest(ABC):
    run_context_factory: TestRunContextFactory | None = None
    storage: StorageInterface | None = None

    def run(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def output_dir_disabled(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def fail(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def input_and_output_files(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def fail_with_input(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def can_work_multiple_time_in_same_wdir(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def run_context(self, run_context_factory: RunContextFactory) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def run_context(self, run_context_factory: RunContextFactory, additional_vars: dict[str, Any]) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def run_context(self, run_context_factory: RunContextFactory, additional_vars: dict[str, Any], task_run_id: str) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def task_runner(self) -> TaskRunner[Any]:
        ...

    def default_image(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def init_script_commands(self, run_context: RunContext) -> TaskCommands:
        raise NotImplementedError  # TODO: translate from Java

    def needs_to_specify_working_directory(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java
