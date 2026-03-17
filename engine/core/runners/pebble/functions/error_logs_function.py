from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\ErrorLogsFunction.java
# WARNING: Unresolved types: EvaluationContext, Function, PebbleTemplate

from dataclasses import dataclass
from typing import Any

from engine.core.services.execution_log_service import ExecutionLogService
from engine.core.runners.pebble.pebble_utils import PebbleUtils


@dataclass(slots=True, kw_only=True)
class ErrorLogsFunction:
    log_service: ExecutionLogService | None = None
    pebble_utils: PebbleUtils | None = None

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java
