from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\HttpSseEvent.java
# WARNING: Unresolved types: R, T

from dataclasses import dataclass
from datetime import timedelta
from typing import Any


@dataclass(slots=True, kw_only=True)
class HttpSseEvent:
    i_d: str = "id"
    e_v_e_n_t: str = "event"
    d_a_t_a: str = "data"
    r_e_t_r_y: str = "retry"
    data: T | None = None
    id: str | None = None
    name: str | None = None
    comment: str | None = None
    retry: timedelta | None = None

    def clone(self, data: R) -> HttpSseEvent[R]:
        raise NotImplementedError  # TODO: translate from Java
