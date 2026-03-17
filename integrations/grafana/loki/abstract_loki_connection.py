from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


class Direction(str, Enum):
    FORWARD = "FORWARD"
    BACKWARD = "BACKWARD"


@dataclass(slots=True, kw_only=True)
class AbstractLokiConnection(Task):
    url: Property[str]
    auth_token: Property[str] | None = None
    tenant_id: Property[str] | None = None
    connect_timeout: Property[int] | None = None
    read_timeout: Property[int] | None = None
    query: Property[str]
    limit: Property[int] | None = None
    direction: Property[Direction] | None = None

    def execute_get_req(self, run_context: RunContext, uri: str) -> HttpResponse[String]:
        raise NotImplementedError  # TODO: translate from Java

    def build_base_url(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_uri(self, endpoint: str, query_params: dict[String, String]) -> str:
        raise NotImplementedError  # TODO: translate from Java
