from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\runner\Process.java
# WARNING: Unresolved types: Exception, InputStream, Logger, ProcessHandle, Runnable

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.runners.abstract_log_consumer import AbstractLogConsumer
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runners.task_commands import TaskCommands
from engine.core.models.tasks.runners.task_runner import TaskRunner
from engine.core.models.tasks.runners.task_runner_detail_result import TaskRunnerDetailResult
from engine.core.models.tasks.runners.task_runner_result import TaskRunnerResult


@dataclass(slots=True, kw_only=True)
class Process(TaskRunner):
    """Run tasks as local subprocesses on the worker."""

    @staticmethod
    def instance() -> Process:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext, task_commands: TaskCommands, files_to_download: list[str]) -> TaskRunnerResult[TaskRunnerDetailResult]:
        raise NotImplementedError  # TODO: translate from Java

    def runner_additional_vars(self, run_context: RunContext, task_commands: TaskCommands) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def kill_descendants_of(self, process: ProcessHandle, logger: Logger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class LogRunnable:
        input_stream: InputStream | None = None
        log_consumer_interface: AbstractLogConsumer | None = None
        is_std_err: bool | None = None

        def run(self) -> None:
            raise NotImplementedError  # TODO: translate from Java
