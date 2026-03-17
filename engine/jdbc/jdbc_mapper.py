from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\JdbcMapper.java
# WARNING: Unresolved types: DateTimeFormatter, ObjectMapper

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class JdbcMapper:
    i_n_s_t_a_n_t__f_o_r_m_a_t_t_e_r: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'")
        .withZone(ZoneOffset.UTC)
    z_o_n_e_d__d_a_t_e__t_i_m_e__f_o_r_m_a_t_t_e_r: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
    m_a_p_p_e_r: ObjectMapper = init()

    @staticmethod
    def of() -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def init() -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java
