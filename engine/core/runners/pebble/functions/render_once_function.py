from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\RenderOnceFunction.java
# WARNING: Unresolved types: EvaluationContext, PebbleTemplate

from dataclasses import dataclass
from typing import Any

from engine.core.runners.pebble.functions.render_function import RenderFunction


@dataclass(slots=True, kw_only=True)
class RenderOnceFunction(RenderFunction):

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def function_name(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
