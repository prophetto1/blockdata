from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\storage\DeduplicateItems.java
# WARNING: Unresolved types: BufferedReader, ThrowingFunction

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class DeduplicateItems(Task):
    """Deduplicate a line-oriented file by key."""
    from: Property[str]
    expr: str

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_key_extractor(self, run_context: RunContext) -> PebbleFieldExtractor:
        raise NotImplementedError  # TODO: translate from Java

    def new_buffered_reader(self, run_context: RunContext, object_uri: str) -> BufferedReader:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        num_keys: int | None = None
        processed_items_total: int | None = None
        dropped_items_total: int | None = None

    @dataclass(slots=True)
    class PebbleFieldExtractor:
        mapper: ClassVar[ObjectMapper]
        run_context: RunContext | None = None
        expression: str | None = None

        def apply(self, data: str) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def extract(self, item: dict[str, Any]) -> str:
            raise NotImplementedError  # TODO: translate from Java
