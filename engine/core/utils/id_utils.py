from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\IdUtils.java
# WARNING: Unresolved types: HashFunction

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class IdUtils(ABC):
    hash_function: ClassVar[HashFunction]
    id_separator: ClassVar[str] = '_'

    @staticmethod
    def create() -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from(from: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_parts() -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_parts_and_separator(separator: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
