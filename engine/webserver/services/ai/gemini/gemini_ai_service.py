from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\gemini\GeminiAiService.java
# WARNING: Unresolved types: ChatModel, ChatModelListener

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.webserver.services.ai.ai_service import AiService
from engine.webserver.services.ai.gemini.gemini_configuration import GeminiConfiguration
from engine.core.services.instance_service import InstanceService
from engine.core.docs.json_schema_generator import JsonSchemaGenerator
from engine.webserver.services.ai.namespace_context_tool import NamespaceContextTool
from engine.core.plugins.plugin_registry import PluginRegistry
from engine.webserver.services.posthog.posthog_service import PosthogService
from engine.core.utils.version_provider import VersionProvider


@dataclass(slots=True, kw_only=True)
class GeminiAiService(AiService):
    logger: ClassVar[Logger] = getLogger(__name__)
    type: ClassVar[str] = "gemini"

    def chat_model(self, listeners: list[ChatModelListener]) -> ChatModel:
        raise NotImplementedError  # TODO: translate from Java
