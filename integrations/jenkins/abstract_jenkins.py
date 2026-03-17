from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractJenkins(Task):
    m_a_p_p_e_r: ObjectMapper | None = None
    server_url: Property[str]
    username: Property[str] | None = None
    api_token: Property[str] | None = None
    options: HttpConfiguration | None = None

    def request(self, run_context: RunContext, request_builder: HttpRequest, response_type: Class[RES]) -> HttpResponse[RES]:
        raise NotImplementedError  # TODO: translate from Java

    def configure_authentication(self) -> HttpConfiguration:
        raise NotImplementedError  # TODO: translate from Java
