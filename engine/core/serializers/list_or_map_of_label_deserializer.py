from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\serializers\ListOrMapOfLabelDeserializer.java
# WARNING: Unresolved types: DeserializationContext, Entry, IOException, JsonDeserializer, JsonMappingException, JsonParser, ResolvableDeserializer

from dataclasses import dataclass
from typing import Any

from engine.core.models.label import Label


@dataclass(slots=True, kw_only=True)
class ListOrMapOfLabelDeserializer(JsonDeserializer):

    def deserialize(self, p: JsonParser, ctxt: DeserializationContext) -> list[Label]:
        raise NotImplementedError  # TODO: translate from Java

    def validate_and_create_label(self, entry: Map.Entry[str, Any]) -> Label:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_allowed_type(value: Any) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def resolve(self, ctxt: DeserializationContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
