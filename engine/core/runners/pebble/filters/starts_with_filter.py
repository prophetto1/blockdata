from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\filters\StartsWithFilter.java
# WARNING: Unresolved types: EvaluationContext, Filter, PebbleException, PebbleTemplate

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class StartsWithFilter:
    f_i_l_t_e_r__n_a_m_e: str = "startsWith"
    a_r_g_u_m_e_n_t__v_a_l_u_e: str = "value"
    a_r_g_s: list[str] = List.of(ARGUMENT_VALUE)

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def apply(self, input: Any, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java
