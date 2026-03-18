from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\JsonFunction.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.core.runners.pebble.functions.from_json_function import FromJsonFunction


@dataclass(slots=True, kw_only=True)
class JsonFunction(FromJsonFunction):
    logger: ClassVar[Logger] = getLogger(__name__)

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java
