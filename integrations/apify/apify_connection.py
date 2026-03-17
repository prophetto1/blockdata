from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.apify.apify_connection_interface import ApifyConnectionInterface
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class ApifyConnection(Task, ApifyConnectionInterface):
    """Make authenticated Apify API calls"""
    mapper: ObjectMapper | None = None
    a_p_i_f_y__a_p_i__u_r_l: str | None = None
    j_s_o_n__c_o_n_t_e_n_t__t_y_p_e: str | None = None
    i_n_t_e_g_r_a_t_i_o_n__v_a_l_u_e: str | None = None
    i_n_t_e_g_r_a_t_i_o_n__h_e_a_d_e_r: str | None = None
    api_token: Property[str]
    options: HttpConfiguration | None = None

    def get_base_url(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def add_query_params(self, base_path: str, query_params: dict[String, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def make_call(self, run_context: RunContext, request_builder: HttpRequest, response_type: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def make_call_and_write_to_file(self, run_context: RunContext, request_builder: HttpRequest) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_write_http_response_to_temp_file_consumer(self, run_context: RunContext, completable_future: CompletableFuture[URI]) -> Consumer[HttpResponse[InputStream]]:
        raise NotImplementedError  # TODO: translate from Java

    def build_get_request(self, url: str) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def build_post_request(self, url: str, body: Any) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def build_patch_request(self, url: str, body: Any) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def build_delete_request(self, url: str) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def get_base_http_request_builder(self) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def add_authorization_header(self, run_context: RunContext, request_builder: HttpRequest) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def encode_value(self, value: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
