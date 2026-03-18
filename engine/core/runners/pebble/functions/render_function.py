from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\RenderFunction.java

from dataclasses import dataclass
from typing import Any

from engine.core.runners.pebble.functions.rendering_function_interface import RenderingFunctionInterface


@dataclass(slots=True, kw_only=True)
class RenderFunction:
    application_context: ApplicationContext | None = None

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def function_name(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
