from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class AbstractConnectionInterface(Protocol):
    def get_endpoint(self) -> Property[str]: ...
