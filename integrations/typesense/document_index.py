from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-typesense\src\main\java\io\kestra\plugin\typesense\DocumentIndex.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.typesense.abstract_typesense_task import AbstractTypesenseTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class DocumentIndex(AbstractTypesenseTask):
    """Upsert one document into Typesense"""
    document: Property[dict[str, Any]]

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
