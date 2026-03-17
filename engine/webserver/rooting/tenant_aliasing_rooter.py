from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\rooting\TenantAliasingRooter.java
# WARNING: Unresolved types: DefaultRouter, Pattern, R, RouteBuilder, T, UriRouteMatch

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.http.http_request import HttpRequest


@dataclass(slots=True, kw_only=True)
class TenantAliasingRooter(DefaultRouter):
    excluded_routes: ClassVar[list[Pattern]]

    def find_closest(self, request: HttpRequest[Any]) -> UriRouteMatch[T, R]:
        raise NotImplementedError  # TODO: translate from Java

    def get_tenant_id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def bypass_rooting(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java
