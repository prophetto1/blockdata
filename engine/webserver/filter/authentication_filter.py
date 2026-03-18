from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\filter\AuthenticationFilter.java
# WARNING: Unresolved types: HttpServerFilter, MutableHttpResponse, Publisher, ServerFilterChain

from dataclasses import dataclass, field
from typing import Any, ClassVar, Optional

from engine.webserver.services.basic_auth_service import BasicAuthService


@dataclass(slots=True, kw_only=True)
class AuthenticationFilter:
    order: ClassVar[int]
    prefix: ClassVar[str] = "Basic"
    basic_auth_cookie_name: ClassVar[str] = "BASIC_AUTH"
    basic_auth_service: BasicAuthService | None = None

    def do_filter(self, request: HttpRequest[Any], chain: ServerFilterChain) -> Publisher[MutableHttpResponse[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def from_cookie(self, request: HttpRequest[Any]) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def from_authorization_header(self, request: HttpRequest[Any]) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def is_management_endpoint(self, request: HttpRequest[Any]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class BasicAuth:
        username: str | None = None
        password: str | None = None

        @staticmethod
        def from(authentication: str) -> BasicAuth:
            raise NotImplementedError  # TODO: translate from Java
