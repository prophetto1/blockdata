from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\filters\JsonFilter.java
# WARNING: Unresolved types: EvaluationContext, PebbleException, PebbleTemplate

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.core.runners.pebble.filters.to_json_filter import ToJsonFilter


@dataclass(slots=True, kw_only=True)
class JsonFilter(ToJsonFilter):
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)

    def apply(self, input: Any, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java
