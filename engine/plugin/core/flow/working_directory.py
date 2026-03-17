from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\flow\WorkingDirectory.java
# WARNING: Unresolved types: Exception, IOException

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.tasks.input_files_interface import InputFilesInterface
from engine.core.models.tasks.namespace_files import NamespaceFiles
from engine.core.models.tasks.namespace_files_interface import NamespaceFilesInterface
from engine.core.models.executions.next_task_run import NextTaskRun
from engine.core.models.tasks.output_files_interface import OutputFilesInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.plugin.core.flow.sequential import Sequential
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.models.tasks.void_output import VoidOutput
from engine.core.runners.worker_task import WorkerTask


@dataclass(slots=True, kw_only=True)
class WorkingDirectory(Sequential):
    """Reuse a single working directory across tasks."""
    o_u_t_p_u_t_s__f_i_l_e: str = "outputs.ion"
    cache_downloaded_time: int = 0
    cache: Cache | None = None
    namespace_files: NamespaceFiles | None = None
    input_files: Any | None = None
    output_files: Property[list[str]] | None = None

    def resolve_nexts(self, run_context: RunContext, execution: Execution, parent_task_run: TaskRun) -> list[NextTaskRun]:
        raise NotImplementedError  # TODO: translate from Java

    def worker_task(self, parent: TaskRun, task: Task, run_context: RunContext) -> WorkerTask:
        raise NotImplementedError  # TODO: translate from Java

    def pre_execute_tasks(self, run_context: RunContext, task_run: TaskRun) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def post_execute_tasks(self, run_context: RunContext, task_run: TaskRun) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def outputs(self, run_context: RunContext) -> Outputs:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Outputs(VoidOutput):
        output_files: dict[str, str] | None = None

    @dataclass(slots=True)
    class Cache:
        patterns: Property[list[str]]
        ttl: Property[timedelta] | None = None
