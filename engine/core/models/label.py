from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\Label.java
# WARNING: Unresolved types: Entry, Predicate

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class Label:
    s_y_s_t_e_m__p_r_e_f_i_x: ClassVar[str] = "system."
    c_o_r_r_e_l_a_t_i_o_n__i_d: ClassVar[str] = SYSTEM_PREFIX + "correlationId"
    u_s_e_r_n_a_m_e: ClassVar[str] = SYSTEM_PREFIX + "username"
    a_p_p: ClassVar[str] = SYSTEM_PREFIX + "app"
    r_e_a_d__o_n_l_y: ClassVar[str] = SYSTEM_PREFIX + "readOnly"
    r_e_s_t_a_r_t_e_d: ClassVar[str] = SYSTEM_PREFIX + "restarted"
    r_e_p_l_a_y: ClassVar[str] = SYSTEM_PREFIX + "replay"
    r_e_p_l_a_y_e_d: ClassVar[str] = SYSTEM_PREFIX + "replayed"
    s_i_m_u_l_a_t_e_d__e_x_e_c_u_t_i_o_n: ClassVar[str] = SYSTEM_PREFIX + "simulatedExecution"
    t_e_s_t: ClassVar[str] = SYSTEM_PREFIX + "test"
    f_r_o_m: ClassVar[str] = SYSTEM_PREFIX + "from"
    k_i_l_l__s_w_i_t_c_h: ClassVar[str] = SYSTEM_PREFIX + "killSwitch"
    key: str | None = None
    value: str | None = None

    @staticmethod
    def to_nested_map(labels: list[Label]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_map(labels: list[Label]) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def deduplicate(labels: list[Label]) -> list[Label]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from(map: dict[str, str]) -> list[Label]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from(label: str) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_entry_not_empty_predicate() -> Predicate[Map.Entry[str, str]]:
        raise NotImplementedError  # TODO: translate from Java
