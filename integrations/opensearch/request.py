from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-opensearch\src\main\java\io\kestra\plugin\opensearch\Request.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from integrations.elasticsearch.model.http_method import HttpMethod
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Request(AbstractTask):
    """Send raw OpenSearch HTTP request"""
    endpoint: Property[str]
    method: Property[HttpMethod] = Property.ofValue(HttpMethod.GET)
    parameters: Property[dict[str, str]] | None = None
    body: Any | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        status: int | None = None
        response: Any | None = None
