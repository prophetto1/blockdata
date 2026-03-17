from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\filters\DateAddFilter.java
# WARNING: Unresolved types: EvaluationContext, Filter, PebbleException, PebbleTemplate

from dataclasses import dataclass
from typing import Any

from engine.core.runners.pebble.abstract_date import AbstractDate


@dataclass(slots=True, kw_only=True)
class DateAddFilter(AbstractDate):

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def apply(self, input: Any, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_as_long(value: Any, line_number: int, self: PebbleTemplate) -> int:
        raise NotImplementedError  # TODO: translate from Java
