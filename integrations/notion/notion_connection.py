from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notion\src\main\java\io\kestra\plugin\notion\NotionConnection.java
# WARNING: Unresolved types: Class, Exception, HttpRequestBuilder, IOException, ObjectMapper, T

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class NotionConnection(ABC, Task):
    mapper: ClassVar[ObjectMapper] = JacksonMapper.ofJson(false)
    n_o_t_i_o_n__a_p_i__u_r_l: ClassVar[str] = "https://api.notion.com"
    n_o_t_i_o_n__a_p_i__v_e_r_s_i_o_n: ClassVar[str] = "2022-06-28"
    j_s_o_n__c_o_n_t_e_n_t__t_y_p_e: ClassVar[str] = "application/json; charset=UTF-8"
    p_a_g_e_s__e_n_d_p_o_i_n_t: ClassVar[str] = "/v1/pages"
    b_l_o_c_k_s__e_n_d_p_o_i_n_t: ClassVar[str] = "/v1/blocks"
    s_e_a_r_c_h__e_n_d_p_o_i_n_t: ClassVar[str] = "/v1/search"
    api_token: Property[str] | None = None
    options: HttpConfiguration | None = None

    @staticmethod
    def get_base_url() -> str:
        raise NotImplementedError  # TODO: translate from Java

    def make_call(self, run_context: RunContext, request_builder: HttpRequest.HttpRequestBuilder, response_type: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def get_authorized_request(self, run_context: RunContext, request_builder: HttpRequest.HttpRequestBuilder) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def build_notion_u_r_l(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_create_page_u_r_l(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_page_u_r_l(self, page_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_page_children_u_r_l(self, page_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_block_u_r_l(self, block_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_search_u_r_l(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_get_request(self, run_context: RunContext, url: str) -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def build_post_request(self, run_context: RunContext, url: str, body: Any) -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def build_patch_request(self, run_context: RunContext, url: str, body: Any) -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def build_delete_request(self, run_context: RunContext, url: str) -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def store(self, run_context: RunContext, results: list[dict[str, Any]]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def get_endpoint(self) -> str:
        ...
