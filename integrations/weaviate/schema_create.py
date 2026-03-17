from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.weaviate.weaviate_connection import WeaviateConnection


@dataclass(slots=True, kw_only=True)
class SchemaCreate(WeaviateConnection, RunnableTask):
    """Create a Weaviate class schema"""
    class_name: str | None = None
    fields: io | None = None

    def run(self, run_context: RunContext) -> SchemaCreate:
        raise NotImplementedError  # TODO: translate from Java

    def build_property(self, entry: dict) -> Property:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        success: bool | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    success: bool | None = None
