from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hubspot\src\main\java\io\kestra\plugin\hubspot\HubspotConnection.java
# WARNING: Unresolved types: Class, Exception, HttpRequestBuilder, IOException, ObjectMapper, RuntimeException, T

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.http.client.http_client_response_exception import HttpClientResponseException
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class HubspotConnection(ABC, Task):
    mapper: ClassVar[ObjectMapper] = JacksonMapper.ofJson(false)
    h_u_b_s_p_o_t__u_r_l: ClassVar[str] = "https://api.hubapi.com"
    j_s_o_n__c_o_n_t_e_n_t__t_y_p_e: ClassVar[str] = "application/json; charset=UTF-8"
    api_key: Property[str] | None = None
    oauth_token: Property[str] | None = None
    options: HttpConfiguration | None = None

    def make_call(self, run_context: RunContext, request_builder: HttpRequest.HttpRequestBuilder, response_type: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def clean_hubspot_exception(self, e: HttpClientResponseException) -> RuntimeException:
        raise NotImplementedError  # TODO: translate from Java

    def get_authorized_request(self, run_context: RunContext, request_builder: HttpRequest.HttpRequestBuilder) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def build_hubspot_u_r_l(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def store(self, run_context: RunContext, results: list[dict[str, Any]]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def get_endpoint(self) -> str:
        ...

    @dataclass(slots=True)
    class HubspotErrorResponse:
        status: str | None = None
        message: str | None = None
        errors: list[HubspotErrorDetail] | None = None

    @dataclass(slots=True)
    class HubspotErrorDetail:
        message: str | None = None
        code: str | None = None
