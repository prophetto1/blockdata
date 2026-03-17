from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\exceptions\IllegalStateExceptionHandler.java
# WARNING: Unresolved types: ExceptionHandler, IllegalStateException

from dataclasses import dataclass
from typing import Any

from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse


@dataclass(slots=True, kw_only=True)
class IllegalStateExceptionHandler:

    def handle(self, request: HttpRequest, exception: IllegalStateException) -> HttpResponse:
        raise NotImplementedError  # TODO: translate from Java
