from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\EncryptFunction.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class EncryptFunction:

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java
