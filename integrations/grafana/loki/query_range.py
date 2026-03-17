from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.grafana.loki.abstract_loki_connection import AbstractLokiConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class QueryRange(AbstractLokiConnection, RunnableTask):
    """Run range LogQL query in Loki"""
    start: Property[str] | None = None
    end: Property[str] | None = None
    step: Property[str] | None = None
    since: Property[str] | None = None
    interval: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        logs: list[Map[String, Object]] | None = None
        result_type: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    logs: list[Map[String, Object]] | None = None
    result_type: str | None = None
