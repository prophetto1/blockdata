from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\rooting\TenantAliasingRooter.java
# WARNING: Unresolved types: DefaultRouter, Pattern, R, RouteBuilder, T, UriRouteMatch

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.http.http_request import HttpRequest


@dataclass(slots=True, kw_only=True)
class TenantAliasingRooter(DefaultRouter):
    e_x_c_l_u_d_e_d__r_o_u_t_e_s: ClassVar[list[Pattern]] = List.of(
        Pattern.compile("/api/v1/main/.*"),
        Pattern.compile("/api/v1/configs")
    )

    def find_closest(self, request: HttpRequest[Any]) -> UriRouteMatch[T, R]:
        raise NotImplementedError  # TODO: translate from Java

    def get_tenant_id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def bypass_rooting(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java
