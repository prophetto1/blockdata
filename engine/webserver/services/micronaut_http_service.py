from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\MicronautHttpService.java
# WARNING: Unresolved types: micronaut

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class MicronautHttpService(ABC):

    @staticmethod
    def from(request: io.micronaut.http.HttpRequest[Any]) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to(response: HttpResponse[T]) -> io.micronaut.http.HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java
