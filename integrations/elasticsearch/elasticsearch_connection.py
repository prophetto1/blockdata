from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-elasticsearch\src\main\java\io\kestra\plugin\elasticsearch\ElasticsearchConnection.java
# WARNING: Unresolved types: BasicCredentialsProvider, ElasticsearchClient, Header, HttpHost, Rest5Client

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class ElasticsearchConnection:
    hosts: list[str]
    d_e_f_a_u_l_t__t_a_r_g_e_t__s_e_r_v_e_r__v_e_r_s_i_o_n: ClassVar[int] = 8
    m_a_x__s_u_p_p_o_r_t_e_d__t_a_r_g_e_t__s_e_r_v_e_r__v_e_r_s_i_o_n: ClassVar[int] = 9
    a_c_c_e_p_t__h_e_a_d_e_r: ClassVar[str] = "Accept"
    c_o_n_t_e_n_t__t_y_p_e__h_e_a_d_e_r: ClassVar[str] = "Content-Type"
    c_o_m_p_a_t_i_b_l_e__m_e_d_i_a__t_y_p_e: ClassVar[str] = "application/vnd.elasticsearch+json; compatible-with=%d"
    target_server_version: Property[int] = Property.ofValue(DEFAULT_TARGET_SERVER_VERSION)
    basic_auth: BasicAuth | None = None
    headers: Property[list[str]] | None = None
    path_prefix: Property[str] | None = None
    strict_deprecation_mode: Property[bool] | None = None
    trust_all_ssl: Property[bool] | None = None

    def client(self, run_context: RunContext) -> Rest5Client:
        raise NotImplementedError  # TODO: translate from Java

    def credentials_provider(self, run_context: RunContext, default_headers: list[Header]) -> BasicCredentialsProvider:
        raise NotImplementedError  # TODO: translate from Java

    def has_authorization_header(self, default_headers: list[Header]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def high_level_client(self, run_context: RunContext) -> ElasticsearchClient:
        raise NotImplementedError  # TODO: translate from Java

    def http_hosts(self, run_context: RunContext) -> list[HttpHost]:
        raise NotImplementedError  # TODO: translate from Java

    def default_headers(self, run_context: RunContext) -> list[Header]:
        raise NotImplementedError  # TODO: translate from Java

    def compatible_media_type(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class BasicAuth:
        username: Property[str] | None = None
        password: Property[str] | None = None
