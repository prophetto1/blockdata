from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\MicronautHttpService.java
# WARNING: Unresolved types: T, http, io, micronaut

from dataclasses import dataclass
from typing import Any

from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse


@dataclass(slots=True, kw_only=True)
class MicronautHttpService:

    @staticmethod
    def from(request: io.micronaut.http.HttpRequest[Any]) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to(response: HttpResponse[T]) -> io.micronaut.http.HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java
