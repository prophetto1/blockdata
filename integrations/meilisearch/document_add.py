from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.meilisearch.abstract_meilisearch_connection import AbstractMeilisearchConnection
from engine.core.models.property.data import Data
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class DocumentAdd(AbstractMeilisearchConnection, RunnableTask, Data):
    """Add documents to Meilisearch"""
    m_a_p_p_e_r: ObjectMapper | None = None
    from: Any
    index: Property[str]

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
