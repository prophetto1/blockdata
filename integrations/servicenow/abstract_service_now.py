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
class AbstractServiceNow(Task):
    m_a_p_p_e_r: ObjectMapper | None = None
    domain: Property[str]
    username: Property[str]
    password: Property[str]
    client_id: Property[str] | None = None
    client_secret: Property[str] | None = None
    headers: Property[dict[CharSequence, CharSequence]] | None = None
    options: HttpConfiguration | None = None
    token: str | None = None
    uri: str | None = None

    def base_uri(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def token(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def request(self, run_context: RunContext, request_builder: HttpRequest, response_type: Class[RES]) -> HttpResponse[RES]:
        raise NotImplementedError  # TODO: translate from Java
