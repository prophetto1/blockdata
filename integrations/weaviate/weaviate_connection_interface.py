from __future__ import annotations

from typing import Any, Protocol

from engine.core.models.property.property import Property


class WeaviateConnectionInterface(Protocol):
    def get_url(self) -> str: ...
    def get_api_key(self) -> Property[str]: ...
    def get_headers(self) -> Property[dict[String, String]]: ...
