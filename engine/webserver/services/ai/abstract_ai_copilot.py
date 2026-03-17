from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\AbstractAiCopilot.java
# WARNING: Unresolved types: Class, JsonNode

from dataclasses import dataclass
from typing import Any

from engine.core.docs.json_schema_generator import JsonSchemaGenerator
from engine.webserver.services.ai.plugin_finder import PluginFinder
from engine.core.plugins.plugin_registry import PluginRegistry


@dataclass(slots=True, kw_only=True)
class AbstractAiCopilot:
    json_schema_generator: JsonSchemaGenerator | None = None
    plugin_registry: PluginRegistry | None = None
    fallback_plugin_version: str | None = None

    def most_relevant_plugins(self, plugin_finder: PluginFinder, user_prompt: str, excluded_plugin_types: list[str]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def minify_schema(node: JsonNode) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def generate_yaml(self, builder_fn: YamlBuilderFn, model_class: Class[Any], most_relevant_plugin_types: list[str], generation_error: str, possible_error_messages: list[str], user_prompt: str, original_yaml: str, already_valid_message: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def already_valid_message(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def non_request_message(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def unable_to_generate_message(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def possible_error_messages(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def excluded_plugin_types(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    class YamlBuilderFn(Protocol):
        def build(self, schema_json: str, generation_error: str, user_prompt: str) -> str: ...
