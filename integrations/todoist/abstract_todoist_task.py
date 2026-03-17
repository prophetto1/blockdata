from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTodoistTask(Task):
    api_token: Property[str]
    b_a_s_e__u_r_l: str | None = None

    def create_request_builder(self, token: str, url: str) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def send_request(self, run_context: RunContext, request: HttpRequest) -> HttpResponse[String]:
        raise NotImplementedError  # TODO: translate from Java
