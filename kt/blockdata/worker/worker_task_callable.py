from __future__ import annotations

from typing import Any

from blockdata.core.runners.run_context import RunContext
from blockdata.worker.abstract_worker_callable import AbstractWorkerCallable
from blockdata.worker.worker_task import WorkerTask


class WorkerTaskCallable(AbstractWorkerCallable):
    def __init__(self, worker_task: WorkerTask, run_context: RunContext | None = None) -> None:
        super().__init__(worker_task)
        self.run_context = run_context or worker_task.run_context

    def do_call(self) -> Any:
        task = self.worker_task.task
        run_method = getattr(task, "run", None)
        if not callable(run_method):
            raise TypeError(f"Task {type(task).__name__} must define run(run_context)")
        return run_method(self.run_context)
