from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\storage\FilterItems.java
# WARNING: Unresolved types: BufferedReader, ThrowingFunction

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class FilterItems(Task):
    """Filter line-oriented files with a Pebble expression."""
    from: Property[str]
    filter_condition: str
    filter_type: Property[FilterType]
    error_or_null_behavior: Property[ErrorOrNullBehavior]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_expression_predication(self, run_context: RunContext) -> PebbleExpressionPredicate:
        raise NotImplementedError  # TODO: translate from Java

    def new_buffered_reader(self, run_context: RunContext, object_uri: str) -> BufferedReader:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        processed_items_total: int | None = None
        dropped_items_total: int | None = None

    @dataclass(slots=True)
    class PebbleExpressionPredicate:
        mapper: ClassVar[ObjectMapper]
        run_context: RunContext | None = None
        expression: str | None = None

        def apply(self, data: str) -> bool:
            raise NotImplementedError  # TODO: translate from Java

        def extract(self, json_node: JsonNode) -> str:
            raise NotImplementedError  # TODO: translate from Java

    class FilterType(str, Enum):
        INCLUDE = "INCLUDE"
        EXCLUDE = "EXCLUDE"

    class ErrorOrNullBehavior(str, Enum):
        FAIL = "FAIL"
        INCLUDE = "INCLUDE"
        EXCLUDE = "EXCLUDE"
