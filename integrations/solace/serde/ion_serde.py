from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\serde\IonSerde.java
# WARNING: Unresolved types: ObjectMapper

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.azure.eventhubs.serdes.serde import Serde


@dataclass(slots=True, kw_only=True)
class IonSerde:
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofIon()
        .setSerializationInclusion(JsonInclude.Include.ALWAYS)

    def serialize(self, data: Any) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    def deserialize(self, data: list[int]) -> Any:
        raise NotImplementedError  # TODO: translate from Java
