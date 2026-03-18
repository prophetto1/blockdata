from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\exceptions\IllegalStateExceptionHandler.java
# WARNING: Unresolved types: ExceptionHandler

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class IllegalStateExceptionHandler:

    def handle(self, request: HttpRequest, exception: RuntimeError) -> HttpResponse:
        raise NotImplementedError  # TODO: translate from Java
