from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-amqp\src\main\java\io\kestra\plugin\amqp\AmqpExceptionHandler.java
# WARNING: Unresolved types: Logger, StrictExceptionHandler, Throwable

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class AmqpExceptionHandler(StrictExceptionHandler):
    logger: Logger | None = None

    def log(self, message: str, e: Throwable) -> None:
        raise NotImplementedError  # TODO: translate from Java
