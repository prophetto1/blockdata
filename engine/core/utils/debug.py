from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Debug.java
# WARNING: Unresolved types: JavaTimeModule

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class Debug:
    name: ClassVar[str]
    logger: ClassVar[Any]
    mapper: ObjectMapper

    @staticmethod
    def caller() -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_json(arg: T) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log() -> None:
        raise NotImplementedError  # TODO: translate from Java
