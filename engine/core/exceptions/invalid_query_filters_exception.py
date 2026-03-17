from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\InvalidQueryFiltersException.java

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.kestra_runtime_exception import KestraRuntimeException


@dataclass(slots=True, kw_only=True)
class InvalidQueryFiltersException(KestraRuntimeException):
    serial_version_u_i_d: int = 1
    i_n_v_a_l_i_d__q_u_e_r_y__f_i_l_t_e_r__m_e_s_s_a_g_e: str = "Provided query filters are invalid: %s"
