from __future__ import annotations

# Source: E:\KESTRA\worker\src\main\java\io\kestra\worker\WorkerSecurityService.java

from dataclasses import dataclass
from typing import Any, Callable

from engine.worker.abstract_worker_callable import AbstractWorkerCallable
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class WorkerSecurityService:

    def call_in_security_context(self, callable: AbstractWorkerCallable) -> State.Type:
        raise NotImplementedError  # TODO: translate from Java
