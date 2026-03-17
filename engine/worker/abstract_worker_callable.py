from __future__ import annotations

# Source: E:\KESTRA\worker\src\main\java\io\kestra\worker\AbstractWorkerCallable.java
# WARNING: Unresolved types: ClassLoader, CountDownLatch, Thread

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.runners.run_context import RunContext
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class AbstractWorkerCallable(ABC):
    shutdown_latch: CountDownLatch
    killed: bool = False
    logger: Any | None = None
    run_context: RunContext | None = None
    type: str | None = None
    uid: str | None = None
    exception: BaseException | None = None
    class_loader: ClassLoader | None = None
    current_thread: Thread | None = None

    def kill(self, mark_as_killed: bool | None = None) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def call(self) -> State.Type:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def do_call(self) -> State.Type:
        ...

    @abstractmethod
    def signal_stop(self) -> None:
        ...

    def await_stop(self, timeout: timedelta) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def exception_handler(self, e: BaseException) -> State.Type:
        raise NotImplementedError  # TODO: translate from Java

    def interrupt(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
