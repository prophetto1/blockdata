from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\NowFunction.java

from dataclasses import dataclass
from typing import Any

from engine.core.runners.pebble.abstract_date import AbstractDate


@dataclass(slots=True, kw_only=True)
class NowFunction(AbstractDate):

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java
