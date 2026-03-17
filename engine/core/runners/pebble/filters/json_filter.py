from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\filters\JsonFilter.java
# WARNING: Unresolved types: EvaluationContext, PebbleException, PebbleTemplate

from dataclasses import dataclass
from typing import Any

from engine.core.runners.pebble.filters.to_json_filter import ToJsonFilter


@dataclass(slots=True, kw_only=True)
class JsonFilter(ToJsonFilter):

    def apply(self, input: Any, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java
