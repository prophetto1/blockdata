from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\AiServiceManager.java
# WARNING: Unresolved types: ChatModelListener, PropertyResolver, chat, core, dev, docs, io, kestra, langchain4j, listener, model, plugins

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.webserver.services.ai.ai_provider_configuration import AiProviderConfiguration
from engine.webserver.services.ai.ai_providers_configuration import AiProvidersConfiguration
from engine.webserver.services.ai.ai_service_interface import AiServiceInterface
from engine.core.services.instance_service import InstanceService
from engine.core.docs.json_schema_generator import JsonSchemaGenerator
from engine.webserver.services.ai.namespace_context_tool import NamespaceContextTool
from engine.core.plugins.plugin_registry import PluginRegistry
from engine.webserver.services.posthog.posthog_service import PosthogService
from engine.core.utils.version_provider import VersionProvider


@dataclass(slots=True, kw_only=True)
class AiServiceManager:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    ai_services: dict[str, AiServiceInterface] = field(default_factory=dict)
    providers_configuration: AiProvidersConfiguration | None = None
    default_provider_id: str | None = None
    namespace_context_tool: NamespaceContextTool | None = None

    def create_ai_service(self, provider: AiProviderConfiguration, plugin_registry: io.kestra.core.plugins.PluginRegistry, json_schema_generator: io.kestra.core.docs.JsonSchemaGenerator, version_provider: VersionProvider, instance_service: InstanceService, posthog_service: PosthogService, listeners: list[dev.langchain4j.model.chat.listener.ChatModelListener]) -> AiServiceInterface:
        raise NotImplementedError  # TODO: translate from Java

    def get_ai_service(self, id: str) -> AiServiceInterface:
        raise NotImplementedError  # TODO: translate from Java

    def get_all_ai_services(self) -> dict[str, AiServiceInterface]:
        raise NotImplementedError  # TODO: translate from Java

    def get_default_ai_service(self) -> AiServiceInterface:
        raise NotImplementedError  # TODO: translate from Java
