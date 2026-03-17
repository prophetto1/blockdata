from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\filters\EscapeCharFilter.java
# WARNING: Unresolved types: EvaluationContext, Filter, PebbleException, PebbleTemplate

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class EscapeCharFilter:
    arg_name: ClassVar[str] = "type"
    argument_names: list[str] = field(default_factory=list)

    def apply(self, input: Any, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def process_map(self, input_map: dict[str, Any], args: dict[str, Any], self: PebbleTemplate, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def process_list(self, input_list: list[Any], args: dict[str, Any], self: PebbleTemplate, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def escape_string(self, input: str, args: dict[str, Any], self: PebbleTemplate, line_number: int) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def args_to_type(self, args: dict[str, Any], self: PebbleTemplate, line_number: int) -> FilterType:
        raise NotImplementedError  # TODO: translate from Java

    def escape(self, input: str, original: str, replacement: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    class FilterType(str, Enum):
        SINGLE = "SINGLE"
        DOUBLE = "DOUBLE"
        SHELL = "SHELL"
