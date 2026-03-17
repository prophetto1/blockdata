from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\JsonFunction.java
# WARNING: Unresolved types: EvaluationContext, PebbleTemplate

from dataclasses import dataclass
from typing import Any

from engine.core.runners.pebble.functions.from_json_function import FromJsonFunction


@dataclass(slots=True, kw_only=True)
class JsonFunction(FromJsonFunction):

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java
