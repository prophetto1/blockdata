from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\serdes\StringSerde.java
# WARNING: Unresolved types: Charset

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.azure.eventhubs.serdes.serde import Serde


@dataclass(slots=True, kw_only=True)
class StringSerde:
    s_e_r_i_a_l_i_z_e_r__e_n_c_o_d_i_n_g__c_o_n_f_i_g__n_a_m_e: ClassVar[str] = "serializer.encoding"
    encoding: Charset | None = None

    def configure(self, configs: dict[str, Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def serialize(self, data: Any) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    def deserialize(self, data: list[int]) -> str:
        raise NotImplementedError  # TODO: translate from Java
