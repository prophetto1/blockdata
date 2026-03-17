from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\AiService.java
# WARNING: Unresolved types: B, ChatModel, ChatModelListener, Class, ConcurrentHashMap, T

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.webserver.services.ai.ai_configuration import AiConfiguration
from engine.webserver.services.ai.ai_service_interface import AiServiceInterface
from engine.webserver.services.ai.dashboard_ai_copilot import DashboardAiCopilot
from engine.webserver.models.ai.dashboard_generation_prompt import DashboardGenerationPrompt
from engine.webserver.services.ai.dashboard_yaml_builder import DashboardYamlBuilder
from engine.webserver.services.ai.flow_ai_copilot import FlowAiCopilot
from engine.webserver.models.ai.flow_generation_prompt import FlowGenerationPrompt
from engine.webserver.services.ai.flow_yaml_builder import FlowYamlBuilder
from engine.core.services.instance_service import InstanceService
from engine.core.docs.json_schema_generator import JsonSchemaGenerator
from engine.webserver.services.ai.namespace_context_tool import NamespaceContextTool
from engine.webserver.services.ai.plugin_finder import PluginFinder
from engine.core.plugins.plugin_registry import PluginRegistry
from engine.webserver.services.posthog.posthog_service import PosthogService
from engine.core.utils.version_provider import VersionProvider


@dataclass(slots=True, kw_only=True)
class AiService(ABC):
    metadata_by_conversation_id: dict[str, ConversationMetadata] = new ConcurrentHashMap<>()
    post_hog_service: PosthogService | None = None
    ai_configuration: T | None = None
    flow_ai_copilot: FlowAiCopilot | None = None
    dashboard_ai_copilot: DashboardAiCopilot | None = None
    namespace_context_tool: NamespaceContextTool | None = None
    instance_uid: str | None = None
    ai_provider: str | None = None
    display_name: str | None = None
    listeners: list[ChatModelListener] | None = None

    @abstractmethod
    def chat_model(self, listeners: list[ChatModelListener]) -> ChatModel:
        ...

    def listeners(self, span_name: str, conversation_id: str) -> list[ChatModelListener]:
        raise NotImplementedError  # TODO: translate from Java

    def plugin_finder(self, conversation_id: str) -> PluginFinder:
        raise NotImplementedError  # TODO: translate from Java

    def flow_yaml_builder(self, conversation_id: str) -> FlowYamlBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def dashboard_yaml_builder(self, conversation_id: str) -> DashboardYamlBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def generate_flow(self, ip: str, flow_generation_prompt: FlowGenerationPrompt, tenant_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def generate_dashboard(self, ip: str, dashboard_generation_prompt: DashboardGenerationPrompt) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def display_name(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def plugin_finder_for_conversation(self, conversation_id: str) -> PluginFinder:
        raise NotImplementedError  # TODO: translate from Java

    def build_ai_service(self, service_class: Class[B], span_name: str, conversation_id: str) -> B:
        raise NotImplementedError  # TODO: translate from Java

    def before_generation(self, ip: str, conversation_id: str, span_name: str, input_state: dict[str, str]) -> GenerationContext:
        raise NotImplementedError  # TODO: translate from Java

    def after_generation(self, context: GenerationContext, span_name: str, output_state: dict[str, Any], result: str, output_key: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ConversationMetadata:
        conversation_id: str | None = None
        ip: str | None = None
        parent_span_id: str | None = None

    @dataclass(slots=True)
    class GenerationContext:
        conversation_id: str | None = None
        ip: str | None = None
        parent_span_id: str | None = None
