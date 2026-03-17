from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.algolia.abstract_algolia_task import AbstractAlgoliaTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractAlgoliaTask, RunnableTask):
    """Delete Algolia records by ID"""
    index_name: Property[str]
    object_ids: Property[list[String]]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        object_ids: list[String] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    object_ids: list[String] | None = None
