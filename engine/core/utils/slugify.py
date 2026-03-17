from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Slugify.java
# WARNING: Unresolved types: Pattern

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Slugify:
    n_o_n_l_a_t_i_n: Pattern = Pattern.compile("[^\\w-]")
    w_h_i_t_e_s_p_a_c_e: Pattern = Pattern.compile("[\\s]")
    d_a_s_h__p_a_t_t_e_r_n: Pattern = Pattern.compile("[-_]([a-z])")

    @staticmethod
    def of(input: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_start_case(input: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
