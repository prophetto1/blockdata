from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-jira\src\main\java\io\kestra\plugin\jira\issues\JiraUtil.java

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class JiraUtil:
    i_s_s_u_e__a_p_i__r_o_u_t_e: ClassVar[str] = "/rest/api/2/issue/"
    c_o_m_m_e_n_t__a_p_i__r_o_u_t_e: ClassVar[str] = "/comment"
