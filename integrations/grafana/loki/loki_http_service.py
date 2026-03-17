from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.http.client.http_client import HttpClient
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class LokiHttpService:

    def create_client(self, run_context: RunContext, connect_timeout: Property[int]) -> HttpClient:
        raise NotImplementedError  # TODO: translate from Java

    def build_request(self, run_context: RunContext, uri: str, auth_token: Property[str], tenant_id: Property[str]) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def execute_get_request(self, run_context: RunContext, uri: str, auth_token: Property[str], tenant_id: Property[str], connect_timeout: Property[int]) -> HttpResponse[String]:
        raise NotImplementedError  # TODO: translate from Java

    def execute_post_request(self, run_context: RunContext, uri: str, auth_token: Property[str], tenant_id: Property[str], connect_timeout: Property[int]) -> HttpResponse[String]:
        raise NotImplementedError  # TODO: translate from Java

    def build_base_url(self, run_context: RunContext, url: Property[str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def build_uri(self, endpoint: str, query_params: dict[String, String]) -> str:
        raise NotImplementedError  # TODO: translate from Java
