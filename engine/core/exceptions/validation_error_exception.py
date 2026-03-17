from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\ValidationErrorException.java

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.kestra_runtime_exception import KestraRuntimeException


@dataclass(slots=True, kw_only=True)
class ValidationErrorException(KestraRuntimeException):
    serial_version_u_i_d: int = 1
    v_a_l_i_d_a_t_i_o_n__e_r_r_o_r__m_e_s_s_a_g_e: str = "Resource fails validation"
    invalids: list[str] | None = None

    def formated_invalid_objects(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
