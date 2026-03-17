from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\tests\JsonTest.java
# WARNING: Unresolved types: EvaluationContext, PebbleException, PebbleTemplate, Test

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class JsonTest:

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def apply(self, input: Any, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> bool:
        raise NotImplementedError  # TODO: translate from Java
