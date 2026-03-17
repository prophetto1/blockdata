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
class AbstractFivetranConnection(Task):
    m_a_p_p_e_r: ObjectMapper | None = None
    api_key: Property[str]
    api_secret: Property[str]
    base_url: Property[str]
    options: HttpConfiguration | None = None

    def request(self, run_context: RunContext, request_builder: HttpRequest, response_type: Class[RES]) -> HttpResponse[RES]:
        raise NotImplementedError  # TODO: translate from Java
