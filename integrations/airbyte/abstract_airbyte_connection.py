from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\AbstractAirbyteConnection.java
# WARNING: Unresolved types: Class, HttpRequestBuilder, REQ, RES

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.http.client.http_client_response_exception import HttpClientResponseException
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.airbyte.connections.sync_already_running_exception import SyncAlreadyRunningException
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractAirbyteConnection(ABC, Task):
    url: Property[str]
    http_timeout: Property[timedelta] = Property.ofValue(Duration.ofSeconds(10))
    username: Property[str] | None = None
    password: Property[str] | None = None
    token: Property[str] | None = None
    options: HttpConfiguration | None = None
    application_credentials: ApplicationCredentials | None = None

    def request(self, run_context: RunContext, request_builder: HttpRequest.HttpRequestBuilder, response_type: Class[RES]) -> HttpResponse[RES]:
        raise NotImplementedError  # TODO: translate from Java

    def is_already_running_error(self, exception: HttpClientResponseException) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def retrieve_application_credentials_token(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ApplicationCredentials:
        client_id: Property[str]
        client_secret: Property[str]
