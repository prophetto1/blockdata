from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\WorkerTaskRunning.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun
from engine.core.runners.worker_instance import WorkerInstance
from engine.core.runners.worker_job_running import WorkerJobRunning
from engine.core.runners.worker_task import WorkerTask


@dataclass(slots=True, kw_only=True)
class WorkerTaskRunning(WorkerJobRunning):
    task_run: TaskRun
    task: Task
    run_context: RunContext
    t_y_p_e: ClassVar[str] = "task"
    type: str = TYPE

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(worker_task: WorkerTask, worker_instance: WorkerInstance, partition: int) -> WorkerTaskRunning:
        raise NotImplementedError  # TODO: translate from Java
