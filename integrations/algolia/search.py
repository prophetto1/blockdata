from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-algolia\src\main\java\io\kestra\plugin\algolia\Search.java
# WARNING: Unresolved types: Exception, ObjectNode, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.algolia.abstract_algolia_task import AbstractAlgoliaTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Search(AbstractAlgoliaTask):
    """Query records in an Algolia index"""
    index_name: Property[str]
    params: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        nb_hits: int | None = None
        hits: list[ObjectNode] | None = None
