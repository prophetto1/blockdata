from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.algolia.abstract_algolia_task import AbstractAlgoliaTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Index(AbstractAlgoliaTask, RunnableTask):
    """Index or replace Algolia records"""
    index_name: Property[str]
    objects: Property[list[Map[String, Object]]]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        result: dict[String, Object] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    result: dict[String, Object] | None = None
