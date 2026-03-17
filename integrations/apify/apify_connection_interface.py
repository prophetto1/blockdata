from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class ApifyConnectionInterface(Protocol):
    def get_api_token(self) -> Property[str]: ...
