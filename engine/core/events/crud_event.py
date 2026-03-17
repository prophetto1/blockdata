from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\events\CrudEvent.java
# WARNING: Unresolved types: T

from dataclasses import dataclass
from typing import Any

from engine.core.events.crud_event_type import CrudEventType
from engine.core.http.http_request import HttpRequest


@dataclass(slots=True, kw_only=True)
class CrudEvent:
    model: T | None = None
    previous_model: T | None = None
    type: CrudEventType | None = None
    request: HttpRequest[Any] | None = None

    @staticmethod
    def create(model: T) -> CrudEvent[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def delete(model: T) -> CrudEvent[T]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(before: T, after: T) -> CrudEvent[T]:
        raise NotImplementedError  # TODO: translate from Java
