from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\rooting\TenantAliasingRooter.java
# WARNING: Unresolved types: DefaultRouter, RouteBuilder, UriRouteMatch

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class TenantAliasingRooter(DefaultRouter):
    excluded_routes: ClassVar[list[re.Pattern]]

    def find_closest(self, request: HttpRequest[Any]) -> UriRouteMatch[T, R]:
        raise NotImplementedError  # TODO: translate from Java

    def get_tenant_id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def bypass_rooting(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java
