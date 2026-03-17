from __future__ import annotations

# Source: E:\KESTRA\worker\src\main\java\io\kestra\worker\AbstractWorkerTriggerCallable.java

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.worker.abstract_worker_callable import AbstractWorkerCallable
from engine.core.runners.run_context import RunContext
from engine.core.runners.worker_trigger import WorkerTrigger


@dataclass(slots=True, kw_only=True)
class AbstractWorkerTriggerCallable(AbstractWorkerCallable):
    a_w_a_i_t__o_n__k_i_l_l: timedelta = Duration.ofMillis(50)
    worker_trigger: WorkerTrigger | None = None

    def signal_stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self, mark_as_killed: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java
