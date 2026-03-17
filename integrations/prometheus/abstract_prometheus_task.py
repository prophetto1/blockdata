from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-prometheus\src\main\java\io\kestra\plugin\prometheus\AbstractPrometheusTask.java
# WARNING: Unresolved types: Exception, T, core, io, kestra, models, tasks

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractPrometheusTask(ABC, Task):
    username: Property[str] | None = None
    password: Property[str] | None = None
    headers: Property[dict[str, str]] | None = None
    options: HttpConfiguration | None = None

    @abstractmethod
    def build_request(self, run_context: RunContext) -> HttpRequest:
        ...

    @abstractmethod
    def handle_response(self, run_context: RunContext, response: HttpResponse[str]) -> T:
        ...

    def run(self, run_context: RunContext) -> T:
        raise NotImplementedError  # TODO: translate from Java
