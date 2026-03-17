from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractPrometheusTask(Task, RunnableTask):
    username: Property[str] | None = None
    password: Property[str] | None = None
    headers: Property[dict[String, String]] | None = None
    options: HttpConfiguration | None = None

    def build_request(self, run_context: RunContext) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def handle_response(self, run_context: RunContext, response: HttpResponse[String]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> T:
        raise NotImplementedError  # TODO: translate from Java
