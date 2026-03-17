from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.http.client.http_client import HttpClient
from engine.core.http.http_request import HttpRequest
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractGitLabTask(Task):
    url: Property[str] | None = None
    token: Property[str]
    project_id: Property[str]
    api_path: Property[str] | None = None

    def http_client(self, run_context: RunContext) -> HttpClient:
        raise NotImplementedError  # TODO: translate from Java

    def authenticated_request_builder(self, endpoint: str, run_context: RunContext) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def build_api_endpoint(self, resource: str, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
