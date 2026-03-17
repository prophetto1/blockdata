from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-grafana\src\main\java\io\kestra\plugin\grafana\loki\LokiHttpService.java
# WARNING: Unresolved types: Exception, HttpRequestBuilder

from dataclasses import dataclass
from typing import Any

from engine.core.http.client.http_client import HttpClient
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class LokiHttpService:

    @staticmethod
    def create_client(run_context: RunContext, connect_timeout: Property[int]) -> HttpClient:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_request(run_context: RunContext, uri: str, auth_token: Property[str], tenant_id: Property[str]) -> HttpRequest.HttpRequestBuilder:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def execute_get_request(run_context: RunContext, uri: str, auth_token: Property[str], tenant_id: Property[str], connect_timeout: Property[int]) -> HttpResponse[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def execute_post_request(run_context: RunContext, uri: str, auth_token: Property[str], tenant_id: Property[str], connect_timeout: Property[int]) -> HttpResponse[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_base_url(run_context: RunContext, url: Property[str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_uri(endpoint: str, query_params: dict[str, str]) -> str:
        raise NotImplementedError  # TODO: translate from Java
