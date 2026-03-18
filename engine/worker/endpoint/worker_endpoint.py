from __future__ import annotations

# Source: E:\KESTRA\worker\src\main\java\io\kestra\worker\endpoint\WorkerEndpoint.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.worker.default_worker import DefaultWorker
from engine.core.models.tasks.task import Task
from engine.core.models.executions.task_run import TaskRun


@dataclass(slots=True, kw_only=True)
class WorkerEndpoint:
    worker: DefaultWorker | None = None

    def running(self) -> WorkerEndpointResult:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class WorkerEndpointResult:
        running_count: int | None = None
        runnings: list[WorkerEndpointWorkerTask] | None = None

    @dataclass(slots=True)
    class WorkerEndpointWorkerTask:
        type: str | None = None
        task_run: TaskRun | None = None
        task: Task | None = None
        trigger: AbstractTrigger | None = None
