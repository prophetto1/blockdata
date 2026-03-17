from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class StripeInterface(Protocol):
    def get_api_key(self) -> Property[str]: ...
