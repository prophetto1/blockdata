from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\contexts\KestraConfig.java

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class KestraConfig:
    d_e_f_a_u_l_t__s_y_s_t_e_m__f_l_o_w_s__n_a_m_e_s_p_a_c_e: ClassVar[str] = "system"
    system_flow_namespace: str | None = None

    def get_system_flow_namespace(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
