from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\PosthogChatModelListener.java
# WARNING: Unresolved types: ChatModelErrorContext, ChatModelListener, ChatModelResponseContext, ChatRequest

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar, Optional

from engine.webserver.services.posthog.posthog_service import PosthogService


@dataclass(slots=True, kw_only=True)
class PosthogChatModelListener:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    posthog_service: PosthogService | None = None

    def on_response(self, response_context: ChatModelResponseContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def on_error(self, error_context: ChatModelErrorContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def send(self, attributes: dict[Any, Any], properties: dict[str, Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def init_builder(request: ChatRequest, attributes: dict[Any, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def duration(attributes: dict[Any, Any]) -> Optional[float]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def inputs(request: ChatRequest) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java
