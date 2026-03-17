from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\apache\AbstractLoggingInterceptor.java
# WARNING: Unresolved types: Header, HttpEntityContainer, IOException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class AbstractLoggingInterceptor(ABC):

    @staticmethod
    def build_headers_entry(type: str, headers: list[Header]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_entity_entry(type: str, http_entity_container: HttpEntityContainer) -> str:
        raise NotImplementedError  # TODO: translate from Java
