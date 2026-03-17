from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-weaviate\src\main\java\io\kestra\plugin\weaviate\WeaviateConnectionInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class WeaviateConnectionInterface(Protocol):
    def get_url(self) -> str: ...

    def get_api_key(self) -> Property[str]: ...

    def get_headers(self) -> Property[dict[str, str]]: ...
