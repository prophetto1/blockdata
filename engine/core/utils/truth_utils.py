from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\TruthUtils.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class TruthUtils:
    f_a_l_s_e__v_a_l_u_e_s: list[str] = List.of("false", "0", "-0", "")

    @staticmethod
    def is_truthy(condition: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_falsy(condition: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java
