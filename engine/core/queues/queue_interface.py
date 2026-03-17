from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\queues\QueueInterface.java

from typing import Any, Callable, Protocol

from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.utils.either import Either
from engine.core.models.pauseable import Pauseable
from engine.core.queues.queue_exception import QueueException


class QueueInterface(Closeable, Pauseable, Protocol):
    def emit(self, consumer_group: str, message: T | None = None) -> None: ...

    def emit_async(self, consumer_group: str, message: T | None = None) -> None: ...

    def emit_only(self, consumer_group: str, message: T | None = None) -> None: ...

    def delete(self, consumer_group: str, message: T | None = None) -> None: ...

    def receive(self, consumer_group: str, queue_type: type[Any] | None = None, consumer: Callable[Either[T, DeserializationException]] | None = None, for_update: bool | None = None) -> Callable: ...
