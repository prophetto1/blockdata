from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meilisearch\src\main\java\io\kestra\plugin\meilisearch\DocumentAdd.java
# WARNING: Unresolved types: Exception, From, ObjectMapper

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.meilisearch.abstract_meilisearch_connection import AbstractMeilisearchConnection
from integrations.datagen.data import Data
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class DocumentAdd(AbstractMeilisearchConnection):
    """Add documents to Meilisearch"""
    from: Any
    index: Property[str]
    m_a_p_p_e_r: ClassVar[ObjectMapper] = new ObjectMapper()

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
