from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class AbstractWatch(io):
    logger: Logger | None = None

    def event_received(self, action: Action, resource: T) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def on_close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def on_close(self, e: WatcherException) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def log_context(self, resource: T) -> str:
        raise NotImplementedError  # TODO: translate from Java
