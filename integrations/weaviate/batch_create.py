from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-weaviate\src\main\java\io\kestra\plugin\weaviate\BatchCreate.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput
from integrations.weaviate.weaviate_connection import WeaviateConnection


@dataclass(slots=True, kw_only=True)
class BatchCreate(WeaviateConnection):
    """Batch insert Weaviate objects"""
    objects: Any
    class_name: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
