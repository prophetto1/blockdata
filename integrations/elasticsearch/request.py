from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from integrations.opensearch.model.http_method import HttpMethod
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Request(AbstractTask, RunnableTask):
    """Call Elasticsearch endpoint"""
    method: Property[HttpMethod] | None = None
    endpoint: Property[str]
    parameters: Property[dict[String, String]] | None = None
    body: Any | None = None

    def run(self, run_context: RunContext) -> Request:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        status: int | None = None
        response: Any | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    status: int | None = None
    response: Any | None = None
