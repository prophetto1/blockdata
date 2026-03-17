from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.http.client.http_client_response_exception import HttpClientResponseException
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractAirbyteConnection(Task):
    url: Property[str]
    username: Property[str] | None = None
    password: Property[str] | None = None
    token: Property[str] | None = None
    http_timeout: Property[timedelta] | None = None
    options: HttpConfiguration | None = None
    application_credentials: ApplicationCredentials | None = None

    def request(self, run_context: RunContext, request_builder: HttpRequest, response_type: Class[RES]) -> HttpResponse[RES]:
        raise NotImplementedError  # TODO: translate from Java

    def is_already_running_error(self, exception: HttpClientResponseException) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def retrieve_application_credentials_token(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ApplicationCredentials:
        client_id: Property[str]
        client_secret: Property[str]


@dataclass(slots=True, kw_only=True)
class ApplicationCredentials:
    client_id: Property[str]
    client_secret: Property[str]
