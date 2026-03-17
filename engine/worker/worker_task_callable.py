from __future__ import annotations

# Source: E:\KESTRA\worker\src\main\java\io\kestra\worker\WorkerTaskCallable.java

from dataclasses import dataclass
from typing import Any

from engine.worker.abstract_worker_callable import AbstractWorkerCallable
from engine.core.metrics.metric_registry import MetricRegistry
from engine.core.models.tasks.output import Output
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type
from engine.core.runners.worker_task import WorkerTask


@dataclass(slots=True, kw_only=True)
class WorkerTaskCallable(AbstractWorkerCallable):
    task: RunnableTask[Any] | None = None
    metric_registry: MetricRegistry | None = None
    worker_task: WorkerTask | None = None
    task_output: Output | None = None

    def signal_stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self, mark_as_killed: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def do_call(self) -> State.Type:
        raise NotImplementedError  # TODO: translate from Java
