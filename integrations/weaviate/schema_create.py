from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-weaviate\src\main\java\io\kestra\plugin\weaviate\SchemaCreate.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, property, tasks

from dataclasses import dataclass
from typing import Any

from integrations.aws.eventbridge.model.entry import Entry
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.weaviate.weaviate_connection import WeaviateConnection


@dataclass(slots=True, kw_only=True)
class SchemaCreate(WeaviateConnection):
    """Create a Weaviate class schema"""
    class_name: str
    fields: io.kestra.core.models.property.Property[dict[str, list[str]]] | None = None

    def run(self, run_context: RunContext) -> SchemaCreate.Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_property(entry: Map.Entry[str, list[str]]) -> Property:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        success: bool | None = None
