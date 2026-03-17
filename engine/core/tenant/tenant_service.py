from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\tenant\TenantService.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class TenantService:
    m_a_i_n__t_e_n_a_n_t: str = "main"

    def resolve_tenant(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
