from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.solace.serde.serde import Serde


@dataclass(slots=True, kw_only=True)
class StringSerde(Serde):
    s_e_r_i_a_l_i_z_e_r__e_n_c_o_d_i_n_g__c_o_n_f_i_g__n_a_m_e: str | None = None
    encoding: Charset | None = None

    def configure(self, configs: dict[String, Object]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def serialize(self, data: Any) -> byte:
        raise NotImplementedError  # TODO: translate from Java

    def deserialize(self, data: byte) -> str:
        raise NotImplementedError  # TODO: translate from Java
