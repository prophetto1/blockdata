from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractTask, RunnableTask):
    """Retrieve Elasticsearch document"""
    index: Property[str]
    key: Property[str]
    doc_version: Property[int] | None = None
    error_on_missing: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Get:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        row: dict[String, Object] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    row: dict[String, Object] | None = None
