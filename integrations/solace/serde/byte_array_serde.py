from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\serde\ByteArraySerde.java
# WARNING: Unresolved types: ByteBuffer

from dataclasses import dataclass
from typing import Any

from integrations.azure.eventhubs.serdes.serde import Serde


@dataclass(slots=True, kw_only=True)
class ByteArraySerde:

    def serialize(self, data: Any) -> list[int]:
        raise NotImplementedError  # TODO: translate from Java

    def deserialize(self, data: list[int]) -> ByteBuffer:
        raise NotImplementedError  # TODO: translate from Java
