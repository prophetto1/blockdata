from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\filters\JqFilter.java
# WARNING: Unresolved types: EvaluationContext, Filter, PebbleException, PebbleTemplate, Scope

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class JqFilter:
    argument_names: list[str] = field(default_factory=list)
    scope: ClassVar[Scope]

    def apply(self, input: Any, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java
