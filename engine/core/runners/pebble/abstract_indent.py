from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\AbstractIndent.java
# WARNING: Unresolved types: EvaluationContext, PebbleException, PebbleTemplate

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class AbstractIndent(ABC):

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def prefix(args: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_line_separator(input: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def abstract_apply(self, input: Any, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int, indent_type: str) -> Any:
        raise NotImplementedError  # TODO: translate from Java
