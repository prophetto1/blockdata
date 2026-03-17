from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class OpenAiInterface(Protocol):
    def get_api_key(self) -> Property[str]: ...
    def get_user(self) -> Property[str]: ...
    def get_client_timeout(self) -> int: ...
