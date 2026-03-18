from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\FlowAiCopilot.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.webserver.services.ai.abstract_ai_copilot import AbstractAiCopilot
from engine.webserver.models.ai.flow_generation_prompt import FlowGenerationPrompt
from engine.webserver.services.ai.flow_yaml_builder import FlowYamlBuilder
from engine.core.docs.json_schema_generator import JsonSchemaGenerator
from engine.webserver.services.ai.plugin_finder import PluginFinder
from engine.core.plugins.plugin_registry import PluginRegistry


@dataclass(slots=True, kw_only=True)
class FlowAiCopilot(AbstractAiCopilot):
    possible_error_messages: ClassVar[list[str]]
    excluded_plugin_types: ClassVar[list[str]]
    logger: ClassVar[Logger] = getLogger(__name__)
    already_valid_message: ClassVar[str] = "This flow already performs the requested action. Please provide additional instructions if you would like to request modifications."
    non_request_error: ClassVar[str] = "I can only assist with creating Kestra flows."
    unable_to_generate_error: ClassVar[str] = "The prompt did not provide enough information to generate a valid flow. Please clarify your request."

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

    def generate_flow(self, plugin_finder: PluginFinder, flow_yaml_builder: FlowYamlBuilder, flow_generation_prompt: FlowGenerationPrompt, tenant_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
