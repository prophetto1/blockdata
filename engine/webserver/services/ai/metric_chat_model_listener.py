from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\MetricChatModelListener.java
# WARNING: Unresolved types: ChatModelErrorContext, ChatModelListener, ChatModelResponseContext, MeterRegistry

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class MetricChatModelListener:
    meter_registry: MeterRegistry | None = None

    def on_response(self, response_context: ChatModelResponseContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def on_error(self, error_context: ChatModelErrorContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def record_duration(self, attributes: dict[Any, Any], tags: list[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java
