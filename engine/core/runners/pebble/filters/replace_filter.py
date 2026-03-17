from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\filters\ReplaceFilter.java
# WARNING: Unresolved types: EvaluationContext, Filter, PebbleException, PebbleTemplate

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class ReplaceFilter:
    args: ClassVar[list[str]]
    filter_name: ClassVar[str] = "replace"
    argument_pairs: ClassVar[str] = "replace_pairs"
    argument_regexp: ClassVar[str] = "regexp"

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def apply(self, input: Any, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def process_map(self, input_map: dict[str, Any], replace_pair: dict[Any, Any], regexp: bool) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def process_list(self, input_list: list[Any], replace_pair: dict[Any, Any], regexp: bool) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def process_string(self, input: str, replace_pair: dict[Any, Any], regexp: bool) -> str:
        raise NotImplementedError  # TODO: translate from Java
