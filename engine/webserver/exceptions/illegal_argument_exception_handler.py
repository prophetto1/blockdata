from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\exceptions\IllegalArgumentExceptionHandler.java
# WARNING: Unresolved types: ExceptionHandler

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class IllegalArgumentExceptionHandler:

    def handle(self, request: HttpRequest, exception: ValueError) -> HttpResponse:
        raise NotImplementedError  # TODO: translate from Java
