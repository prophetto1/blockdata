from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\Setting.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.has_u_i_d import HasUID


@dataclass(slots=True, kw_only=True)
class Setting:
    key: str
    value: Any
    i_n_s_t_a_n_c_e__u_u_i_d: ClassVar[str] = "instance.uuid"
    i_n_s_t_a_n_c_e__v_e_r_s_i_o_n: ClassVar[str] = "instance.version"
    i_n_s_t_a_n_c_e__e_d_i_t_i_o_n: ClassVar[str] = "instance.edition"

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
