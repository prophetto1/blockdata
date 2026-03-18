from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\ApifyConnection.java
# WARNING: Unresolved types: Class, CompletableFuture, Consumer, Exception, HttpRequestBuilder, InputStream, ObjectMapper, T

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.apify.apify_connection_interface import ApifyConnectionInterface
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class ApifyConnection(ABC, Task):
    """Make authenticated Apify API calls"""
    api_token: Property[str]
    mapper: ClassVar[ObjectMapper] = JacksonMapper.ofJson(false)
    a_p_i_f_y__a_p_i__u_r_l: ClassVar[str] = "https://api.apify.com/v2"
    j_s_o_n__c_o_n_t_e_n_t__t_y_p_e: ClassVar[str] = "application/json; charset=UTF-8"
    i_n_t_e_g_r_a_t_i_o_n__v_a_l_u_e: ClassVar[str] = "kestra"
    i_n_t_e_g_r_a_t_i_o_n__h_e_a_d_e_r: ClassVar[str] = "x-apify-integration-platform"
    options: HttpConfiguration | None = None

    @staticmethod
    def get_base_url() -> str:
        raise NotImplementedError  # TODO: translate from Java

    def add_query_params(self, base_path: str, query_params: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def make_call(self, run_context: RunContext, request_builder: HttpRequest.HttpRequestBuilder, response_type: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def make_call_and_write_to_file(self, run_context: RunContext, request_builder: HttpRequest.HttpRequestBuilder) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_write_http_response_to_temp_file_consumer(run_context: RunContext, completable_future: CompletableFuture[str]) -> Consumer[HttpResponse[InputStream]]:
        raise NotImplementedError  # TODO: translate from Java

    def build_get_request(self, url: str) -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def build_post_request(self, url: str, body: Any) -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def build_patch_request(self, url: str, body: Any) -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def build_delete_request(self, url: str) -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_base_http_request_builder() -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def add_authorization_header(self, run_context: RunContext, request_builder: HttpRequest.HttpRequestBuilder) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def encode_value(self, value: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
