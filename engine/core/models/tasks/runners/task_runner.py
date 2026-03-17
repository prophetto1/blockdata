from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\runners\TaskRunner.java
# WARNING: Unresolved types: AtomicBoolean, AtomicReference, Exception, Runnable, T

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.plugin import Plugin
from engine.core.models.plugin_versioning import PluginVersioning
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runners.target_o_s import TargetOS
from engine.core.models.tasks.runners.task_commands import TaskCommands
from engine.core.models.tasks.runners.task_runner_detail_result import TaskRunnerDetailResult
from engine.core.models.tasks.runners.task_runner_result import TaskRunnerResult
from engine.core.models.worker_job_lifecycle import WorkerJobLifecycle


@dataclass(slots=True, kw_only=True)
class TaskRunner:
    type: str
    killable: AtomicReference[Runnable] = new AtomicReference<>()
    is_killed: AtomicBoolean = new AtomicBoolean(false)
    version: str | None = None
    additional_vars: dict[str, Any] | None = None
    env: dict[str, str] | None = None

    def run(self, run_context: RunContext, task_commands: TaskCommands, files_to_download: list[str]) -> TaskRunnerResult[T]:
        raise NotImplementedError  # TODO: translate from Java

    def additional_vars(self, run_context: RunContext, task_commands: TaskCommands) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def runner_additional_vars(self, run_context: RunContext, task_commands: TaskCommands) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def env(self, run_context: RunContext, task_commands: TaskCommands) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def runner_env(self, run_context: RunContext, task_commands: TaskCommands) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def to_absolute_path(self, run_context: RunContext, task_commands: TaskCommands, relative_path: str, target_o_s: TargetOS) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def on_kill(self, runnable: Runnable) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def check_killed(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def check_killed(self, message: str) -> None:
        raise NotImplementedError  # TODO: translate from Java
