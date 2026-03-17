from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\tenants\TenantValidationFilter.java
# WARNING: Unresolved types: Ordered

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class TenantValidationFilter:
    tenant_path_attributes: ClassVar[str] = "tenant"

    def filter_request(self, request: HttpRequest[Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java
