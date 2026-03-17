from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\filter\AuthenticationFilter.java
# WARNING: Unresolved types: HttpServerFilter, MutableHttpResponse, Publisher, ServerFilterChain

from dataclasses import dataclass, field
from typing import Any, ClassVar, Optional

from engine.webserver.services.basic_auth_service import BasicAuthService
from engine.core.http.http_request import HttpRequest


@dataclass(slots=True, kw_only=True)
class AuthenticationFilter:
    p_r_e_f_i_x: ClassVar[str] = "Basic"
    o_r_d_e_r: ClassVar[int] = ServerFilterPhase.SECURITY.order()
    b_a_s_i_c__a_u_t_h__c_o_o_k_i_e__n_a_m_e: ClassVar[str] = "BASIC_AUTH"
    basic_auth_service: BasicAuthService | None = None

    def get_order(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

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
