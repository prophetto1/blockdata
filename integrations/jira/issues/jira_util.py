from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class JiraUtil:
    i_s_s_u_e__a_p_i__r_o_u_t_e: str | None = None
    c_o_m_m_e_n_t__a_p_i__r_o_u_t_e: str | None = None
