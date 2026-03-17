from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\filters\NindentFilter.java
# WARNING: Unresolved types: EvaluationContext, Filter, PebbleException, PebbleTemplate

from dataclasses import dataclass
from typing import Any

from engine.core.runners.pebble.abstract_indent import AbstractIndent


@dataclass(slots=True, kw_only=True)
class NindentFilter(AbstractIndent):

    def apply(self, input: Any, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java
