from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-meilisearch\src\main\java\io\kestra\plugin\meilisearch\FacetSearch.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.meilisearch.abstract_meilisearch_connection import AbstractMeilisearchConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class FacetSearch(AbstractMeilisearchConnection):
    """Search facets in Meilisearch"""
    index: Property[str]
    facet_name: Property[str]
    filters: Property[list[str]] = Property.ofValue(new ArrayList<>())
    facet_query: Property[str] | None = None

    def run(self, run_context: RunContext) -> FacetSearch.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        total_hits: int | None = None
