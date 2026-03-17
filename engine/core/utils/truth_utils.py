from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\TruthUtils.java

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class TruthUtils(ABC):
    false_values: ClassVar[list[str]]

    @staticmethod
    def is_truthy(condition: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_falsy(condition: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java
