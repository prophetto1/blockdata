from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Write(AbstractTask, RunnableTask):
    """Write line protocol to InfluxDB"""
    source: Property[str]
    precision: Property[WritePrecision] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        record_count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    record_count: int | None = None
