from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\filters\SubstringBeforeLastFilter.java

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class SubstringBeforeLastFilter:
    argument_names: list[str] = field(default_factory=list)

    def apply(self, input: Any, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java
