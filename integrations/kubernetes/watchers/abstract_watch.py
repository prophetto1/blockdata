from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\watchers\AbstractWatch.java
# WARNING: Unresolved types: Action, Logger, T, Watcher, WatcherException, client, fabric8, io, kubernetes

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class AbstractWatch(ABC):
    logger: Logger | None = None

    def event_received(self, action: Action, resource: T) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def on_close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def on_close(self, e: WatcherException) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def log_context(self, resource: T) -> str:
        ...
