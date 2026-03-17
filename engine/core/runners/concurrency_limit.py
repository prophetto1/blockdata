from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\ConcurrencyLimit.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.has_u_i_d import HasUID


@dataclass(slots=True, kw_only=True)
class ConcurrencyLimit:
    tenant_id: str
    namespace: str
    flow_id: str
    running: int | None = None

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
