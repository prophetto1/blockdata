from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class MessagePayloadInterface(Protocol):
    def get_payload(self) -> Property[str]: ...
    def get_message_text(self) -> Property[str]: ...
