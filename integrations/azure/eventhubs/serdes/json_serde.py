from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\serdes\JsonSerde.java
# WARNING: Unresolved types: JsonNode, ObjectMapper

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.azure.eventhubs.serdes.serde import Serde


@dataclass(slots=True, kw_only=True)
class JsonSerde:
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JsonMapper.builder().build()

    def serialize(self, data: Any) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    def deserialize(self, data: list[int]) -> JsonNode:
        raise NotImplementedError  # TODO: translate from Java
