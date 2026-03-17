from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\RegexPatterns.java

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class RegexPatterns:
    j_a_v_a__i_d_e_n_t_i_f_i_e_r__r_e_g_e_x: ClassVar[str] = "^[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)*$"
