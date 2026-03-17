from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\endpoints\BasicAuthEndpointsFilter.java
# WARNING: Unresolved types: HttpServerFilter, MutableHttpResponse, Publisher, ServerFilterChain

from dataclasses import dataclass
from typing import Any

from engine.core.endpoints.endpoint_basic_auth_configuration import EndpointBasicAuthConfiguration
from engine.core.http.http_request import HttpRequest


@dataclass(slots=True, kw_only=True)
class BasicAuthEndpointsFilter:
    endpoint_basic_auth_configuration: EndpointBasicAuthConfiguration | None = None

    def do_filter(self, request: HttpRequest[Any], chain: ServerFilterChain) -> Publisher[MutableHttpResponse[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def validate_user(self, request: HttpRequest[Any]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_order(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
