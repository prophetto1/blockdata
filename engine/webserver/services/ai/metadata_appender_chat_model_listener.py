from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\MetadataAppenderChatModelListener.java
# WARNING: Unresolved types: ChatModelListener, ChatModelRequestContext, ConversationMetadata, Supplier

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.webserver.services.ai.ai_service import AiService


@dataclass(slots=True, kw_only=True)
class MetadataAppenderChatModelListener:
    span_name: ClassVar[str] = "spanName"
    parent_id: ClassVar[str] = "parentId"
    start_time_key_name: ClassVar[str] = "startTime"
    conversation_id: ClassVar[str] = "conversationId"
    ip: ClassVar[str] = "ip"
    instance_uid: ClassVar[str] = "instanceUid"
    provider: ClassVar[str] = "provider"
    instance_uid: str | None = None
    provider: str | None = None
    span_name: str | None = None
    conversation_metadata_getter: Supplier[AiService.ConversationMetadata] | None = None

    def on_request(self, request_context: ChatModelRequestContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
