from __future__ import annotations

from typing import Any


class WorkerCallableKilledError(RuntimeError):
    pass


class AbstractWorkerCallable:
    def __init__(self, worker_task: Any) -> None:
        self.worker_task = worker_task
        self._killed = False

    def kill(self) -> None:
        self._killed = True

    def call(self) -> Any:
        if self._killed:
            raise WorkerCallableKilledError("Worker callable was killed before execution")
        return self.do_call()

    def do_call(self) -> Any:
        raise NotImplementedError
