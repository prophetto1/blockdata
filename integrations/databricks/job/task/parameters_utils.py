from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class ParametersUtils:
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper | None = None
    l_i_s_t__o_f__s_t_r_i_n_g: CollectionType | None = None
    m_a_p__o_f__s_t_r_i_n_g__s_t_r_i_n_g: MapType | None = None

    def list_parameters(self, run_context: RunContext, parameters: Any) -> list[String]:
        raise NotImplementedError  # TODO: translate from Java

    def map_parameters(self, run_context: RunContext, parameters: Any) -> dict[String, String]:
        raise NotImplementedError  # TODO: translate from Java
