from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\runners\TaskRunner.java
# WARNING: Unresolved types: AtomicReference

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Callable

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.plugin import Plugin
from engine.core.models.plugin_versioning import PluginVersioning
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runners.target_os import TargetOS
from engine.core.models.tasks.runners.task_commands import TaskCommands
from engine.core.models.tasks.runners.task_runner_detail_result import TaskRunnerDetailResult
from engine.core.models.tasks.runners.task_runner_result import TaskRunnerResult
from engine.core.models.worker_job_lifecycle import WorkerJobLifecycle


@dataclass(slots=True, kw_only=True)
class TaskRunner(ABC):
    type: str
    killable: AtomicReference[Callable]
    is_killed: bool
    version: str | None = None
    additional_vars: dict[str, Any] | None = None
    env: dict[str, str] | None = None

    @abstractmethod
    def run(self, run_context: RunContext, task_commands: TaskCommands, files_to_download: list[str]) -> TaskRunnerResult[T]:
        ...

    def additional_vars(self, run_context: RunContext, task_commands: TaskCommands) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def runner_additional_vars(self, run_context: RunContext, task_commands: TaskCommands) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def env(self, run_context: RunContext, task_commands: TaskCommands) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def runner_env(self, run_context: RunContext, task_commands: TaskCommands) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def to_absolute_path(self, run_context: RunContext, task_commands: TaskCommands, relative_path: str, target_os: TargetOS) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def on_kill(self, runnable: Callable) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def check_killed(self, message: str | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java
