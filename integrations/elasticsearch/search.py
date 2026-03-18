from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-elasticsearch\src\main\java\io\kestra\plugin\elasticsearch\Search.java
# WARNING: Unresolved types: Exception, IOException, Pair, SearchResponse, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.elasticsearch.abstract_search import AbstractSearch
from engine.core.models.tasks.common.fetch_type import FetchType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Search(AbstractSearch):
    """Execute Elasticsearch search request"""
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.FETCH)

    def run(self, run_context: RunContext) -> Search.Output:
        raise NotImplementedError  # TODO: translate from Java

    def store(self, run_context: RunContext, search_response: SearchResponse[dict]) -> Pair[str, int]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch(self, search_response: SearchResponse[dict]) -> Pair[list[dict[str, Any]], int]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_one(self, search_response: SearchResponse[dict]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        size: int | None = None
        total: int | None = None
        rows: list[dict[str, Any]] | None = None
        row: dict[str, Any] | None = None
        uri: str | None = None
