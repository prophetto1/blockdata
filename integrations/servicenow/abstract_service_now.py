from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-servicenow\src\main\java\io\kestra\plugin\servicenow\AbstractServiceNow.java
# WARNING: Unresolved types: CharSequence, Class, HttpRequestBuilder, JavaTimeModule, ObjectMapper, RES

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractServiceNow(ABC, Task):
    domain: Property[str]
    username: Property[str]
    password: Property[str]
    m_a_p_p_e_r: ClassVar[ObjectMapper] = new ObjectMapper()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
        .registerModule(new JavaTimeModule())
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

    def request(self, run_context: RunContext, request_builder: HttpRequest.HttpRequestBuilder, response_type: Class[RES]) -> HttpResponse[RES]:
        raise NotImplementedError  # TODO: translate from Java
