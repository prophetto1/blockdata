from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.solace.serde.serde import Serde


@dataclass(slots=True, kw_only=True)
class ByteArraySerde(Serde):

    def serialize(self, data: Any) -> byte:
        raise NotImplementedError  # TODO: translate from Java

    def deserialize(self, data: byte) -> ByteBuffer:
        raise NotImplementedError  # TODO: translate from Java
