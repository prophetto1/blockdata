from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.solace.serde.serde import Serde


@dataclass(slots=True, kw_only=True)
class JsonSerde(Serde):
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper | None = None

    def serialize(self, data: Any) -> byte:
        raise NotImplementedError  # TODO: translate from Java

    def deserialize(self, data: byte) -> JsonNode:
        raise NotImplementedError  # TODO: translate from Java
