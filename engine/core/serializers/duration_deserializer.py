from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\serializers\DurationDeserializer.java
# WARNING: Unresolved types: DeserializationContext, IOException, JsonParser, com, datatype, deser, fasterxml, jackson, jsr310

from dataclasses import dataclass
from datetime import timedelta
from typing import Any


@dataclass(slots=True, kw_only=True)
class DurationDeserializer(DurationDeserializer):
    serial_version_u_i_d: int = 1

    def _from_string(self, parser: JsonParser, ctxt: DeserializationContext, value0: str) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def _is_float(self, text: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java
