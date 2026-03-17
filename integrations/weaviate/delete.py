from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-weaviate\src\main\java\io\kestra\plugin\weaviate\Delete.java
# WARNING: Unresolved types: Exception, Logger, WhereFilter, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.weaviate.weaviate_connection import WeaviateConnection


@dataclass(slots=True, kw_only=True)
class Delete(WeaviateConnection):
    """Delete objects from a Weaviate class"""
    class_name: str
    logger: Logger = LoggerFactory.getLogger(Delete.class)
    object_id: str | None = None
    filter: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> Delete.Output:
        raise NotImplementedError  # TODO: translate from Java

    def to_where_filter(self, path: str, value: Any) -> WhereFilter:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        class_name: str | None = None
        success: bool | None = None
        deleted_count: int | None = None
        ids: list[str] | None = None
