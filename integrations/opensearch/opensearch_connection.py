from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-opensearch\src\main\java\io\kestra\plugin\opensearch\OpensearchConnection.java
# WARNING: Unresolved types: Header, HttpAsyncClientBuilder, HttpHost, ObjectMapper, RestClientTransport

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class OpensearchConnection:
    hosts: Property[list[str]]
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson(false)
    basic_auth: BasicAuth | None = None
    headers: Property[list[str]] | None = None
    path_prefix: Property[str] | None = None
    strict_deprecation_mode: Property[bool] | None = None
    trust_all_ssl: Property[bool] | None = None

    def client(self, run_context: RunContext) -> RestClientTransport:
        raise NotImplementedError  # TODO: translate from Java

    def http_async_client_builder(self, run_context: RunContext) -> HttpAsyncClientBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def http_hosts(self, run_context: RunContext) -> list[HttpHost]:
        raise NotImplementedError  # TODO: translate from Java

    def default_headers(self, run_context: RunContext) -> list[Header]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class BasicAuth:
        username: Property[str] | None = None
        password: Property[str] | None = None
