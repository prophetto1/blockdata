from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\serializers\ListOrMapOfLabelSerializer.java
# WARNING: Unresolved types: SerializerProvider

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ListOrMapOfLabelSerializer(JsonSerializer):

    def serialize(self, value: Any, gen: JsonGenerator, serializers: SerializerProvider) -> None:
        raise NotImplementedError  # TODO: translate from Java
