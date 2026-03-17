from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\IDFunction.java
# WARNING: Unresolved types: EvaluationContext, Function, PebbleTemplate

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class IDFunction:

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java
