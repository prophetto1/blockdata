from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\tenants\TenantValidationFilter.java
# WARNING: Unresolved types: Ordered

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.http.http_request import HttpRequest


@dataclass(slots=True, kw_only=True)
class TenantValidationFilter:
    t_e_n_a_n_t__p_a_t_h__a_t_t_r_i_b_u_t_e_s: ClassVar[str] = "tenant"

    def filter_request(self, request: HttpRequest[Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java
