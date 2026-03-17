from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\DashboardAiCopilot.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.webserver.services.ai.abstract_ai_copilot import AbstractAiCopilot
from engine.webserver.models.ai.dashboard_generation_prompt import DashboardGenerationPrompt
from engine.webserver.services.ai.dashboard_yaml_builder import DashboardYamlBuilder
from engine.core.docs.json_schema_generator import JsonSchemaGenerator
from engine.webserver.services.ai.plugin_finder import PluginFinder
from engine.core.plugins.plugin_registry import PluginRegistry


@dataclass(slots=True, kw_only=True)
class DashboardAiCopilot(AbstractAiCopilot):
    possible_error_messages: ClassVar[list[str]]
    excluded_plugin_types: ClassVar[list[str]]
    logger: ClassVar[Logger] = getLogger(__name__)
    already_valid_message: ClassVar[str] = "This dashboard already performs the requested action. Please provide additional instructions if you would like to request modifications."
    non_request_error: ClassVar[str] = "I can only assist with creating Kestra dashboards."
    unable_to_generate_error: ClassVar[str] = "The prompt did not provide enough information to generate a valid dashboard. Please clarify your request."

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

    def generate_dashboard(self, plugin_finder: PluginFinder, dashboard_yaml_builder: DashboardYamlBuilder, dashboard_generation_prompt: DashboardGenerationPrompt) -> str:
        raise NotImplementedError  # TODO: translate from Java
