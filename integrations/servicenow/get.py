from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.servicenow.abstract_service_now import AbstractServiceNow
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractServiceNow, RunnableTask):
    """Fetch records from a ServiceNow table"""
    table: Property[str]

    def run(self, run_context: RunContext) -> Get:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        results: list[Map[String, Object]] | None = None
        size: int | None = None

    @dataclass(slots=True)
    class GetResult:
        result: list[Map[String, Object]] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    results: list[Map[String, Object]] | None = None
    size: int | None = None


@dataclass(slots=True, kw_only=True)
class GetResult:
    result: list[Map[String, Object]] | None = None
