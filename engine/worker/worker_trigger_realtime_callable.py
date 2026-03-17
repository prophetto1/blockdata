from __future__ import annotations

# Source: E:\KESTRA\worker\src\main\java\io\kestra\worker\WorkerTriggerRealtimeCallable.java
# WARNING: Unresolved types: Consumer, Exception, Throwable

from dataclasses import dataclass
from typing import Any

from engine.worker.abstract_worker_trigger_callable import AbstractWorkerTriggerCallable
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type
from engine.core.runners.worker_trigger import WorkerTrigger


@dataclass(slots=True, kw_only=True)
class WorkerTriggerRealtimeCallable(AbstractWorkerTriggerCallable):
    streaming_trigger: RealtimeTriggerInterface | None = None
    on_error: Consumer[Any] | None = None
    on_next: Consumer[Execution] | None = None

    def do_call(self) -> State.Type:
        raise NotImplementedError  # TODO: translate from Java
