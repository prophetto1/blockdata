from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class Neo4jConnectionInterface(Protocol):
    def get_url(self) -> Property[str]: ...
