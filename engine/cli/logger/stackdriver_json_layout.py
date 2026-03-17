from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\logger\StackdriverJsonLayout.java
# WARNING: Unresolved types: ILoggingEvent, JsonLayout

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class StackdriverJsonLayout(JsonLayout):
    s_e_v_e_r_i_t_y__a_t_t_r_i_b_u_t_e: str = "severity"
    t_i_m_e_s_t_a_m_p__s_e_c_o_n_d_s__a_t_t_r_i_b_u_t_e: str = "timestampSeconds"
    t_i_m_e_s_t_a_m_p__n_a_n_o_s__a_t_t_r_i_b_u_t_e: str = "timestampNanos"
    include_exception_in_message: bool | None = None
    custom_json: dict[str, Any] | None = None

    def to_json_map(self, event: ILoggingEvent) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
