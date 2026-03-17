from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class AmqpExceptionHandler(StrictExceptionHandler):
    logger: Logger | None = None

    def log(self, message: str, e: Throwable) -> None:
        raise NotImplementedError  # TODO: translate from Java
