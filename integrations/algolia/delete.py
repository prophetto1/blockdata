from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-algolia\src\main\java\io\kestra\plugin\algolia\Delete.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.algolia.abstract_algolia_task import AbstractAlgoliaTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractAlgoliaTask):
    """Delete Algolia records by ID"""
    index_name: Property[str]
    object_ids: Property[list[str]]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        object_ids: list[str] | None = None
