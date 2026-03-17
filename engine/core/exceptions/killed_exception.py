from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\exceptions\KilledException.java

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.kestra_runtime_exception import KestraRuntimeException


@dataclass(slots=True, kw_only=True)
class KilledException(KestraRuntimeException):
    d_e_f_a_u_l_t__m_e_s_s_a_g_e: ClassVar[str] = "Execution was killed."
