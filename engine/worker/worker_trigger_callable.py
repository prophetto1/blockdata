from __future__ import annotations

# Source: E:\KESTRA\worker\src\main\java\io\kestra\worker\WorkerTriggerCallable.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from engine.worker.abstract_worker_trigger_callable import AbstractWorkerTriggerCallable
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type
from engine.core.runners.worker_trigger import WorkerTrigger


@dataclass(slots=True, kw_only=True)
class WorkerTriggerCallable(AbstractWorkerTriggerCallable):
    polling_trigger: PollingTriggerInterface | None = None
    evaluate: Optional[Execution] | None = None

    def do_call(self) -> State.Type:
        raise NotImplementedError  # TODO: translate from Java
