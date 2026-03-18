from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\serdes\PluginDeserializer.java
# WARNING: Unresolved types: DeserializationContext, JsonMappingException, JsonParser

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.core.models.plugin import Plugin
from engine.core.plugins.plugin_registry import PluginRegistry


@dataclass(slots=True, kw_only=True)
class PluginDeserializer(JsonDeserializer):
    logger: ClassVar[Logger] = getLogger(__name__)
    type: ClassVar[str] = "type"
    version: ClassVar[str] = "version"
    plugin_registry: PluginRegistry | None = None

    def deserialize(self, parser: JsonParser, context: DeserializationContext) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def check_state(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def from_object_node(self, jp: JsonParser, node: JsonNode, context: DeserializationContext) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def throw_invalid_type_exception(context: DeserializationContext, type: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extract_plugin_raw_identifier(node: JsonNode, is_versioning_supported: bool) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def fallback_class(self) -> type[Any]:
        raise NotImplementedError  # TODO: translate from Java
